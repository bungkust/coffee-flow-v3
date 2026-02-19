import type { IRecipeRepository, IBrewLogRepository } from '../../../shared/domain/repositories';
import type { Recipe, BrewLog, EntityId } from '../../../shared/domain/entities';

export class BrewService {
    private recipeRepo: IRecipeRepository;
    private logRepo: IBrewLogRepository;

    constructor(
        recipeRepo: IRecipeRepository,
        logRepo: IBrewLogRepository
    ) {
        this.recipeRepo = recipeRepo;
        this.logRepo = logRepo;
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
        flavorTags: string[]
    ): Promise<void> {
        const log: BrewLog = {
            id: crypto.randomUUID(),
            recipe_id: recipeId,
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
    }

    async getDashboardStats() {
        return this.logRepo.getStats();
    }

    async getRecentBrews(limit?: number) {
        return this.logRepo.getRecentWithRecipes(limit);
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
