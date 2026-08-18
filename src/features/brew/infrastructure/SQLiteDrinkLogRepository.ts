import type { IDrinkLogRepository } from '../../../shared/domain/repositories';
import type { DrinkLog, DrinkLogWithDrink, DrinkStats, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface DrinkLogRow {
    id: string;
    drink_id: string;
    rating: number | null;
    notes: string | null;
    logged_at: string;
    created_at: string;
}

interface DrinkLogWithDrinkRow extends DrinkLogRow {
    drink_name: string;
    category: string;
}

function toDomainDrinkLog(row: DrinkLogRow): DrinkLog {
    return {
        id: row.id,
        drink_id: row.drink_id,
        rating: row.rating ?? undefined,
        notes: row.notes ?? undefined,
        logged_at: row.logged_at,
        created_at: row.created_at,
    };
}

function toDomainDrinkLogWithDrink(row: DrinkLogWithDrinkRow): DrinkLogWithDrink {
    return {
        ...toDomainDrinkLog(row),
        drink_name: row.drink_name,
        category: row.category as DrinkLogWithDrink['category'],
    };
}

export class SQLiteDrinkLogRepository implements IDrinkLogRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<DrinkLog[]> {
        const result = await this.db.query('SELECT * FROM drink_logs ORDER BY logged_at DESC');
        return (result.values || []).map(toDomainDrinkLog);
    }

    async findAllByDrinkId(drinkId: EntityId): Promise<DrinkLog[]> {
        const result = await this.db.query('SELECT * FROM drink_logs WHERE drink_id = ? ORDER BY logged_at DESC', [drinkId]);
        return (result.values || []).map(toDomainDrinkLog);
    }

    async save(log: DrinkLog): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT INTO drink_logs (id, drink_id, rating, notes, logged_at, created_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.drink_id,
                log.rating ?? null,
                log.notes ?? null,
                log.logged_at,
                log.created_at || now
            ]
        );
        await dbService.saveToLocalStore();
    }

    async update(log: DrinkLog): Promise<void> {
        await this.db.run(
            `UPDATE drink_logs SET rating = ?, notes = ? WHERE id = ?`,
            [log.rating ?? null, log.notes ?? null, log.id]
        );
        await dbService.saveToLocalStore();
    }

    async delete(id: EntityId): Promise<void> {
        await this.db.run('DELETE FROM drink_logs WHERE id = ?', [id]);
        await dbService.saveToLocalStore();
    }

    async findByIdWithDrink(id: EntityId): Promise<DrinkLogWithDrink | null> {
        const result = await this.db.query(`
            SELECT dl.*, d.name as drink_name, d.category
            FROM drink_logs dl
            JOIN drinks d ON dl.drink_id = d.id
            WHERE dl.id = ?
        `, [id]);
        const row = result.values?.[0] as DrinkLogWithDrinkRow | undefined;
        return row ? toDomainDrinkLogWithDrink(row) : null;
    }

    async getStats(): Promise<DrinkStats> {
        const weeklyDrinks = await this.db.query(
            "SELECT COUNT(*) as count FROM drink_logs WHERE logged_at >= date('now', '-7 days')"
        );
        const monthlyDrinks = await this.db.query(
            "SELECT COUNT(*) as count FROM drink_logs WHERE logged_at >= date('now', 'start of month')"
        );
        const avgRating = await this.db.query(
            "SELECT AVG(rating) as avg FROM drink_logs"
        );
        const uniqueDrinks = await this.db.query(
            "SELECT COUNT(DISTINCT drink_id) as count FROM drink_logs"
        );

        return {
            weeklyDrinks: weeklyDrinks.values?.[0].count || 0,
            monthlyDrinks: monthlyDrinks.values?.[0].count || 0,
            avgRating: parseFloat((avgRating.values?.[0].avg || 0).toFixed(1)),
            uniqueDrinks: uniqueDrinks.values?.[0].count || 0
        };
    }

    async getRecentWithDrinks(): Promise<DrinkLogWithDrink[]> {
        const result = await this.db.query(`
            SELECT dl.*, d.name as drink_name, d.category 
            FROM drink_logs dl
            JOIN drinks d ON dl.drink_id = d.id
            ORDER BY dl.logged_at DESC
        `);
        return (result.values || []).map(toDomainDrinkLogWithDrink);
    }
}