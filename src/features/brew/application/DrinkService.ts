import type { IDrinkLogRepository, IDrinkRepository } from '../../../shared/domain/repositories';
import type { Drink, DrinkLog, DrinkLogWithDrink, DrinkStats, EntityId } from '../../../shared/domain/entities';
import type { PantryService } from '../../pantry/application/PantryService';

export class DrinkService {
    private drinkRepo: IDrinkRepository;
    private logRepo: IDrinkLogRepository;
    private pantryService: PantryService;

    constructor(drinkRepo: IDrinkRepository, logRepo: IDrinkLogRepository, pantryService: PantryService) {
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

    async getAllLogs(): Promise<DrinkLog[]> {
        return this.logRepo.findAll();
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
            
            // Parse ingredients and deduct stock
            for (const ingredient of ingredients) {
                if (typeof ingredient !== 'string') continue;
                
                // Match patterns like "18g coffee", "120ml milk", "1 espresso shot"
                const coffeeMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*g\s*(?:coffee|espresso)/i);
                const milkMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*ml\s*(?:milk|steamed milk)/i);
                const waterMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*ml\s*(?:water)/i);
                const shotMatch = ingredient.match(/(\d+)\s*(?:espresso\s*)?shot/i);
                
                if (coffeeMatch) {
                    const grams = parseFloat(coffeeMatch[1]);
                    // Find bean item and deduct
                    const beans = await this.pantryService.getPantryItems();
                    const beanItem = beans.find(b => b.category === 'beans');
                    if (beanItem) await this.pantryService.deductStock(beanItem.id, grams);
                } else if (milkMatch) {
                    const ml = parseFloat(milkMatch[1]);
                    const milks = await this.pantryService.getPantryItems();
                    const milkItem = milks.find(m => m.category === 'milk');
                    if (milkItem) await this.pantryService.deductStock(milkItem.id, ml);
                } else if (waterMatch) {
                    // Water typically not tracked in pantry
                } else if (shotMatch) {
                    const shots = parseInt(shotMatch[1]);
                    const gramsPerShot = 18;
                    const beans = await this.pantryService.getPantryItems();
                    const beanItem = beans.find(b => b.category === 'beans');
                    if (beanItem) await this.pantryService.deductStock(beanItem.id, shots * gramsPerShot);
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
