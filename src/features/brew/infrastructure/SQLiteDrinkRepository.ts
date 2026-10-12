import type { Drink, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface DrinkRow {
    id: string;
    name: string;
    category: string;
    ingredients_json: string;
    instructions_json: string;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

function toDomainDrink(row: DrinkRow): Drink {
    return {
        id: row.id,
        name: row.name,
        category: row.category as Drink['category'],
        ingredients_json: row.ingredients_json,
        instructions_json: row.instructions_json,
        image_url: row.image_url ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? undefined,
    };
}

export class SQLiteDrinkRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<Drink[]> {
        const result = await this.db.query('SELECT * FROM drinks WHERE deleted_at IS NULL ORDER BY name ASC');
        return (result.values || []).map(toDomainDrink);
    }

    async findById(id: EntityId): Promise<Drink | null> {
        const result = await this.db.query('SELECT * FROM drinks WHERE id = ? AND deleted_at IS NULL', [id]);
        const row = result.values?.[0] as DrinkRow | undefined;
        return row ? toDomainDrink(row) : null;
    }

    async save(drink: Drink): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT OR REPLACE INTO drinks
             (id, name, category, ingredients_json, instructions_json, image_url, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                drink.id,
                drink.name,
                drink.category,
                drink.ingredients_json,
                drink.instructions_json,
                drink.image_url || null,
                drink.created_at || now,
                now,
                drink.deleted_at ?? null
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