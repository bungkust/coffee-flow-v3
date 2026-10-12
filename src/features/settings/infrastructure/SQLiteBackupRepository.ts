import { dbService } from '../../../core/database/sqlite';
import type { Backup } from '../domain/entities';

type Snapshot = Record<string, Array<Record<string, string | number | null>>>;

const BACKUP_TABLES = [
    'brewing_methods',
    'recipes',
    'recipe_steps',
    'brew_logs',
    'drinks',
    'drink_logs',
    'app_settings',
    'pantry_items'
];

interface BackupRow {
    id: string;
    created_at: string;
    size_bytes: number;
    location: string;
}

function toDomainBackup(row: BackupRow): Backup {
    return {
        id: row.id,
        created_at: row.created_at,
        size_bytes: row.size_bytes,
        location: row.location,
    };
}

export class SQLiteBackupRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<Backup[]> {
        const result = await this.db.query('SELECT * FROM backups ORDER BY created_at DESC');
        return (result.values || []).map(toDomainBackup);
    }

    async save(backup: Backup): Promise<void> {
        await this.db.run(
            `INSERT OR REPLACE INTO backups (id, created_at, size_bytes, location) VALUES (?, ?, ?, ?)`,
            [backup.id, backup.created_at, backup.size_bytes, backup.location]
        );
        await dbService.saveToLocalStore();
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM backups WHERE id = ?', [id]);
        localStorage.removeItem(`coffee_flow_backup_${id}`);
        await dbService.saveToLocalStore();
    }

    async createSnapshot(): Promise<string> {
        const snapshot: Snapshot = {};
        for (const table of BACKUP_TABLES) {
            const result = await this.db.query(`SELECT * FROM ${table}`);
            snapshot[table] = result.values || [];
        }
        return JSON.stringify({
            version: 1,
            created_at: new Date().toISOString(),
            tables: snapshot
        });
    }

    async restoreSnapshot(json: string): Promise<void> {
        const parsed = JSON.parse(json) as { tables: Snapshot };
        if (!parsed.tables) throw new Error('Invalid backup snapshot');

        for (const table of [...BACKUP_TABLES].reverse()) {
            await this.db.run(`DELETE FROM ${table}`);
        }

        for (const table of BACKUP_TABLES) {
            const rows = parsed.tables[table] || [];
            for (const row of rows) {
                const columns = Object.keys(row);
                if (columns.length === 0) continue;
                const placeholders = columns.map(() => '?').join(', ');
                const values = columns.map((column) => row[column]);
                await this.db.run(
                    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
                    values
                );
            }
        }

        await dbService.saveToLocalStore();
    }
}