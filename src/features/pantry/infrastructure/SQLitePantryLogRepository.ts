import type { PantryLog } from '../domain/entities';
import type { EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface PantryLogRow {
    id: string;
    pantry_item_id: string;
    change_amount: number;
    unit: string | null;
    action_type: string;
    reference_id: string | null;
    reference_name: string | null;
    notes: string | null;
    created_at: string;
}

function toDomainLog(row: PantryLogRow): PantryLog {
    return {
        id: row.id,
        pantry_item_id: row.pantry_item_id,
        change_amount: row.change_amount,
        unit: row.unit ?? undefined,
        action_type: row.action_type as PantryLog['action_type'],
        reference_id: row.reference_id ?? undefined,
        reference_name: row.reference_name ?? undefined,
        notes: row.notes ?? undefined,
        created_at: row.created_at,
    };
}

export class SQLitePantryLogRepository {
    private get db() {
        return dbService.getDb();
    }

    async save(log: PantryLog): Promise<void> {
        await this.db.run(
            `INSERT INTO pantry_logs
             (id, pantry_item_id, change_amount, unit, action_type, reference_id, reference_name, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                log.id,
                log.pantry_item_id,
                log.change_amount,
                log.unit ?? null,
                log.action_type,
                log.reference_id ?? null,
                log.reference_name ?? null,
                log.notes ?? null,
                log.created_at
            ]
        );
        await dbService.saveToLocalStore();
    }

    async findByItemId(itemId: EntityId): Promise<PantryLog[]> {
        const result = await this.db.query(
            'SELECT * FROM pantry_logs WHERE pantry_item_id = ? ORDER BY created_at DESC',
            [itemId]
        );
        return (result.values || []).map(toDomainLog);
    }

    async getRecentLogs(limit = 50): Promise<PantryLog[]> {
        const result = await this.db.query(
            'SELECT * FROM pantry_logs ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
        return (result.values || []).map(toDomainLog);
    }
}
