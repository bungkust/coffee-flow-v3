import type { IDrinkRepository } from '../../../shared/domain/repositories';
import type { Drink, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

export class SQLiteDrinkRepository implements IDrinkRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<Drink[]> {
        const result = await this.db.query('SELECT * FROM drinks WHERE deleted_at IS NULL ORDER BY name ASC');
        return result.values || [];
    }

    async findById(id: EntityId): Promise<Drink | null> {
        const result = await this.db.query('SELECT * FROM drinks WHERE id = ? AND deleted_at IS NULL', [id]);
        return result.values?.[0] || null;
    }

    async save(drink: Drink): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT OR REPLACE INTO drinks
             (id, name, category, ingredients_json, instructions_json, version, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                drink.id,
                drink.name,
                drink.category,
                drink.ingredients_json,
                drink.instructions_json,
                drink.version || 1,
                drink.created_at || now,
                now,
                drink.deleted_at || null
            ]
        );
        await dbService.saveToLocalStore();
    }

    async delete(id: EntityId): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run('UPDATE drinks SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
        await dbService.saveToLocalStore();
    }
}
