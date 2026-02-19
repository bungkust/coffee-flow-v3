import type { IRecipeRepository } from '../../../shared/domain/repositories';
import type { Recipe, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

export class SQLiteRecipeRepository implements IRecipeRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<Recipe[]> {
        const result = await this.db.query('SELECT * FROM recipes WHERE deleted_at IS NULL');
        const recipes: Recipe[] = [];

        for (const row of (result.values || [])) {
            const stepsResult = await this.db.query(
                'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order ASC',
                [row.id]
            );

            recipes.push({
                ...row,
                is_custom: row.is_custom === 1,
                is_favorite: row.is_favorite === 1,
                steps: stepsResult.values || []
            });
        }

        return recipes;
    }

    async findById(id: EntityId): Promise<Recipe | null> {
        const result = await this.db.query('SELECT * FROM recipes WHERE id = ? AND deleted_at IS NULL', [id]);
        const row = result.values?.[0];

        if (!row) return null;

        const stepsResult = await this.db.query(
            'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order ASC',
            [id]
        );

        return {
            ...row,
            is_custom: row.is_custom === 1,
            is_favorite: row.is_favorite === 1,
            steps: stepsResult.values || []
        };
    }

    async save(recipe: Recipe): Promise<void> {
        const now = new Date().toISOString();

        await this.db.run(
            `INSERT OR REPLACE INTO recipes 
      (id, method_id, name, ratio, grind_size, temperature, total_water, is_custom, is_favorite, version, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                recipe.id,
                recipe.method_id,
                recipe.name,
                recipe.ratio,
                recipe.grind_size,
                recipe.temperature,
                recipe.total_water,
                recipe.is_custom ? 1 : 0,
                recipe.is_favorite ? 1 : 0,
                recipe.version || 1,
                recipe.created_at || now,
                now
            ]
        );

        // Update steps
        await this.db.run('DELETE FROM recipe_steps WHERE recipe_id = ?', [recipe.id]);
        for (const step of recipe.steps) {
            await this.db.run(
                `INSERT INTO recipe_steps (id, recipe_id, step_order, label, duration_seconds, target_weight, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    step.id || crypto.randomUUID(),
                    recipe.id,
                    step.step_order,
                    step.label,
                    step.duration_seconds,
                    step.target_weight,
                    step.created_at || now,
                    now
                ]
            );
        }
    }

    async delete(id: EntityId): Promise<void> {
        const now = new Date().toISOString();
        // Soft delete
        await this.db.run('UPDATE recipes SET deleted_at = ? WHERE id = ?', [now, id]);
    }
}
