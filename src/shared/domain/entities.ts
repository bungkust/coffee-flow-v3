export type EntityId = string;

export interface BrewingMethod {
    id: EntityId;
    name: string;
    description?: string;
    icon?: string;
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
    best_for_tags?: string[]; // JSON array in DB
    not_recommended_tags?: string[]; // JSON array in DB
    is_custom: boolean;
    is_favorite?: boolean;
    version: number;
    steps: BrewStep[];
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface BrewLog {
    id: EntityId;
    recipe_id: EntityId;
    bean_id?: string;
    rating?: number; // 1-5
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

export interface BrewStats {
    weeklyBrews: number;
    monthlyBrews: number;
    avgRating: number;
    beansCount: number;
}

export type DrinkCategory = 'hot' | 'cold';

export interface Drink {
    id: EntityId;
    name: string;
    category: DrinkCategory;
    ingredients_json: string;
    instructions_json: string;
    version: number;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface DrinkLog {
    id: EntityId;
    drink_id: EntityId;
    rating?: number;
    notes?: string;
    logged_at: string;
    created_at: string;
}

export interface DrinkLogWithDrink extends DrinkLog {
    drink_name: string;
    category: DrinkCategory;
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
    updated_at: string;
}
