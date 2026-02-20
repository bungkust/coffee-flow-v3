import { SQLitePantryRepository } from '../infrastructure/SQLitePantryRepository';
import type { PantryItem, PantryCategory } from '../domain/entities';
import type { EntityId } from '../../../shared/domain/entities';

export class PantryService {
    private repository: SQLitePantryRepository;

    constructor(repository: SQLitePantryRepository) {
        this.repository = repository;
    }

    async getPantryItems(): Promise<PantryItem[]> {
        return this.repository.findAll();
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
            is_active: true,
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
}
