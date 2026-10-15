export type EntityId = string; // TODO: migrate to branded type: string & { readonly __brand: unique symbol }

// Helper for future migration:
// export function toEntityId(id: string): EntityId { return id as EntityId; }

export interface BrewingMethod {
    id: EntityId;
    name: string;
    description?: string;
    icon?: string;
    category?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface BrewStep {
    id: EntityId;
    recipe_id: EntityId;
    step_order: number;
    label: string;
    duration_seconds: number;
    target_weight?: number;
    instruction?: string;
    created_at: string;
    updated_at: string;
}

export interface Recipe {
    id: EntityId;
    method_id: EntityId;
    name: string;
    ratio: string;
    grind_size?: string;
    temperature?: number;
    total_water?: number;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    style?: string;
    description_short?: string;
    description_detailed?: string;
    philosophy?: string;
    source?: string;
    best_for_tags?: string[];
    not_recommended_tags?: string[];
    is_custom: boolean;
    is_favorite?: boolean;
    steps: BrewStep[];
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface BrewLog {
    id: EntityId;
    recipe_id: EntityId;
    bean_id?: string;
    rating?: number;
    notes?: string;
    sweetness?: number;
    acidity?: number;
    body?: number;
    bitterness?: number;
    flavor_tags?: string;
    brewed_at: string;
    created_at: string;
}

export interface BrewLogWithRecipe extends BrewLog {
    recipe_name: string;
    method_id: string;
    ratio: string;
}

export type BrewLogFeedback = Partial<Pick<BrewLog, 'rating' | 'notes' | 'sweetness' | 'acidity' | 'body' | 'bitterness' | 'flavor_tags'>>;

export interface BrewStats {
    monthlyBrews: number;
    avgRating: number;
    todayBrews: number;
}

export type DrinkCategory = 'hot' | 'cold' | 'Hot' | 'Cold';
export type DrinkBaseType = 'coffee' | 'non_coffee';

export const GRIND_SIZE_OPTIONS = [
    { value: 'Fine', label: 'Fine' },
    { value: 'Medium-Fine', label: 'Medium-Fine' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Medium-Coarse', label: 'Medium-Coarse' },
    { value: 'Coarse', label: 'Coarse' },
] as const;

export interface DrinkIngredient {
    name: string;
    amount?: number;
    unit?: 'ml' | 'g' | 'shot' | 'pump' | 'tsp' | 'tbsp' | 'pcs' | 'cube';
    category?: 'beans' | 'milk' | 'syrup' | 'sugar' | 'other_ingredient';
    default_pantry_item_id?: string;
}

export interface Drink {
    id: EntityId;
    name: string;
    category: DrinkCategory;
    base_type?: DrinkBaseType;
    is_favorite?: boolean;
    base_recipe_id?: string;
    ingredients_json: string;
    instructions_json: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface DrinkLog {
    id: EntityId;
    drink_id: EntityId;
    drink_name?: string;
    bean_id?: string;
    milk_id?: string;
    recipe_id?: string;
    ingredients_snapshot_json?: string;
    rating?: number;
    sweetness?: number;
    coffee_strength?: number;
    creaminess?: number;
    flavor_tags?: string;
    notes?: string;
    logged_at: string;
    created_at: string;
}

export interface DrinkLogWithDrink extends DrinkLog {
    drink_name: string;
    category: DrinkCategory;
    bean_name?: string;
    milk_name?: string;
    recipe_name?: string;
}

export interface DrinkStats {
    weeklyDrinks: number;
    monthlyDrinks: number;
    avgRating: number;
    uniqueDrinks: number;
}

export interface AppSetting {
    key: string;
    value: string;
}