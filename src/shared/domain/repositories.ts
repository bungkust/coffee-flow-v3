import type {
    Recipe,
    BrewLog,
    Drink,
    DrinkLog,
    EntityId,
    BrewLogWithRecipe,
    BrewStats,
    DrinkLogWithDrink,
    DrinkStats
} from './entities';

export interface IRecipeRepository {
    findAll(): Promise<Recipe[]>;
    findById(id: EntityId): Promise<Recipe | null>;
    save(recipe: Recipe): Promise<void>;
    delete(id: EntityId): Promise<void>;
}

export interface IBrewLogRepository {
    findAll(): Promise<BrewLog[]>;
    findAllByRecipeId(recipeId: EntityId): Promise<BrewLog[]>;
    save(log: BrewLog): Promise<void>;
    update(log: BrewLog): Promise<void>;
    delete(id: EntityId): Promise<void>;
    findByIdWithRecipe(id: EntityId): Promise<BrewLogWithRecipe | null>;
    getStats(): Promise<BrewStats>;
    getRecentWithRecipes(limit?: number): Promise<BrewLogWithRecipe[]>;
    getRecentWithRecipesAll(): Promise<BrewLogWithRecipe[]>;
}

export interface IDrinkRepository {
    findAll(): Promise<Drink[]>;
    findById(id: EntityId): Promise<Drink | null>;
    save(drink: Drink): Promise<void>;
    delete(id: EntityId): Promise<void>;
}

export interface IDrinkLogRepository {
    findAll(): Promise<DrinkLog[]>;
    findAllByDrinkId(drinkId: EntityId): Promise<DrinkLog[]>;
    save(log: DrinkLog): Promise<void>;
    update(log: DrinkLog): Promise<void>;
    delete(id: EntityId): Promise<void>;
    findByIdWithDrink(id: EntityId): Promise<DrinkLogWithDrink | null>;
    getStats(): Promise<DrinkStats>;
    getRecentWithDrinks(): Promise<DrinkLogWithDrink[]>;
}
