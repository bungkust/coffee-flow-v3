import type { BrewLog, BrewLogWithRecipe, BrewStats, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface BrewLogRow {
    id: string;
    recipe_id: string;
    bean_id: string | null;
    rating: number | null;
    notes: string | null;
    sweetness: number | null;
    acidity: number | null;
    body: number | null;
    bitterness: number | null;
    flavor_tags: string | null;
    brewed_at: string;
    created_at: string;
}

interface BrewLogWithRecipeRow extends BrewLogRow {
    recipe_name: string;
    method_id: string;
    ratio: string;
}

function toBrewLog(row: BrewLogRow): BrewLog {
    return {
        id: row.id,
        recipe_id: row.recipe_id,
        bean_id: row.bean_id ?? undefined,
        rating: row.rating ?? undefined,
        notes: row.notes ?? undefined,
        sweetness: row.sweetness ?? undefined,
        acidity: row.acidity ?? undefined,
        body: row.body ?? undefined,
        bitterness: row.bitterness ?? undefined,
        flavor_tags: row.flavor_tags ?? undefined,
        brewed_at: row.brewed_at,
        created_at: row.created_at,
    };
}

function toBrewLogWithRecipe(row: BrewLogWithRecipeRow): BrewLogWithRecipe {
    return {
        ...toBrewLog(row),
        recipe_name: row.recipe_name,
        method_id: row.method_id,
        ratio: row.ratio,
    };
}

export class SQLiteBrewLogRepository {
    private get db() {
        return dbService.getDb();
    }

    async save(log: BrewLog): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT INTO brew_logs (id, recipe_id, bean_id, rating, notes, sweetness, acidity, body, bitterness, flavor_tags, brewed_at, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.recipe_id,
                log.bean_id ?? null,
                log.rating ?? null,
                log.notes ?? null,
                log.sweetness ?? null,
                log.acidity ?? null,
                log.body ?? null,
                log.bitterness ?? null,
                log.flavor_tags ?? null,
                log.brewed_at,
                log.created_at || now
            ]
        );
        await dbService.saveToLocalStore();
    }

    async update(log: BrewLog): Promise<void> {
        await this.db.run(
            `UPDATE brew_logs
             SET rating = ?, notes = ?, sweetness = ?, acidity = ?, body = ?, bitterness = ?, flavor_tags = ?
             WHERE id = ?`,
            [
                log.rating ?? null,
                log.notes ?? null,
                log.sweetness ?? null,
                log.acidity ?? null,
                log.body ?? null,
                log.bitterness ?? null,
                log.flavor_tags ?? null,
                log.id
            ]
        );
        await dbService.saveToLocalStore();
    }

    async delete(id: EntityId): Promise<void> {
        await this.db.run('DELETE FROM brew_logs WHERE id = ?', [id]);
        await dbService.saveToLocalStore();
    }

    async findByIdWithRecipe(id: EntityId): Promise<BrewLogWithRecipe | null> {
        const result = await this.db.query(`
            SELECT b.*, COALESCE(r.name, 'Deleted Recipe') as recipe_name, COALESCE(r.method_id, 'unknown') as method_id, COALESCE(r.ratio, '1:15') as ratio
            FROM brew_logs b
            LEFT JOIN recipes r ON b.recipe_id = r.id
            WHERE b.id = ?
        `, [id]);
        const row = result.values?.[0] as BrewLogWithRecipeRow | undefined;
        return row ? toBrewLogWithRecipe(row) : null;
    }

    async getStats(): Promise<BrewStats> {
        const weeklyBrews = await this.db.query(
            "SELECT COUNT(*) as count FROM brew_logs WHERE brewed_at >= date('now', '-7 days')"
        );
        const monthlyBrews = await this.db.query(
            "SELECT COUNT(*) as count FROM brew_logs WHERE brewed_at >= date('now', 'start of month')"
        );
        const avgRating = await this.db.query(
            "SELECT AVG(rating) as avg FROM brew_logs"
        );
        const beansCount = await this.db.query(
            "SELECT COUNT(*) as count FROM pantry_items WHERE category = 'beans' AND deleted_at IS NULL"
        );

        return {
            weeklyBrews: weeklyBrews.values?.[0].count || 0,
            monthlyBrews: monthlyBrews.values?.[0].count || 0,
            avgRating: parseFloat((avgRating.values?.[0].avg || 0).toFixed(1)),
            beansCount: beansCount.values?.[0].count || 0
        };
    }

    async getRecentWithRecipes(limit: number = 5): Promise<BrewLogWithRecipe[]> {
        const result = await this.db.query(`
            SELECT b.*, COALESCE(r.name, 'Deleted Recipe') as recipe_name, COALESCE(r.method_id, 'unknown') as method_id, COALESCE(r.ratio, '1:15') as ratio 
            FROM brew_logs b
            LEFT JOIN recipes r ON b.recipe_id = r.id
            ORDER BY b.brewed_at DESC
            LIMIT ${Number(limit) || 5}
        `);
        return (result.values || []).map(toBrewLogWithRecipe);
    }

    async getRecentWithRecipesAll(): Promise<BrewLogWithRecipe[]> {
        const result = await this.db.query(`
            SELECT b.*, COALESCE(r.name, 'Deleted Recipe') as recipe_name, COALESCE(r.method_id, 'unknown') as method_id, COALESCE(r.ratio, '1:15') as ratio 
            FROM brew_logs b
            LEFT JOIN recipes r ON b.recipe_id = r.id
            ORDER BY b.brewed_at DESC
        `);
        return (result.values || []).map(toBrewLogWithRecipe);
    }
}