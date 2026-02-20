import type { EntityId } from '../../../shared/domain/entities';

export type PantryCategory = 'beans' | 'milk' | 'syrup' | 'filter' | 'other' | 'dripper' | 'grinder' | 'kettle' | 'scale' | 'accessory';

export interface PantryItem {
    id: EntityId;
    name: string;
    category: PantryCategory;
    brand?: string;
    description?: string;
    remaining_stock?: number; // 0-100 percentage
    is_low_stock?: boolean;
    roast_date?: string; // ISO date string for beans
    purchase_date?: string; // ISO date string
    tags_json?: string[]; // JSON array of strings
    icon?: string; // Material icon name
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}
