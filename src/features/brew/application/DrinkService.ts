import type { IDrinkLogRepository } from '../../../shared/domain/repositories';
import type { DrinkLog } from '../../../shared/domain/entities';

export class DrinkService {
    private logRepo: IDrinkLogRepository;

    constructor(logRepo: IDrinkLogRepository) {
        this.logRepo = logRepo;
    }

    async getAllLogs(): Promise<DrinkLog[]> {
        return this.logRepo.findAll();
    }

    async getRecentLogsWithDrinks(): Promise<any[]> {
        return this.logRepo.getRecentWithDrinks();
    }

    async getDashboardStats() {
        return this.logRepo.getStats();
    }
}
