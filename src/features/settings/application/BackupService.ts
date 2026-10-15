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

    private buildRecord(location: string, size: number): Backup {
        return {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            size_bytes: size,
            location
        };
    }

    async performBackup(): Promise<Backup> {
        const snapshot = await this.repo.createSnapshot();
        const newBackup = this.buildRecord('Local Snapshot', new Blob([snapshot]).size);

        localStorage.setItem(`coffee_flow_backup_${newBackup.id}`, snapshot);
        await this.repo.save(newBackup);
        return newBackup;
    }

    async restoreBackup(id: string): Promise<void> {
        const snapshot = localStorage.getItem(`coffee_flow_backup_${id}`);
        if (!snapshot) throw new Error('Backup snapshot not found');
        await this.repo.restoreSnapshot(JSON.parse(snapshot));
    }

    async deleteBackup(id: string): Promise<void> {
        await this.repo.delete(id);
    }

    downloadBackupFile(id: string): void {
        const snapshot = localStorage.getItem(`coffee_flow_backup_${id}`);
        if (!snapshot) throw new Error('Backup snapshot not found');

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `coffeeflow_backup_${dateStr}_${id.slice(0, 6)}.json`;
        const blob = new Blob([snapshot], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importBackupFromFile(jsonContent: string): Promise<Backup> {
        // Validate JSON
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(jsonContent);
        } catch {
            throw new Error('Invalid JSON file format.');
        }

        if (!parsed || typeof parsed !== 'object' || !parsed.tables) {
            throw new Error('Invalid CoffeeFlow backup file. Missing required data tables.');
        }

        // Save imported file as a new backup record in list
        const importedBackup = this.buildRecord('Imported File', new Blob([jsonContent]).size);

        localStorage.setItem(`coffee_flow_backup_${importedBackup.id}`, jsonContent);
        await this.repo.save(importedBackup);
        return importedBackup;
    }
}
