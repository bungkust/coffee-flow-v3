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
        // Simulate backup process
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newBackup: Backup = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            size_bytes: Math.floor(Math.random() * (150 - 130 + 1) + 130) * 1024 * 1024, // Random size between 130-150MB
            location: 'iCloud Drive',
            status: 'Success'
        };

        await this.repo.save(newBackup);
        return newBackup;
    }

    async restoreBackup(id: string): Promise<void> {
        // Simulate restore
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log(`Restored backup ${id}`);
    }
}
