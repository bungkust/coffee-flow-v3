import type { PantryItem } from '../domain/entities';
import type { EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface PantryItemRow {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    description: string | null;
    remaining_stock: number | null;
    quantity: number | null;
    unit: string | null;
    is_low_stock: number;
    roast_date: string | null;
    purchase_date: string | null;
    tags_json: string | null;
    icon: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

function toDomainItem(row: PantryItemRow): PantryItem {
    return {
        id: row.id,
        name: row.name,
        category: row.category as PantryItem['category'],
        brand: row.brand ?? undefined,
        description: row.description ?? undefined,
        remaining_stock: row.remaining_stock ?? undefined,
        quantity: row.quantity ?? undefined,
        unit: row.unit as PantryItem['unit'],
        is_low_stock: row.is_low_stock === 1,
        roast_date: row.roast_date ?? undefined,
        purchase_date: row.purchase_date ?? undefined,
        tags_json: row.tags_json ? JSON.parse(row.tags_json) : [],
        icon: row.icon ?? undefined,
        is_active: row.is_active === 1,
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
            `INSERT OR REPLACE INTO pantry_items 
            (id, name, category, brand, description, remaining_stock, quantity, unit, is_low_stock, roast_date, purchase_date, tags_json, icon, is_active, created_at, updated_at, deleted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                item.id,
                item.name,
                item.category,
                item.brand ?? null,
                item.description ?? null,
                item.remaining_stock ?? null,
                item.quantity ?? null,
                item.unit ?? null,
                (item.is_low_stock || ((item.quantity ?? item.remaining_stock ?? 100) <= 10)) ? 1 : 0,
                item.roast_date ?? null,
                item.purchase_date ?? null,
                JSON.stringify(item.tags_json || []),
                item.icon ?? null,
                item.is_active ? 1 : 0,
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

    async clearByCategory(category: string): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run('UPDATE pantry_items SET deleted_at = ? WHERE category = ?', [now, category]);
        await dbService.saveToLocalStore();
    }

    async clearEquipment(): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `UPDATE pantry_items 
              SET deleted_at = ? 
              WHERE category IN ('dripper', 'grinder', 'kettle', 'scale', 'accessory')`,
            [now]
        );
        await dbService.saveToLocalStore();
    }

    async deductStock(id: string, amount: number): Promise<void> {
        if (!Number.isFinite(amount) || amount <= 0) return;

        const result = await this.db.query('SELECT quantity, unit, remaining_stock FROM pantry_items WHERE id = ?', [id]);
        if (!result.values || result.values.length === 0) return;

        const item = result.values[0] as { quantity: number | null; unit: string | null; remaining_stock: number | null };
        
        // Determine current quantity based on unit
        let currentQty: number;
        const unit = item.unit || '';
        
        if (unit === '%') {
            // Percentage-based: use remaining_stock (0-100)
            currentQty = item.remaining_stock ?? 0;
        } else {
            // Absolute units (g, ml, pcs): use quantity, NOT remaining_stock
            currentQty = item.quantity ?? 0;
        }
        
        const newQty = Math.max(0, currentQty - amount);
        const now = new Date().toISOString();
        
        // Low stock threshold depends on unit
        let isLowStock = 0;
        if (unit === '%') {
            isLowStock = newQty <= 10 ? 1 : 0;
        } else if (unit === 'g') {
            isLowStock = newQty <= 50 ? 1 : 0; // 50g threshold for beans
        } else if (unit === 'ml') {
            isLowStock = newQty <= 50 ? 1 : 0; // 50ml threshold for liquids
        } else if (unit === 'pcs') {
            isLowStock = newQty <= 2 ? 1 : 0; // 2 pieces threshold for filters
        }

        if (unit === '%') {
            await this.db.run(
                'UPDATE pantry_items SET quantity = ?, remaining_stock = ?, is_low_stock = ?, updated_at = ? WHERE id = ?',
                [newQty, newQty, isLowStock, now, id]
            );
        } else {
            await this.db.run(
                'UPDATE pantry_items SET quantity = ?, is_low_stock = ?, updated_at = ? WHERE id = ?',
                [newQty, isLowStock, now, id]
            );
        }
        await dbService.saveToLocalStore();
    }
}