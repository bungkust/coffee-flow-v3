import type { Recipe, BrewLog, Drink, DrinkLog, EntityId } from './entities';

export interface IRecipeRepository {
    findAll(): Promise<Recipe[]>;
    findById(id: EntityId): Promise<Recipe | null>;
    save(recipe: Recipe): Promise<void>;
    delete(id: EntityId): Promise<void>;
}

export interface IBrewLogRepository {
    findAllByRecipeId(recipeId: EntityId): Promise<BrewLog[]>;
    save(log: BrewLog): Promise<void>;
    getStats(): Promise<any>;
    getRecentWithRecipes(limit?: number): Promise<any[]>;
}

export interface IDrinkRepository {
    findAll(): Promise<Drink[]>;
    findById(id: EntityId): Promise<Drink | null>;
    save(drink: Drink): Promise<void>;
    delete(id: EntityId): Promise<void>;
}

export interface IDrinkLogRepository {
    findAllByDrinkId(drinkId: EntityId): Promise<DrinkLog[]>;
    save(log: DrinkLog): Promise<void>;
}
