import { SQLiteBackupRepository } from '../infrastructure/SQLiteBackupRepository';
import type { Backup } from '../domain/entities';

export class BackupService {
    private repo: SQLiteBackupRepository;

    constructor(repo: SQLiteBackupRepository) {
        this.repo = repo;
    }

    async getBackups(): Promise<Backup[]> {
        return this.repo.findAll();
    }

    async getLastSuccessfulBackup(): Promise<Backup | null> {
        const backups = await this.repo.findAll();
        return backups.find(b => b.status === 'Success') || null;
    }

    async performBackup(): Promise<Backup> {
        const snapshot = await this.repo.createSnapshot();
        const size = new Blob([snapshot]).size;

        const newBackup: Backup = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            size_bytes: size,
            location: 'Local Snapshot',
            status: 'Success'
        };

        localStorage.setItem(`coffee_flow_backup_${newBackup.id}`, snapshot);
        await this.repo.save(newBackup);
        return newBackup;
    }

    async restoreBackup(id: string): Promise<void> {
        const snapshot = localStorage.getItem(`coffee_flow_backup_${id}`);
        if (!snapshot) throw new Error('Backup snapshot not found');
        await this.repo.restoreSnapshot(snapshot);
    }
}
