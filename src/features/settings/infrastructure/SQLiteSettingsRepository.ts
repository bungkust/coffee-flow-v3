import { dbService } from '../../../core/database/sqlite';

export class SQLiteSettingsRepository {
    private get db() {
        return dbService.getDb();
    }

    async getAppUnit(): Promise<'metric' | 'imperial'> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['app_unit']);
        return (result.values?.[0]?.value as 'metric' | 'imperial') || 'metric';
    }

    async setAppUnit(unit: 'metric' | 'imperial'): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
            ['app_unit', unit, now]
        );
    }

    async getUserName(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_name']);
        return result.values?.[0]?.value || '';
    }

    async setUserName(name: string): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
            ['user_name', name, now]
        );
    }

    async getUserExperienceLevel(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_experience_level']);
        return result.values?.[0]?.value || '';
    }

    async setUserExperienceLevel(level: string): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
            ['user_experience_level', level, now]
        );
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
        const now = new Date().toISOString();
        const json = JSON.stringify(profile);
        await this.db.run(
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
            ['user_taste_profile', json, now]
        );
    }

    async getUserBrewingGoal(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_brewing_goal']);
        return result.values?.[0]?.value || '';
    }

    async setUserBrewingGoal(goal: string): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
            ['user_brewing_goal', goal, now]
        );
    }

    async getUserDailyCups(): Promise<string> {
        const result = await this.db.query('SELECT value FROM app_settings WHERE key = ?', ['user_daily_cups']);
        return result.values?.[0]?.value || '';
    }

    async setUserDailyCups(cups: string): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
            ['user_daily_cups', cups, now]
        );
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
        const now = new Date().toISOString();
        const json = JSON.stringify(methods);
        await this.db.run(
            `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
            ['user_preferred_methods', json, now]
        );
    }

    async clearUserData(): Promise<void> {
        // 1. Clear Logs
        await this.db.run('DELETE FROM brew_logs');
        await this.db.run('DELETE FROM drink_logs');

        // 2. Clear Backups
        await this.db.run('DELETE FROM backups');

        // 3. Clear Pantry Items
        await this.db.run('DELETE FROM pantry_items');

        // 3. Clear Custom Recipes (is_custom = 1)
        await this.db.run('DELETE FROM recipes WHERE is_custom = 1');

        // 4. Reset modified non-custom recipes (optional, but good for full reset)
        // For now, we'll assume non-custom recipes are static or handled by seeding updates.
        // If we allowed editing non-custom recipes, we'd need a way to reset them.
        // Given the schema, we might want to delete ANY recipe that isn't in the seed list?
        // Safer: Just delete custom ones. The seed function uses INSERT OR REPLACE so it will fix built-ins on restart.
    }
}
