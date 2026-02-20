import { SQLiteSettingsRepository } from '../infrastructure/SQLiteSettingsRepository';

export class SettingsService {
    private repo: SQLiteSettingsRepository;

    constructor(repo: SQLiteSettingsRepository) {
        this.repo = repo;
    }

    async getAppUnit(): Promise<'metric' | 'imperial'> {
        return this.repo.getAppUnit();
    }

    async setAppUnit(unit: 'metric' | 'imperial'): Promise<void> {
        return this.repo.setAppUnit(unit);
    }

    async clearUserData(): Promise<void> {
        return this.repo.clearUserData();
    }
}
