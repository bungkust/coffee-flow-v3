import type { IRecipeRepository } from '../../../shared/domain/repositories';
import type { Recipe, EntityId, BrewStep } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

interface RecipeRow {
    id: string;
    method_id: string;
    name: string;
    ratio: string;
    grind_size: string | null;
    temperature: number | null;
    total_water: number | null;
    is_custom: number;
    is_favorite: number;
    difficulty: string | null;
    style: string | null;
    description_short: string | null;
    description_detailed: string | null;
    philosophy: string | null;
    best_for_tags: string | null;
    not_recommended_tags: string | null;
    version: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

interface StepRow {
    id: string;
    recipe_id: string;
    step_order: number;
    label: string;
    duration_seconds: number;
    target_weight: number | null;
    instruction: string | null;
    created_at: string;
    updated_at: string;
}

function toDomainRecipe(row: RecipeRow, steps: BrewStep[]): Recipe {
    return {
        id: row.id,
        method_id: row.method_id,
        name: row.name,
        ratio: row.ratio,
        grind_size: row.grind_size ?? undefined,
        temperature: row.temperature ?? undefined,
        total_water: row.total_water ?? undefined,
        is_custom: row.is_custom === 1,
        is_favorite: row.is_favorite === 1,
        difficulty: row.difficulty as Recipe['difficulty'],
        style: row.style ?? undefined,
        description_short: row.description_short ?? undefined,
        description_detailed: row.description_detailed ?? undefined,
        philosophy: row.philosophy ?? undefined,
        best_for_tags: row.best_for_tags ? JSON.parse(row.best_for_tags) : [],
        not_recommended_tags: row.not_recommended_tags ? JSON.parse(row.not_recommended_tags) : [],
        version: row.version,
        steps,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at ?? undefined,
    };
}

function toDomainStep(row: StepRow): BrewStep {
    return {
        id: row.id,
        recipe_id: row.recipe_id,
        step_order: row.step_order,
        label: row.label,
        duration_seconds: row.duration_seconds,
        target_weight: row.target_weight ?? undefined,
        instruction: row.instruction ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export class SQLiteRecipeRepository implements IRecipeRepository {
    private get db() {
        return dbService.getDb();
    }

    private get dbService() {
        return dbService;
    }

    async findAll(): Promise<Recipe[]> {
        const result = await this.db.query('SELECT * FROM recipes WHERE deleted_at IS NULL');
        const recipes: Recipe[] = [];

        for (const row of (result.values || []) as RecipeRow[]) {
            const stepsResult = await this.db.query(
                'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order ASC',
                [row.id]
            );

            const steps = (stepsResult.values || []).map(toDomainStep);
            recipes.push(toDomainRecipe(row, steps));
        }

        return recipes;
    }

    async findById(id: EntityId): Promise<Recipe | null> {
        const result = await this.db.query('SELECT * FROM recipes WHERE id = ? AND deleted_at IS NULL', [id]);
        const row = result.values?.[0] as RecipeRow | undefined;

        if (!row) return null;

        const stepsResult = await this.db.query(
            'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order ASC',
            [id]
        );

        const steps = (stepsResult.values || []).map(toDomainStep);
        return toDomainRecipe(row, steps);
    }

    async save(recipe: Recipe): Promise<void> {
        const now = new Date().toISOString();

        await this.db.run(
            `INSERT OR REPLACE INTO recipes 
      (id, method_id, name, ratio, grind_size, temperature, total_water, is_custom, is_favorite, difficulty, style, description_short, description_detailed, philosophy, best_for_tags, not_recommended_tags, version, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                recipe.id,
                recipe.method_id,
                recipe.name,
                recipe.ratio,
                recipe.grind_size ?? null,
                recipe.temperature ?? null,
                recipe.total_water ?? null,
                recipe.is_custom ? 1 : 0,
                recipe.is_favorite ? 1 : 0,
                recipe.difficulty ?? null,
                recipe.style ?? null,
                recipe.description_short ?? null,
                recipe.description_detailed ?? null,
                recipe.philosophy ?? null,
                JSON.stringify(recipe.best_for_tags || []),
                JSON.stringify(recipe.not_recommended_tags || []),
                recipe.version || 1,
                recipe.created_at || now,
                now
            ]
        );

        await this.db.run('DELETE FROM recipe_steps WHERE recipe_id = ?', [recipe.id]);

        for (const step of recipe.steps) {
            await this.db.run(
                `INSERT INTO recipe_steps (id, recipe_id, step_order, label, duration_seconds, target_weight, instruction, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    step.id || crypto.randomUUID(),
                    recipe.id,
                    step.step_order,
                    step.label,
                    step.duration_seconds,
                    step.target_weight ?? null,
                    step.instruction ?? null,
                    step.created_at || now,
                    now
                ]
            );
        }

        await this.dbService.saveToLocalStore();
    }

    async delete(id: EntityId): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run('UPDATE recipes SET deleted_at = ? WHERE id = ?', [now, id]);
        await this.dbService.saveToLocalStore();
    }
}