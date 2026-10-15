import { SQLitePantryRepository } from '../infrastructure/SQLitePantryRepository';
import type { SQLitePantryLogRepository } from '../infrastructure/SQLitePantryLogRepository';
import type { PantryItem, PantryCategory, PantryLog, PantryLogAction } from '../domain/entities';
import type { EntityId } from '../../../shared/domain/entities';

export class PantryService {
    private repository: SQLitePantryRepository;
    private logRepository?: SQLitePantryLogRepository;

    constructor(repository: SQLitePantryRepository, logRepository?: SQLitePantryLogRepository) {
        this.repository = repository;
        this.logRepository = logRepository;
    }

    async getPantryItems(): Promise<PantryItem[]> {
        return this.repository.findAll();
    }

    async getPantryItem(id: EntityId): Promise<PantryItem | null> {
        return this.repository.findById(id);
    }

    async addPantryItem(
        name: string,
        category: PantryCategory,
        data: Partial<Omit<PantryItem, 'id' | 'name' | 'category'>>
    ): Promise<PantryItem> {
        const now = new Date().toISOString();
        const item: PantryItem = {
            id: crypto.randomUUID(),
            name,
            category,
            created_at: now,
            updated_at: now,
            ...data
        };

        await this.repository.save(item);
        return item;
    }

    async updatePantryItem(item: PantryItem): Promise<void> {
        await this.repository.save(item);
    }

    async deletePantryItem(id: EntityId): Promise<void> {
        await this.repository.delete(id);
    }

    async deductStock(
        id: string,
        amount: number,
        metadata?: {
            actionType?: PantryLogAction;
            referenceId?: string;
            referenceName?: string;
            unit?: string;
            notes?: string;
        }
    ): Promise<void> {
        await this.repository.deductStock(id, amount);
        if (this.logRepository && Number.isFinite(amount) && amount > 0) {
            const item = await this.repository.findById(id);
            await this.logRepository.save({
                id: crypto.randomUUID(),
                pantry_item_id: id,
                change_amount: -amount,
                unit: metadata?.unit || item?.unit,
                action_type: metadata?.actionType || 'adjustment',
                reference_id: metadata?.referenceId,
                reference_name: metadata?.referenceName,
                notes: metadata?.notes,
                created_at: new Date().toISOString()
            });
        }
    }

    async addStock(
        id: string,
        amount: number,
        notes?: string
    ): Promise<void> {
        await this.repository.addStock(id, amount);
        if (this.logRepository && Number.isFinite(amount) && amount > 0) {
            const item = await this.repository.findById(id);
            await this.logRepository.save({
                id: crypto.randomUUID(),
                pantry_item_id: id,
                change_amount: amount,
                unit: item?.unit,
                action_type: 'restock',
                notes,
                created_at: new Date().toISOString()
            });
        }
    }

    async getItemLogs(itemId: EntityId): Promise<PantryLog[]> {
        if (!this.logRepository) return [];
        return this.logRepository.findByItemId(itemId);
    }
}
