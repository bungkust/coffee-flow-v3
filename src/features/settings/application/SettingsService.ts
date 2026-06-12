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

    async getUserName(): Promise<string> {
        return this.repo.getUserName();
    }

    async getUserId(): Promise<string> {
        return this.repo.getUserId();
    }

    async setUserId(id: string): Promise<void> {
        return this.repo.setUserId(id);
    }

    async setUserName(name: string): Promise<void> {
        return this.repo.setUserName(name);
    }

    async setUserExperienceLevel(level: string): Promise<void> {
        return this.repo.setUserExperienceLevel(level);
    }

    async setUserTasteProfile(profile: string[]): Promise<void> {
        return this.repo.setUserTasteProfile(profile);
    }

    async setUserBrewingGoal(goal: string): Promise<void> {
        return this.repo.setUserBrewingGoal(goal);
    }

    async setUserDailyCups(cups: string): Promise<void> {
        return this.repo.setUserDailyCups(cups);
    }

    async getUserPreferredMethods(): Promise<string[]> {
        return this.repo.getUserPreferredMethods();
    }

    async setUserPreferredMethods(methods: string[]): Promise<void> {
        return this.repo.setUserPreferredMethods(methods);
    }

    async getUserPreferredDrinks(): Promise<string[]> {
        return this.repo.getUserPreferredDrinks();
    }

    async setUserPreferredDrinks(drinks: string[]): Promise<void> {
        return this.repo.setUserPreferredDrinks(drinks);
    }

    async getNotificationsEnabled(): Promise<boolean> {
        return this.repo.getNotificationsEnabled();
    }

    async setNotificationsEnabled(enabled: boolean): Promise<void> {
        return this.repo.setNotificationsEnabled(enabled);
    }

    async getTimerFeedbackEnabled(): Promise<boolean> {
        return this.repo.getTimerFeedbackEnabled();
    }

    async setTimerFeedbackEnabled(enabled: boolean): Promise<void> {
        return this.repo.setTimerFeedbackEnabled(enabled);
    }
}
