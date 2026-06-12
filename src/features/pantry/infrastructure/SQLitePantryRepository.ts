import type { PantryItem } from '../domain/entities';
import type { EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

export class SQLitePantryRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<PantryItem[]> {
        const result = await this.db.query('SELECT * FROM pantry_items WHERE deleted_at IS NULL ORDER BY created_at DESC');
        return (result.values || []).map(row => ({
            ...row,
            is_low_stock: row.is_low_stock === 1,
            is_active: row.is_active === 1,
            tags_json: row.tags_json ? JSON.parse(row.tags_json) : []
        }));
    }

    async findById(id: EntityId): Promise<PantryItem | null> {
        const result = await this.db.query('SELECT * FROM pantry_items WHERE id = ? AND deleted_at IS NULL', [id]);
        const row = result.values?.[0];
        if (!row) return null;
        return {
            ...row,
            is_low_stock: row.is_low_stock === 1,
            is_active: row.is_active === 1,
            tags_json: row.tags_json ? JSON.parse(row.tags_json) : []
        };
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
                item.brand || null,
                item.description || null,
                item.remaining_stock ?? null,
                item.quantity ?? null,
                item.unit || null,
                (item.is_low_stock || ((item.quantity ?? item.remaining_stock ?? 100) <= 10)) ? 1 : 0,
                item.roast_date || null,
                item.purchase_date || null,
                JSON.stringify(item.tags_json || []),
                item.icon || null,
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
        // Since we have multiple equipment categories (dripper, grinder, etc.), we might need a more flexible query or handle it in service.
        // For now, let's assume we pass the specific category or we handle multiple.
        // Actually, for onboarding, we want to clear ALL equipment, which might be spread across categories.
        // Let's make it accept an array of categories or just a single one. 
        // Simpler: Just delete by category.
        await this.db.run('UPDATE pantry_items SET deleted_at = ? WHERE category = ?', [now, category]);
        await dbService.saveToLocalStore();
    }

    async clearEquipment(): Promise<void> {
        const now = new Date().toISOString();
        // Equipment categories: dripper, grinder, kettle, scale, accessory
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

        const item = result.values[0];
        const currentQty = item.quantity ?? item.remaining_stock ?? 0;
        const newQty = Math.max(0, currentQty - amount);
        const now = new Date().toISOString();
        const isLowStock = newQty <= 10 ? 1 : 0;

        // Update quantity and also remaining_stock if it's percentage-based
        if (item.unit === '%') {
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
