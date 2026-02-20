import type { IDrinkLogRepository } from '../../../shared/domain/repositories';
import type { DrinkLog, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

export class SQLiteDrinkLogRepository implements IDrinkLogRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<DrinkLog[]> {
        const result = await this.db.query('SELECT * FROM drink_logs ORDER BY logged_at DESC');
        return result.values || [];
    }

    async findAllByDrinkId(drinkId: EntityId): Promise<DrinkLog[]> {
        const result = await this.db.query('SELECT * FROM drink_logs WHERE drink_id = ? ORDER BY logged_at DESC', [drinkId]);
        return result.values || [];
    }

    async save(log: DrinkLog): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT INTO drink_logs (id, drink_id, rating, notes, logged_at, created_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.drink_id,
                log.rating,
                log.notes,
                log.logged_at,
                log.created_at || now
            ]
        );
    }

    async getStats(): Promise<any> {
        const weeklyDrinks = await this.db.query(
            "SELECT COUNT(*) as count FROM drink_logs WHERE logged_at >= date('now', '-7 days')"
        );
        const avgRating = await this.db.query(
            "SELECT AVG(rating) as avg FROM drink_logs"
        );
        const uniqueDrinks = await this.db.query(
            "SELECT COUNT(DISTINCT drink_id) as count FROM drink_logs"
        );

        return {
            weeklyDrinks: weeklyDrinks.values?.[0].count || 0,
            avgRating: parseFloat((avgRating.values?.[0].avg || 0).toFixed(1)),
            uniqueDrinks: uniqueDrinks.values?.[0].count || 0
        };
    }

    async getRecentWithDrinks(): Promise<any[]> {
        const result = await this.db.query(`
            SELECT dl.*, d.name as drink_name, d.category 
            FROM drink_logs dl
            JOIN drinks d ON dl.drink_id = d.id
            ORDER BY dl.logged_at DESC
        `);
        return result.values || [];
    }
}
