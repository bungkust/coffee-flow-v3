import type { BrewingMethod } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

export class SQLiteBrewingMethodRepository {
    private get db() {
        return dbService.getDb();
    }

    async getAllMethods(): Promise<BrewingMethod[]> {
        const result = await this.db.query(
            'SELECT id, name, description, icon, created_at, updated_at, deleted_at FROM brewing_methods WHERE deleted_at IS NULL ORDER BY name'
        );
        return (result.values || []) as BrewingMethod[];
    }
}
