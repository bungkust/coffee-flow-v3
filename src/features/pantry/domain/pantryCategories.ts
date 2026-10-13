import type { PantryCategory } from './entities';

export interface PantryCategoryMeta {
    name: string;
    icon: string;
    desc: string;
    isGear: boolean;
    defaultUnit: 'g' | 'ml' | 'pcs';
}

export const PANTRY_CATEGORY_MAP: Record<PantryCategory, PantryCategoryMeta> = {
    beans: { name: 'Coffee Beans', icon: 'coffee', desc: 'Single origins and blends', isGear: false, defaultUnit: 'g' },
    filter: { name: 'Filters', icon: 'filter_list', desc: 'Paper, cloth, or metal filters', isGear: false, defaultUnit: 'pcs' },
    milk: { name: 'Milk / Dairy', icon: 'water_drop', desc: 'Dairy and plant-based milks', isGear: false, defaultUnit: 'ml' },
    syrup: { name: 'Syrup & Flavoring', icon: 'liquor', desc: 'Vanilla, caramel, etc.', isGear: false, defaultUnit: 'ml' },
    sugar: { name: 'Sugar & Sweeteners', icon: 'cookie', desc: 'Raw sugar, stevia, etc.', isGear: false, defaultUnit: 'g' },
    other: { name: 'Other', icon: 'inventory_2', desc: 'Miscellaneous supplies', isGear: false, defaultUnit: 'g' },
    other_ingredient: { name: 'Other Ingredient', icon: 'blender', desc: 'Matcha, cocoa powder, etc.', isGear: false, defaultUnit: 'g' },
    machine: { name: 'Espresso Machine', icon: 'coffee_maker', desc: 'Manual or semi-auto machines', isGear: true, defaultUnit: 'g' },
    dripper: { name: 'Dripper', icon: 'filter_alt', desc: 'V60, Kalita, Chemex', isGear: true, defaultUnit: 'g' },
    french_press: { name: 'French Press', icon: 'coffee', desc: 'Immersion brewers', isGear: true, defaultUnit: 'g' },
    aeropress: { name: 'AeroPress', icon: 'compress', desc: 'Pressure brewers', isGear: true, defaultUnit: 'g' },
    grinder: { name: 'Grinder', icon: 'settings', desc: 'Manual and electric grinders', isGear: true, defaultUnit: 'g' },
    scale: { name: 'Scale', icon: 'scale', desc: 'Coffee scales', isGear: true, defaultUnit: 'g' },
    kettle: { name: 'Kettle', icon: 'kettle', desc: 'Gooseneck & regular kettles', isGear: true, defaultUnit: 'g' },
    accessory: { name: 'Accessory', icon: 'build', desc: 'WDT, tampers, carafes', isGear: true, defaultUnit: 'g' },
};

export const SUPPLIES_CATEGORIES = Object.entries(PANTRY_CATEGORY_MAP)
    .filter(([, meta]) => !meta.isGear)
    .map(([id, meta]) => ({ id: id as PantryCategory, ...meta }));

export const GEAR_CATEGORIES = Object.entries(PANTRY_CATEGORY_MAP)
    .filter(([, meta]) => meta.isGear)
    .map(([id, meta]) => ({ id: id as PantryCategory, ...meta }));

export const isPantryCategory = (value: string | undefined): value is PantryCategory =>
    !!value && value in PANTRY_CATEGORY_MAP;
