import type { Drink, DrinkLog, DrinkLogWithDrink, DrinkStats, EntityId } from '../../../shared/domain/entities';
import type { PantryService } from '../../pantry/application/PantryService';
import { SQLiteDrinkRepository } from '../infrastructure/SQLiteDrinkRepository';
import { SQLiteDrinkLogRepository } from '../infrastructure/SQLiteDrinkLogRepository';

export class DrinkService {
    private drinkRepo: SQLiteDrinkRepository;
    private logRepo: SQLiteDrinkLogRepository;
    private pantryService: PantryService;

    constructor(drinkRepo: SQLiteDrinkRepository, logRepo: SQLiteDrinkLogRepository, pantryService: PantryService) {
        this.drinkRepo = drinkRepo;
        this.logRepo = logRepo;
        this.pantryService = pantryService;
    }

    async getAllDrinks(): Promise<Drink[]> {
        return this.drinkRepo.findAll();
    }

    async getDrink(id: EntityId): Promise<Drink | null> {
        return this.drinkRepo.findById(id);
    }

    async getRecentLogsWithDrinks(): Promise<DrinkLogWithDrink[]> {
        return this.logRepo.getRecentWithDrinks();
    }

    async getDashboardStats(): Promise<DrinkStats> {
        return this.logRepo.getStats();
    }

    async getLog(id: EntityId): Promise<DrinkLogWithDrink | null> {
        return this.logRepo.findByIdWithDrink(id);
    }

    async logDrink(drinkId: EntityId, rating: number, notes: string): Promise<void> {
        const log: DrinkLog = {
            id: crypto.randomUUID(),
            drink_id: drinkId,
            rating,
            notes,
            logged_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        await this.logRepo.save(log);

        // Deduct stock for drink ingredients
        await this.deductDrinkIngredients(drinkId);
    }

    private async deductDrinkIngredients(drinkId: EntityId): Promise<void> {
        const drink = await this.drinkRepo.findById(drinkId);
        if (!drink) return;

        try {
            const ingredients = JSON.parse(drink.ingredients_json || '[]');
            
            // Fetch pantry once
            const pantryItems = await this.pantryService.getPantryItems();
            const beanItem = pantryItems.find(b => b.category === 'beans');
            const milkItem = pantryItems.find(m => m.category === 'milk');
            const GRAMS_PER_SHOT = 18;

            for (const ingredient of ingredients) {
                if (typeof ingredient !== 'string') continue;

                const coffeeMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*g\s*(?:coffee|espresso)/i);
                const milkMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*ml\s*(?:milk|steamed milk)/i);
                const waterMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*(?:ml|g)?\s*(?:water|hot water)/i);
                const shotMatch = ingredient.match(/(\d+)\s*shot/i);

                if (coffeeMatch) {
                    const grams = parseFloat(coffeeMatch[1]);
                    if (beanItem) await this.pantryService.deductStock(beanItem.id, grams);
                } else if (milkMatch) {
                    const ml = parseFloat(milkMatch[1]);
                    if (milkItem) await this.pantryService.deductStock(milkItem.id, ml);
                } else if (waterMatch) {
                    // Water typically not tracked in pantry
                } else if (shotMatch) {
                    const shots = parseInt(shotMatch[1]);
                    if (beanItem) await this.pantryService.deductStock(beanItem.id, shots * GRAMS_PER_SHOT);
                }
            }
        } catch (error) {
            console.error('Failed to deduct drink ingredients:', error);
        }
    }

    async updateLog(log: DrinkLog): Promise<void> {
        await this.logRepo.update(log);
    }

    async deleteLog(id: EntityId): Promise<void> {
        await this.logRepo.delete(id);
    }

    async saveDrink(drink: Drink): Promise<void> {
        await this.drinkRepo.save(drink);
    }
}
