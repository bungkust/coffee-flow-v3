import type { IDrinkLogRepository, IDrinkRepository } from '../../../shared/domain/repositories';
import type { Drink, DrinkLog, DrinkLogWithDrink, DrinkStats, EntityId } from '../../../shared/domain/entities';

export class DrinkService {
    private drinkRepo: IDrinkRepository;
    private logRepo: IDrinkLogRepository;

    constructor(drinkRepo: IDrinkRepository, logRepo: IDrinkLogRepository) {
        this.drinkRepo = drinkRepo;
        this.logRepo = logRepo;
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
    }

    async updateLog(log: DrinkLog): Promise<void> {
        await this.logRepo.update(log);
    }

    async deleteLog(id: EntityId): Promise<void> {
        await this.logRepo.delete(id);
    }
}
