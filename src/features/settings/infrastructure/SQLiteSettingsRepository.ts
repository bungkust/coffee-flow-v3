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
