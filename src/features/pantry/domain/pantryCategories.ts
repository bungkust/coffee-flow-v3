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

// Category specific select options
export const FILTER_SHAPE_OPTIONS = [
    { value: 'Cone 01', label: 'Cone 01 (1 Cup)' },
    { value: 'Cone 02', label: 'Cone 02 (1-4 Cups)' },
    { value: 'Cone 03', label: 'Cone 03 (1-6 Cups)' },
    { value: 'Flat 155', label: 'Flat Wave 155 (1-2 Cups)' },
    { value: 'Flat 185', label: 'Flat Wave 185 (2-4 Cups)' },
    { value: 'Aeropress', label: 'AeroPress Circular' },
    { value: 'Trapezoid 101/102', label: 'Trapezoid / Fan (101/102)' },
    { value: 'Basket', label: 'Basket / Chemex' },
    { value: 'Cold Brew Bag', label: 'Cold Brew Bag' },
    { value: 'Other', label: 'Other Filter' },
];

export const FILTER_MATERIAL_OPTIONS = [
    { value: 'White Paper', label: 'Bleached Paper (White)' },
    { value: 'Brown Paper', label: 'Unbleached Paper (Brown)' },
    { value: 'Bamboo Paper', label: 'Bamboo Paper' },
    { value: 'Abaca Fiber', label: 'Abaca Fiber' },
    { value: 'Cloth / Nel', label: 'Cloth / Nel' },
    { value: 'Stainless Steel Mesh', label: 'Stainless Steel Mesh' },
];

export const MILK_TYPE_OPTIONS = [
    { value: 'Fresh Milk', label: 'Fresh Milk (Pasteurized)' },
    { value: 'Whole Milk', label: 'Whole Milk (UHT)' },
    { value: 'Oat Milk', label: 'Oat Milk (Barista Edition)' },
    { value: 'Almond Milk', label: 'Almond Milk' },
    { value: 'Soy Milk', label: 'Soy Milk' },
    { value: 'Skimmed Milk', label: 'Low Fat / Skimmed Milk' },
    { value: 'Coconut Milk', label: 'Coconut Milk' },
    { value: 'Condensed Milk', label: 'Condensed Milk (SKM)' },
    { value: 'Evaporated Milk', label: 'Evaporated Milk' },
];

export const SYRUP_FLAVOR_OPTIONS = [
    { value: 'Vanilla', label: 'Vanilla' },
    { value: 'Caramel', label: 'Caramel' },
    { value: 'Hazelnut', label: 'Hazelnut' },
    { value: 'Salted Caramel', label: 'Salted Caramel' },
    { value: 'Pandan', label: 'Pandan' },
    { value: 'Aren / Brown Sugar', label: 'Gula Aren / Brown Sugar' },
    { value: 'Roasted Almond', label: 'Roasted Almond' },
    { value: 'Simple Syrup', label: 'Simple Syrup' },
    { value: 'Chocolate / Mocha', label: 'Chocolate / Mocha' },
    { value: 'Cinnamon', label: 'Cinnamon' },
];

export const SUGAR_TYPE_OPTIONS = [
    { value: 'White Cane Sugar', label: 'White Cane Sugar' },
    { value: 'Brown Sugar', label: 'Brown Sugar' },
    { value: 'Palm Sugar / Aren', label: 'Palm Sugar (Gula Aren)' },
    { value: 'Honey', label: 'Honey' },
    { value: 'Stevia / Zero Calorie', label: 'Stevia / Zero Calorie' },
    { value: 'Simple Liquid Sugar', label: 'Simple Liquid Sugar' },
];

export const OTHER_INGREDIENT_OPTIONS = [
    { value: 'Matcha Powder', label: 'Matcha Powder' },
    { value: 'Cocoa / Chocolate Powder', label: 'Cocoa / Chocolate Powder' },
    { value: 'Chai Tea / Spices', label: 'Chai Tea / Spices' },
    { value: 'Cinnamon Powder', label: 'Cinnamon Powder' },
    { value: 'Hojicha Powder', label: 'Hojicha Powder' },
];

export const DRIPPER_SHAPE_OPTIONS = [
    { value: 'Cone (V60)', label: 'Cone (e.g. V60)' },
    { value: 'Flat Bottom (Kalita)', label: 'Flat Bottom (e.g. Kalita)' },
    { value: 'Trapezoid (Melitta)', label: 'Trapezoid (e.g. Melitta / Kalita 102)' },
    { value: 'Immersion Hybrid', label: 'Immersion Hybrid (e.g. Switch / Clever)' },
];

export const GEAR_MATERIAL_OPTIONS = [
    { value: 'Ceramic', label: 'Ceramic' },
    { value: 'Glass', label: 'Heat-resistant Glass' },
    { value: 'Plastic / Resin', label: 'Plastic / Resin (BPA Free)' },
    { value: 'Stainless Steel', label: 'Stainless Steel' },
    { value: 'Copper', label: 'Copper / Brass' },
    { value: 'Aluminum', label: 'Aluminum' },
    { value: 'Silicone', label: 'Silicone' },
];

export const GRINDER_BURR_OPTIONS = [
    { value: 'Conical Burrs', label: 'Conical Burrs' },
    { value: 'Flat Burrs', label: 'Flat Burrs' },
    { value: 'Ghost Tooth Burrs', label: 'Ghost Tooth Burrs' },
    { value: 'Blade', label: 'Blade' },
];

export const GRINDER_DRIVE_OPTIONS = [
    { value: 'Manual Hand Grinder', label: 'Manual (Hand Grinder)' },
    { value: 'Electric Grinder', label: 'Electric Grinder' },
];

export const KETTLE_TYPE_OPTIONS = [
    { value: 'Electric Variable Temp Gooseneck', label: 'Electric Variable Temp Gooseneck' },
    { value: 'Stovetop Gooseneck', label: 'Stovetop Gooseneck' },
    { value: 'Standard Kettle', label: 'Standard Kettle' },
];

export const MACHINE_TYPE_OPTIONS = [
    { value: 'Manual Lever', label: 'Manual Lever (e.g. Flair / Robot)' },
    { value: 'Single Boiler', label: 'Single Boiler' },
    { value: 'Dual Boiler', label: 'Dual Boiler' },
    { value: 'Heat Exchanger (HX)', label: 'Heat Exchanger (HX)' },
    { value: 'Thermoblock', label: 'Thermoblock' },
    { value: 'Capsule / Pod', label: 'Capsule / Pod Machine' },
];

export interface CategoryAttributes {
    shape?: string;
    material?: string;
    type?: string;
    flavor?: string;
    burr?: string;
    drive?: string;
    spec?: string;
}

export const parseCategoryAttributes = (tags: string[] = []): { attrs: CategoryAttributes; preserved: string[] } => {
    const attrs: CategoryAttributes = {};
    const preserved: string[] = [];

    for (const tag of tags) {
        const match = tag.match(/^([a-z_]+):(.*)$/i);
        if (match) {
            const key = match[1].toLowerCase();
            const val = match[2].trim();
            if (['shape', 'material', 'type', 'flavor', 'burr', 'drive', 'spec'].includes(key)) {
                attrs[key as keyof CategoryAttributes] = val;
                continue;
            }
        }
        preserved.push(tag);
    }
    return { attrs, preserved };
};

export const formatCategoryAttributes = (attrs: CategoryAttributes, extraTags: string[] = []): string[] => {
    const formatted = Object.entries(attrs)
        .filter(([, v]) => typeof v === 'string' && v.trim())
        .map(([k, v]) => `${k}:${v!.trim()}`);
    return Array.from(new Set([...formatted, ...extraTags]));
};
