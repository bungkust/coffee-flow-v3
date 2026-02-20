import { dbService } from '../../../core/database/sqlite';
import type { Backup } from '../domain/entities';

export class SQLiteBackupRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<Backup[]> {
        const result = await this.db.query('SELECT * FROM backups ORDER BY created_at DESC');
        return result.values as Backup[] || [];
    }

    async save(backup: Backup): Promise<void> {
        await this.db.run(
            `INSERT OR REPLACE INTO backups (id, created_at, size_bytes, location, status) VALUES (?, ?, ?, ?, ?)`,
            [backup.id, backup.created_at, backup.size_bytes, backup.location, backup.status]
        );
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM backups WHERE id = ?', [id]);
    }
}
