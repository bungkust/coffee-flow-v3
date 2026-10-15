import type { DrinkLog, DrinkLogWithDrink, DrinkStats, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface DrinkLogRow {
    id: string;
    drink_id: string;
    drink_name?: string | null;
    bean_id?: string | null;
    milk_id?: string | null;
    recipe_id?: string | null;
    ingredients_snapshot_json?: string | null;
    rating: number | null;
    sweetness?: number | null;
    coffee_strength?: number | null;
    creaminess?: number | null;
    flavor_tags?: string | null;
    notes: string | null;
    logged_at: string;
    created_at: string;
}

interface DrinkLogWithDrinkRow extends DrinkLogRow {
    joined_drink_name?: string | null;
    joined_category?: string | null;
    bean_name?: string | null;
    milk_name?: string | null;
    recipe_name?: string | null;
}

function toDomainDrinkLog(row: DrinkLogRow): DrinkLog {
    return {
        id: row.id,
        drink_id: row.drink_id,
        drink_name: row.drink_name ?? undefined,
        bean_id: row.bean_id ?? undefined,
        milk_id: row.milk_id ?? undefined,
        recipe_id: row.recipe_id ?? undefined,
        ingredients_snapshot_json: row.ingredients_snapshot_json ?? undefined,
        rating: row.rating ?? undefined,
        sweetness: row.sweetness ?? undefined,
        coffee_strength: row.coffee_strength ?? undefined,
        creaminess: row.creaminess ?? undefined,
        flavor_tags: row.flavor_tags ?? undefined,
        notes: row.notes ?? undefined,
        logged_at: row.logged_at,
        created_at: row.created_at,
    };
}

function toDomainDrinkLogWithDrink(row: DrinkLogWithDrinkRow): DrinkLogWithDrink {
    return {
        ...toDomainDrinkLog(row),
        drink_name: row.drink_name || row.joined_drink_name || 'Drink',
        category: (row.joined_category as DrinkLogWithDrink['category']) || 'Hot',
        bean_name: row.bean_name ?? undefined,
        milk_name: row.milk_name ?? undefined,
        recipe_name: row.recipe_name ?? undefined,
    };
}

export class SQLiteDrinkLogRepository {
    private get db() {
        return dbService.getDb();
    }

    async save(log: DrinkLog): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT INTO drink_logs (
                id, drink_id, drink_name, bean_id, milk_id, recipe_id,
                ingredients_snapshot_json, rating, sweetness, coffee_strength,
                creaminess, flavor_tags, notes, logged_at, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.drink_id,
                log.drink_name ?? null,
                log.bean_id ?? null,
                log.milk_id ?? null,
                log.recipe_id ?? null,
                log.ingredients_snapshot_json ?? null,
                log.rating ?? null,
                log.sweetness ?? null,
                log.coffee_strength ?? null,
                log.creaminess ?? null,
                log.flavor_tags ?? null,
                log.notes ?? null,
                log.logged_at,
                log.created_at || now
            ]
        );
        await dbService.saveToLocalStore();
    }

    async update(id: EntityId, rating: number, notes: string): Promise<void> {
        await this.db.run('UPDATE drink_logs SET rating = ?, notes = ? WHERE id = ?', [rating, notes, id]);
        await dbService.saveToLocalStore();
    }

    async delete(id: EntityId): Promise<void> {
        await this.db.run('DELETE FROM drink_logs WHERE id = ?', [id]);
        await dbService.saveToLocalStore();
    }

    async findByIdWithDrink(id: EntityId): Promise<DrinkLogWithDrink | null> {
        const result = await this.db.query(`
            SELECT 
                dl.*,
                d.name as joined_drink_name,
                d.category as joined_category,
                b.name as bean_name,
                m.name as milk_name,
                r.name as recipe_name
            FROM drink_logs dl
            LEFT JOIN drinks d ON dl.drink_id = d.id
            LEFT JOIN pantry_items b ON dl.bean_id = b.id
            LEFT JOIN pantry_items m ON dl.milk_id = m.id
            LEFT JOIN recipes r ON dl.recipe_id = r.id
            WHERE dl.id = ?
        `, [id]);
        const row = result.values?.[0] as DrinkLogWithDrinkRow | undefined;
        return row ? toDomainDrinkLogWithDrink(row) : null;
    }

    async getStats(): Promise<DrinkStats> {
        const result = await this.db.query(`
            SELECT
                (SELECT COUNT(*) FROM drink_logs WHERE logged_at >= date('now', '-7 days')) as weeklyDrinks,
                (SELECT COUNT(*) FROM drink_logs WHERE logged_at >= date('now', 'start of month')) as monthlyDrinks,
                (SELECT AVG(rating) FROM drink_logs) as avgRating,
                (SELECT COUNT(DISTINCT drink_id) FROM drink_logs) as uniqueDrinks
        `);
        const row = result.values?.[0];

        return {
            weeklyDrinks: row?.weeklyDrinks || 0,
            monthlyDrinks: row?.monthlyDrinks || 0,
            avgRating: parseFloat((row?.avgRating || 0).toFixed(1)),
            uniqueDrinks: row?.uniqueDrinks || 0
        };
    }

    async getRecentWithDrinks(limit?: number): Promise<DrinkLogWithDrink[]> {
        const limitClause = limit ? `LIMIT ${limit}` : '';
        const result = await this.db.query(`
            SELECT 
                dl.*,
                d.name as joined_drink_name,
                d.category as joined_category,
                b.name as bean_name,
                m.name as milk_name,
                r.name as recipe_name
            FROM drink_logs dl
            LEFT JOIN drinks d ON dl.drink_id = d.id
            LEFT JOIN pantry_items b ON dl.bean_id = b.id
            LEFT JOIN pantry_items m ON dl.milk_id = m.id
            LEFT JOIN recipes r ON dl.recipe_id = r.id
            ORDER BY dl.logged_at DESC
            ${limitClause}
        `);
        return (result.values || []).map(toDomainDrinkLogWithDrink);
    }
}