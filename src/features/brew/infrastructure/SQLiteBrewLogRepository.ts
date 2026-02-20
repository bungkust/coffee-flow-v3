import type { IBrewLogRepository } from '../../../shared/domain/repositories';
import type { BrewLog, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

export class SQLiteBrewLogRepository implements IBrewLogRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAllByRecipeId(recipeId: EntityId): Promise<BrewLog[]> {
        const result = await this.db.query('SELECT * FROM brew_logs WHERE recipe_id = ? ORDER BY brewed_at DESC', [recipeId]);
        return result.values || [];
    }

    async save(log: BrewLog): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT INTO brew_logs (id, recipe_id, bean_id, rating, notes, sweetness, acidity, body, bitterness, flavor_tags, brewed_at, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.recipe_id,
                log.bean_id || null,
                log.rating,
                log.notes,
                log.sweetness,
                log.acidity,
                log.body,
                log.bitterness,
                log.flavor_tags,
                log.brewed_at,
                log.created_at || now
            ]
        );
    }

    async findAll(): Promise<BrewLog[]> {
        const result = await this.db.query('SELECT * FROM brew_logs ORDER BY brewed_at DESC');
        return result.values || [];
    }

    async getStats(): Promise<any> {
        const weeklyBrews = await this.db.query(
            "SELECT COUNT(*) as count FROM brew_logs WHERE brewed_at >= date('now', '-7 days')"
        );
        const avgRating = await this.db.query(
            "SELECT AVG(rating) as avg FROM brew_logs"
        );
        const beansCount = await this.db.query(
            "SELECT COUNT(DISTINCT recipe_id) as count FROM brew_logs"
        );

        return {
            weeklyBrews: weeklyBrews.values?.[0].count || 0,
            avgRating: parseFloat((avgRating.values?.[0].avg || 0).toFixed(1)),
            beansCount: beansCount.values?.[0].count || 0
        };
    }

    async getRecentWithRecipes(limit: number = 5): Promise<any[]> {
        const result = await this.db.query(`
            SELECT b.*, r.name as recipe_name, r.method_id, r.ratio 
            FROM brew_logs b
            JOIN recipes r ON b.recipe_id = r.id
            ORDER BY b.brewed_at DESC
            LIMIT ?
        `, [limit]);
        return result.values || [];
    }

    async getRecentWithRecipesAll(): Promise<any[]> {
        const result = await this.db.query(`
            SELECT b.*, r.name as recipe_name, r.method_id, r.ratio 
            FROM brew_logs b
            JOIN recipes r ON b.recipe_id = r.id
            ORDER BY b.brewed_at DESC
        `);
        return result.values || [];
    }
}
