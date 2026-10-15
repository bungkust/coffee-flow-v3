import type { PantryItem } from '../domain/entities';
import type { EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface PantryItemRow {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    description: string | null;
    quantity: number | null;
    unit: string | null;
    roast_date: string | null;
    purchase_date: string | null;
    tags_json: string | null;
    icon: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

function toDomainItem(row: PantryItemRow): PantryItem {
    const lowThreshold = row.unit === 'g' || row.unit === 'ml' ? 50 : row.unit === 'pcs' ? 2 : 10;
    return {
        id: row.id,
        name: row.name,
        category: row.category as PantryItem['category'],
        brand: row.brand ?? undefined,
        description: row.description ?? undefined,
        quantity: row.quantity ?? undefined,
        unit: row.unit as PantryItem['unit'],
        is_low_stock: row.quantity != null && row.quantity <= lowThreshold,
        roast_date: row.roast_date ?? undefined,
        purchase_date: row.purchase_date ?? undefined,
        tags_json: row.tags_json ? JSON.parse(row.tags_json) : [],
        icon: row.icon ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? undefined,
    };
}

export class SQLitePantryRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<PantryItem[]> {
        const result = await this.db.query('SELECT * FROM pantry_items WHERE deleted_at IS NULL ORDER BY created_at DESC');
        return (result.values || []).map(toDomainItem);
    }

    async findById(id: EntityId): Promise<PantryItem | null> {
        const result = await this.db.query('SELECT * FROM pantry_items WHERE id = ? AND deleted_at IS NULL', [id]);
        const row = result.values?.[0] as PantryItemRow | undefined;
        return row ? toDomainItem(row) : null;
    }

    async save(item: PantryItem): Promise<void> {
        const now = new Date().toISOString();

        await this.db.run(
            `INSERT INTO pantry_items
            (id, name, category, brand, description, quantity, unit, roast_date, purchase_date, tags_json, icon, created_at, updated_at, deleted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              (name, category, brand, description, quantity, unit, roast_date, purchase_date, tags_json, icon, updated_at, deleted_at) = (excluded.name, excluded.category, excluded.brand, excluded.description, excluded.quantity, excluded.unit, excluded.roast_date, excluded.purchase_date, excluded.tags_json, excluded.icon, excluded.updated_at, excluded.deleted_at)`,
            [
                item.id,
                item.name,
                item.category,
                item.brand ?? null,
                item.description ?? null,
                item.quantity ?? null,
                item.unit ?? null,
                item.roast_date ?? null,
                item.purchase_date ?? null,
                JSON.stringify(item.tags_json || []),
                item.icon ?? null,
                item.created_at || now,
                now,
                null
            ]
        );

        await dbService.saveToLocalStore();
    }

    async delete(id: EntityId): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run('UPDATE pantry_items SET deleted_at = ? WHERE id = ?', [now, id]);
        await dbService.saveToLocalStore();
    }

    async deductStock(id: string, amount: number): Promise<void> {
        if (!Number.isFinite(amount) || amount <= 0) return;

        await this.db.run(
            'UPDATE pantry_items SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE id = ?',
            [amount, new Date().toISOString(), id]
        );
        await dbService.saveToLocalStore();
    }

    async addStock(id: string, amount: number): Promise<void> {
        if (!Number.isFinite(amount) || amount <= 0) return;

        await this.db.run(
            'UPDATE pantry_items SET quantity = COALESCE(quantity, 0) + ?, updated_at = ? WHERE id = ?',
            [amount, new Date().toISOString(), id]
        );
        await dbService.saveToLocalStore();
    }
}
