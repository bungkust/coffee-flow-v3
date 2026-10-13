import { dbService } from '../../../core/database/sqlite';

export class SQLiteSettingsRepository {
    private get db() {
        return dbService.getDb();
    }

    private async get(key: string, fallback = ''): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', [key]);
        return result.values?.[0]?.value || fallback;
    }

    private async set(key: string, value: string): Promise<void> {
        await this.db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
        await dbService.saveToLocalStore();
    }

    async getAppUnit(): Promise<'metric' | 'imperial'> {
        return ((await this.get('app_unit')) as 'metric' | 'imperial') || 'metric';
    }

    async setAppUnit(unit: 'metric' | 'imperial'): Promise<void> {
        await this.set('app_unit', unit);
    }

    async getUserName(): Promise<string> {
        return this.get('user_name');
    }

    async setUserName(name: string): Promise<void> {
        await this.set('user_name', name);
    }

    async getUserPreferredMethods(): Promise<string[]> {
        try {
            return JSON.parse(await this.get('user_preferred_methods', '[]'));
        } catch {
            return [];
        }
    }

    async setUserPreferredMethods(methods: string[]): Promise<void> {
        await this.set('user_preferred_methods', JSON.stringify(methods));
    }

    async getUserPreferredDrinks(): Promise<string[]> {
        try {
            return JSON.parse(await this.get('user_preferred_drinks', '[]'));
        } catch {
            return [];
        }
    }

    async setUserPreferredDrinks(drinks: string[]): Promise<void> {
        await this.set('user_preferred_drinks', JSON.stringify(drinks));
    }

    async getNotificationsEnabled(): Promise<boolean> {
        return (await this.get('notifications_enabled')) !== 'false';
    }

    async setNotificationsEnabled(enabled: boolean): Promise<void> {
        await this.set('notifications_enabled', String(enabled));
    }

    async getTimerFeedbackEnabled(): Promise<boolean> {
        return (await this.get('timer_feedback_enabled')) !== 'false';
    }

    async setTimerFeedbackEnabled(enabled: boolean): Promise<void> {
        await this.set('timer_feedback_enabled', String(enabled));
    }

    async isOnboardingComplete(): Promise<boolean> {
        const name = await this.getUserName();
        const methods = await this.getUserPreferredMethods();
        return name.trim().length > 0 && methods.length >= 1;
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
