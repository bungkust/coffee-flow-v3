import type { Drink, DrinkBaseType, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface DrinkRow {
    id: string;
    name: string;
    category: string;
    base_type?: string | null;
    is_favorite?: number | null;
    base_recipe_id?: string | null;
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
        base_type: (row.base_type as DrinkBaseType) || 'coffee',
        is_favorite: Boolean(row.is_favorite),
        base_recipe_id: row.base_recipe_id ?? undefined,
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

    async findAll(baseType?: DrinkBaseType): Promise<Drink[]> {
        if (baseType) {
            const result = await this.db.query(
                'SELECT * FROM drinks WHERE deleted_at IS NULL AND base_type = ? ORDER BY is_favorite DESC, name ASC',
                [baseType]
            );
            return (result.values || []).map(toDomainDrink);
        }
        const result = await this.db.query(
            'SELECT * FROM drinks WHERE deleted_at IS NULL ORDER BY is_favorite DESC, name ASC'
        );
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
            `INSERT INTO drinks
             (id, name, category, base_type, is_favorite, base_recipe_id, ingredients_json, instructions_json, image_url, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               category = excluded.category,
               base_type = excluded.base_type,
               is_favorite = excluded.is_favorite,
               base_recipe_id = excluded.base_recipe_id,
               ingredients_json = excluded.ingredients_json,
               instructions_json = excluded.instructions_json,
               image_url = excluded.image_url,
               updated_at = excluded.updated_at,
               deleted_at = excluded.deleted_at`,
            [
                drink.id,
                drink.name,
                drink.category,
                drink.base_type || 'coffee',
                drink.is_favorite ? 1 : 0,
                drink.base_recipe_id || null,
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

    async toggleFavorite(id: EntityId): Promise<void> {
        const drink = await this.findById(id);
        if (!drink) throw new Error('Drink not found');
        const nextFav = !drink.is_favorite;
        const now = new Date().toISOString();
        await this.db.run('UPDATE drinks SET is_favorite = ?, updated_at = ? WHERE id = ?', [nextFav ? 1 : 0, now, id]);
        await dbService.saveToLocalStore();
    }

    async delete(id: EntityId): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run('UPDATE drinks SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
        await dbService.saveToLocalStore();
    }
}