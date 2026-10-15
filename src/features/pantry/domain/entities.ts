import type { EntityId } from '../../../shared/domain/entities';

export type PantryCategory =
    | 'beans'
    | 'milk'
    | 'syrup'
    | 'sugar'
    | 'filter'
    | 'other'
    | 'other_ingredient'
    | 'machine'
    | 'dripper'
    | 'french_press'
    | 'aeropress'
    | 'grinder'
    | 'kettle'
    | 'scale'
    | 'accessory';

export interface PantryItem {
    id: EntityId;
    name: string;
    category: PantryCategory;
    brand?: string;
    description?: string;
    quantity?: number; // Universal numerical amount
    unit?: 'g' | 'ml' | 'pcs' | '%'; // Type of measurement
    is_low_stock?: boolean; // Derived from quantity + unit
    roast_date?: string; // ISO date string for beans
    purchase_date?: string; // ISO date string
    tags_json?: string[]; // JSON array of strings
    icon?: string; // Material icon name
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export type PantryLogAction = 'brew' | 'drink' | 'restock' | 'adjustment' | 'waste';

export interface PantryLog {
    id: EntityId;
    pantry_item_id: EntityId;
    change_amount: number;
    unit?: string;
    action_type: PantryLogAction;
    reference_id?: string;
    reference_name?: string;
    notes?: string;
    created_at: string;
}
