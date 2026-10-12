import { dbService } from '../../../core/database/sqlite';

export class SQLiteSettingsRepository {
    private get db() {
        return dbService.getDb();
    }

    private async set(key: string, value: string): Promise<void> {
        await this.db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
        await dbService.saveToLocalStore();
    }

    async getAppUnit(): Promise<'metric' | 'imperial'> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['app_unit']);
        return (result.values?.[0]?.value as 'metric' | 'imperial') || 'metric';
    }

    async setAppUnit(unit: 'metric' | 'imperial'): Promise<void> {
        await this.set('app_unit', unit);
    }

    async getUserName(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_name']);
        return result.values?.[0]?.value || '';
    }

    async setUserName(name: string): Promise<void> {
        await this.set('user_name', name);
    }

    async getUserId(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_id']);
        return result.values?.[0]?.value || '';
    }

    async setUserId(id: string): Promise<void> {
        await this.set('user_id', id);
    }

    async getUserExperienceLevel(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_experience_level']);
        return result.values?.[0]?.value || '';
    }

    async setUserExperienceLevel(level: string): Promise<void> {
        await this.set('user_experience_level', level);
    }

    async getUserTasteProfile(): Promise<string[]> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_taste_profile']);
        try {
            return JSON.parse(result.values?.[0]?.value || '[]');
        } catch {
            return [];
        }
    }

    async setUserTasteProfile(profile: string[]): Promise<void> {
        await this.set('user_taste_profile', JSON.stringify(profile));
    }

    async getUserBrewingGoal(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_brewing_goal']);
        return result.values?.[0]?.value || '';
    }

    async setUserBrewingGoal(goal: string): Promise<void> {
        await this.set('user_brewing_goal', goal);
    }

    async getUserDailyCups(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_daily_cups']);
        return result.values?.[0]?.value || '';
    }

    async setUserDailyCups(cups: string): Promise<void> {
        await this.set('user_daily_cups', cups);
    }

    async getUserPreferredMethods(): Promise<string[]> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_preferred_methods']);
        try {
            return JSON.parse(result.values?.[0]?.value || '[]');
        } catch {
            return [];
        }
    }

    async setUserPreferredMethods(methods: string[]): Promise<void> {
        await this.set('user_preferred_methods', JSON.stringify(methods));
    }

    async getUserPreferredDrinks(): Promise<string[]> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_preferred_drinks']);
        try {
            return JSON.parse(result.values?.[0]?.value || '[]');
        } catch {
            return [];
        }
    }

    async setUserPreferredDrinks(drinks: string[]): Promise<void> {
        await this.set('user_preferred_drinks', JSON.stringify(drinks));
    }

    async getNotificationsEnabled(): Promise<boolean> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['notifications_enabled']);
        return result.values?.[0]?.value !== 'false';
    }

    async setNotificationsEnabled(enabled: boolean): Promise<void> {
        await this.set('notifications_enabled', String(enabled));
    }

    async getTimerFeedbackEnabled(): Promise<boolean> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['timer_feedback_enabled']);
        return result.values?.[0]?.value !== 'false';
    }

    async setTimerFeedbackEnabled(enabled: boolean): Promise<void> {
        await this.set('timer_feedback_enabled', String(enabled));
    }

    async clearUserData(): Promise<void> {
        await this.db.run('DELETE FROM brew_logs');
        await this.db.run('DELETE FROM drink_logs');
        await this.db.run('DELETE FROM backups');
        await this.db.run('DELETE FROM pantry_items');
        await this.db.run('DELETE FROM recipes WHERE is_custom = 1');
        await dbService.saveToLocalStore();
    }
}
