import type { Drink, DrinkBaseType, DrinkIngredient, DrinkLog, DrinkLogWithDrink, DrinkStats, EntityId } from '../../../shared/domain/entities';
import type { PantryService } from '../../pantry/application/PantryService';
import { SQLiteDrinkRepository } from '../infrastructure/SQLiteDrinkRepository';
import { SQLiteDrinkLogRepository } from '../infrastructure/SQLiteDrinkLogRepository';

export interface ExtraPantryItemUsage {
    pantryItemId: string;
    amount: number;
    unit?: string;
    name?: string;
}

export interface LogDrinkOptions {
    rating?: number;
    notes?: string;
    beanId?: string;
    milkId?: string;
    recipeId?: string;
    sweetness?: number;
    coffeeStrength?: number;
    creaminess?: number;
    flavorTags?: string[];
    extraPantryItems?: ExtraPantryItemUsage[];
}

export class DrinkService {
    private drinkRepo: SQLiteDrinkRepository;
    private logRepo: SQLiteDrinkLogRepository;
    private pantryService: PantryService;

    constructor(drinkRepo: SQLiteDrinkRepository, logRepo: SQLiteDrinkLogRepository, pantryService: PantryService) {
        this.drinkRepo = drinkRepo;
        this.logRepo = logRepo;
        this.pantryService = pantryService;
    }

    async getAllDrinks(baseType?: DrinkBaseType): Promise<Drink[]> {
        return this.drinkRepo.findAll(baseType);
    }

    async getDrink(id: EntityId): Promise<Drink | null> {
        return this.drinkRepo.findById(id);
    }

    async getRecentLogsWithDrinks(limit?: number): Promise<DrinkLogWithDrink[]> {
        return this.logRepo.getRecentWithDrinks(limit);
    }

    async getDashboardStats(): Promise<DrinkStats> {
        return this.logRepo.getStats();
    }

    async getLog(id: EntityId): Promise<DrinkLogWithDrink | null> {
        return this.logRepo.findByIdWithDrink(id);
    }

    async logDrink(
        drink: Drink,
        ratingOrOptions?: number | LogDrinkOptions,
        notesArg?: string,
        additionalOptions?: LogDrinkOptions
    ): Promise<string> {
        let opts: LogDrinkOptions = {};
        if (typeof ratingOrOptions === 'number') {
            opts = {
                rating: ratingOrOptions,
                notes: notesArg,
                ...additionalOptions
            };
        } else if (ratingOrOptions && typeof ratingOrOptions === 'object') {
            opts = ratingOrOptions;
        }

        const logId = crypto.randomUUID();
        const now = new Date().toISOString();

        const log: DrinkLog = {
            id: logId,
            drink_id: drink.id,
            drink_name: drink.name,
            bean_id: opts.beanId,
            milk_id: opts.milkId,
            recipe_id: opts.recipeId || drink.base_recipe_id,
            ingredients_snapshot_json: drink.ingredients_json,
            rating: opts.rating,
            sweetness: opts.sweetness,
            coffee_strength: opts.coffeeStrength,
            creaminess: opts.creaminess,
            flavor_tags: opts.flavorTags && opts.flavorTags.length > 0 ? opts.flavorTags.join(',') : undefined,
            notes: opts.notes,
            logged_at: now,
            created_at: now
        };

        await this.logRepo.save(log);

        // Deduct stock for drink ingredients
        await this.deductDrinkIngredients(drink.name, drink.ingredients_json, logId, opts);

        return logId;
    }

    private async deductDrinkIngredients(
        drinkName: string,
        ingredientsJson: string,
        logId: string,
        opts: LogDrinkOptions
    ): Promise<void> {
        try {
            const rawIngredients = JSON.parse(ingredientsJson || '[]');
            const pantryItems = await this.pantryService.getPantryItems();
            const beanItem = opts.beanId ? pantryItems.find(p => p.id === opts.beanId) : pantryItems.find(p => p.category === 'beans');
            const milkItem = opts.milkId ? pantryItems.find(p => p.id === opts.milkId) : pantryItems.find(p => p.category === 'milk');

            const GRAMS_PER_SHOT = 18;

            for (const raw of rawIngredients) {
                let ing: DrinkIngredient | null = null;
                if (typeof raw === 'string') {
                    const m = raw.match(/(\d+(?:\.\d+)?)\s*(shot|shots|g|ml|pump|pumps|tbsp|tsp)?\s*(.*)/i);
                    if (m) {
                        const amount = parseFloat(m[1]);
                        const u = (m[2] || '').toLowerCase().replace(/s$/, '');
                        const n = m[3].trim() || raw;
                        const cat = u === 'shot' || /espresso|coffee|beans/i.test(n)
                            ? 'beans'
                            : /milk/i.test(n)
                            ? 'milk'
                            : /syrup/i.test(n)
                            ? 'syrup'
                            : undefined;
                        ing = { name: n, amount, unit: u as DrinkIngredient['unit'], category: cat };
                    }
                } else if (typeof raw === 'object' && raw !== null) {
                    ing = raw as DrinkIngredient;
                }

                if (!ing || !ing.amount || ing.amount <= 0) continue;

                let target = ing.default_pantry_item_id
                    ? pantryItems.find(p => p.id === ing.default_pantry_item_id)
                    : undefined;

                if (!target && ing.category === 'beans' && beanItem) target = beanItem;
                if (!target && ing.category === 'milk' && milkItem) target = milkItem;
                if (!target && ing.category) {
                    target = pantryItems.find(p => p.category === ing.category && p.name.toLowerCase().includes(ing.name.toLowerCase()));
                }
                if (!target) {
                    target = pantryItems.find(p => p.name.toLowerCase().includes(ing.name.toLowerCase()));
                }

                if (target) {
                    let deductAmount = ing.amount;
                    let unit = ing.unit || target.unit || 'g';

                    if (ing.unit === 'shot') { deductAmount = ing.amount * GRAMS_PER_SHOT; unit = 'g'; }
                    else if (ing.unit === 'pump') { deductAmount = ing.amount * 10; unit = 'ml'; }
                    else if (ing.unit === 'tbsp') { deductAmount = ing.amount * 15; unit = 'ml'; }
                    else if (ing.unit === 'tsp') { deductAmount = ing.amount * 5; unit = 'ml'; }

                    await this.pantryService.deductStock(target.id, deductAmount, {
                        actionType: 'drink',
                        referenceId: logId,
                        referenceName: drinkName,
                        unit
                    });
                }
            }

            // Deduct any extra custom pantry items selected by the user
            if (opts.extraPantryItems && opts.extraPantryItems.length > 0) {
                for (const extra of opts.extraPantryItems) {
                    if (!extra.pantryItemId || extra.amount <= 0) continue;
                    const pItem = pantryItems.find(p => p.id === extra.pantryItemId);
                    if (pItem) {
                        await this.pantryService.deductStock(pItem.id, extra.amount, {
                            actionType: 'drink',
                            referenceId: logId,
                            referenceName: `${drinkName} (Add-on: ${pItem.name})`,
                            unit: extra.unit || pItem.unit || 'g'
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('Soft warning: Failed to deduct drink ingredients:', error);
        }
    }

    async toggleFavorite(id: EntityId): Promise<void> {
        await this.drinkRepo.toggleFavorite(id);
    }

    async cloneDrink(id: EntityId): Promise<Drink> {
        const original = await this.drinkRepo.findById(id);
        if (!original) throw new Error('Drink not found');

        const now = new Date().toISOString();
        const clone: Drink = {
            ...original,
            id: crypto.randomUUID(),
            name: `${original.name} (Copy)`,
            is_favorite: false,
            created_at: now,
            updated_at: now
        };

        await this.drinkRepo.save(clone);
        return clone;
    }

    async updateLog(id: EntityId, notes: string): Promise<void> {
        await this.logRepo.update(id, notes);
    }

    async deleteLog(id: EntityId): Promise<void> {
        await this.logRepo.delete(id);
    }

    async saveDrink(drink: Drink): Promise<void> {
        await this.drinkRepo.save(drink);
    }

    async deleteDrink(id: EntityId): Promise<void> {
        await this.drinkRepo.delete(id);
    }
}
