import type { Recipe, BrewLog, BrewLogWithRecipe, BrewStats, BrewingMethod, EntityId } from '../../../shared/domain/entities';
import type { PantryService } from '../../pantry/application/PantryService';
import { SQLiteRecipeRepository } from '../infrastructure/SQLiteRecipeRepository';
import { SQLiteBrewLogRepository } from '../infrastructure/SQLiteBrewLogRepository';
import { SQLiteBrewingMethodRepository } from '../infrastructure/SQLiteBrewingMethodRepository';

export class BrewService {
    private recipeRepo: SQLiteRecipeRepository;
    private logRepo: SQLiteBrewLogRepository;
    private brewingMethodRepo: SQLiteBrewingMethodRepository;
    private pantryService: PantryService;

    constructor(
        recipeRepo: SQLiteRecipeRepository,
        logRepo: SQLiteBrewLogRepository,
        brewingMethodRepo: SQLiteBrewingMethodRepository,
        pantryService: PantryService
    ) {
        this.recipeRepo = recipeRepo;
        this.logRepo = logRepo;
        this.brewingMethodRepo = brewingMethodRepo;
        this.pantryService = pantryService;
    }

    async getAllMethods(): Promise<BrewingMethod[]> {
        return this.brewingMethodRepo.getAllMethods();
    }

    async getAllRecipes(): Promise<Recipe[]> {
        return this.recipeRepo.findAll();
    }

    async getRecipe(id: EntityId): Promise<Recipe | null> {
        return this.recipeRepo.findById(id);
    }

    async saveRecipe(recipe: Recipe): Promise<void> {
        await this.recipeRepo.save(recipe);
    }

    async logBrew(
        recipeId: EntityId,
        rating: number,
        notes: string,
        profile: { sweetness: number, acidity: number, body: number, bitterness: number },
        flavorTags: string[],
        beanId?: string,
        filterId?: string,
        coffeeConsumed?: number
    ): Promise<string> {
        const logId = crypto.randomUUID();
        const log: BrewLog = {
            id: logId,
            recipe_id: recipeId,
            bean_id: beanId,
            rating,
            notes,
            sweetness: profile.sweetness,
            acidity: profile.acidity,
            body: profile.body,
            bitterness: profile.bitterness,
            flavor_tags: flavorTags.join(','),
            brewed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        await this.logRepo.save(log);

        // Deduct bean stock
        if (beanId && coffeeConsumed && Number.isFinite(coffeeConsumed) && coffeeConsumed > 0) {
            await this.pantryService.deductStock(beanId, coffeeConsumed);
        }

        // Deduct filter stock (always 1 for filter-based methods)
        if (filterId) {
            await this.pantryService.deductStock(filterId, 1);
        }

        return logId;
    }

    async getDashboardStats(): Promise<BrewStats> {
        return this.logRepo.getStats();
    }

    async getRecentBrews(limit?: number): Promise<BrewLogWithRecipe[]> {
        return this.logRepo.getRecentWithRecipes(limit);
    }

    async getAllLogs(): Promise<BrewLogWithRecipe[]> {
        return this.logRepo.getRecentWithRecipesAll();
    }

    async getLog(id: EntityId): Promise<BrewLogWithRecipe | null> {
        return this.logRepo.findByIdWithRecipe(id);
    }

    async updateLog(log: BrewLog): Promise<void> {
        await this.logRepo.update(log);
    }

    async deleteLog(id: EntityId): Promise<void> {
        await this.logRepo.delete(id);
    }

    async deleteRecipe(id: EntityId): Promise<void> {
        await this.recipeRepo.delete(id);
    }

    async cloneRecipe(id: EntityId): Promise<void> {
        const original = await this.recipeRepo.findById(id);
        if (!original) throw new Error('Recipe not found');

        const clone: Recipe = {
            ...original,
            id: crypto.randomUUID(),
            name: `${original.name} (Copy)`,
            is_custom: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            best_for_tags: original.best_for_tags ? [...original.best_for_tags] : [],
            not_recommended_tags: original.not_recommended_tags ? [...original.not_recommended_tags] : [],
            steps: original.steps.map(s => ({
                ...s,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }))
        };

        await this.recipeRepo.save(clone);
    }

    async toggleFavorite(id: EntityId): Promise<void> {
        const recipe = await this.recipeRepo.findById(id);
        if (!recipe) throw new Error('Recipe not found');

        const updatedRecipe = {
            ...recipe,
            is_favorite: !recipe.is_favorite,
            updated_at: new Date().toISOString()
        };

        await this.recipeRepo.save(updatedRecipe);
    }
}
