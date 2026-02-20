import { brewService } from '../services';
import { dbService } from './sqlite';
import type { Recipe } from '../../shared/domain/entities';

export const seedInitialData = async () => {
    // Check if recipes exist
    const recipes = await brewService.getAllRecipes();
    if (recipes.length === 0) {
        console.log('Seeding initial recipes and methods...');

        const now = "2026-01-30T10:30:00Z";
        const db = dbService.getDb();

        // 1. Ensure V60 method exists to satisfy foreign key constraint
        await db.run(
            `INSERT OR IGNORE INTO brewing_methods (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
            ['V60', 'V60 Pour Over', 'Iconic cone-shaped dripper.', now, now]
        );

        const defaultRecipe: Recipe = {
            id: "v60-even-extraction-flow",
            method_id: "V60",
            name: "Even Extraction Flow",
            difficulty: "Intermediate",
            style: "Balanced / Round",
            description_short: "Balanced V60 recipe with controlled agitation for even extraction.",
            description_detailed: "Even Extraction Flow reduces channeling by combining light stirring, steady pours, and settling phases, producing a round and consistent cup.",
            philosophy: "Intentional agitation followed by rest promotes uniform extraction without harshness.",
            best_for_tags: ["Arabica", "Light", "Medium", "Washed", "Honey"],
            not_recommended_tags: ["Dark Roast", "100% Robusta"],
            ratio: "1:16",
            temperature: 93,
            grind_size: "Medium-Fine",
            total_water: 288,
            is_custom: false, // Default recipe
            is_favorite: false,
            version: 1,
            created_at: now,
            updated_at: now,
            steps: [
                {
                    id: crypto.randomUUID(),
                    recipe_id: "v60-even-extraction-flow",
                    step_order: 1,
                    label: "Bloom",
                    target_weight: 45,
                    duration_seconds: 30,
                    instruction: "Pour 45 ml evenly to fully saturate the coffee bed.",
                    created_at: now,
                    updated_at: now
                },
                {
                    id: crypto.randomUUID(),
                    recipe_id: "v60-even-extraction-flow",
                    step_order: 2,
                    label: "Stir",
                    duration_seconds: 5,
                    instruction: "Stir gently 2–3 times to ensure all grounds are evenly wetted.",
                    created_at: now,
                    updated_at: now
                },
                {
                    id: crypto.randomUUID(),
                    recipe_id: "v60-even-extraction-flow",
                    step_order: 3,
                    label: "Wait",
                    duration_seconds: 15,
                    instruction: "Allow the slurry to settle slightly before continuing.",
                    created_at: now,
                    updated_at: now
                },
                {
                    id: crypto.randomUUID(),
                    recipe_id: "v60-even-extraction-flow",
                    step_order: 4,
                    label: "Pour",
                    target_weight: 165,
                    duration_seconds: 35,
                    instruction: "Pour steadily in slow circular motions to reach 165 ml.",
                    created_at: now,
                    updated_at: now
                },
                {
                    id: crypto.randomUUID(),
                    recipe_id: "v60-even-extraction-flow",
                    step_order: 5,
                    label: "Wait",
                    duration_seconds: 15,
                    instruction: "Let the water draw down slightly.",
                    created_at: now,
                    updated_at: now
                },
                {
                    id: crypto.randomUUID(),
                    recipe_id: "v60-even-extraction-flow",
                    step_order: 6,
                    label: "Pour",
                    target_weight: 288,
                    duration_seconds: 40,
                    instruction: "Finish pouring to 288 ml with a steady flow.",
                    created_at: now,
                    updated_at: now
                },
                {
                    id: crypto.randomUUID(),
                    recipe_id: "v60-even-extraction-flow",
                    step_order: 7,
                    label: "Swirl",
                    duration_seconds: 5,
                    instruction: "Gently swirl the dripper to level the coffee bed.",
                    created_at: now,
                    updated_at: now
                },
                {
                    id: crypto.randomUUID(),
                    recipe_id: "v60-even-extraction-flow",
                    step_order: 8,
                    label: "Wait",
                    duration_seconds: 45,
                    instruction: "Allow the brew to finish naturally. Adjust grind size if total brew time is off target.",
                    created_at: now,
                    updated_at: now
                }
            ]
        };

        await brewService.saveRecipe(defaultRecipe);
        console.log('Seeded Even Extraction Flow recipe.');
    }
};

let isRemovingDummyItems = false;

export const removeDummyPantryItems = async () => {
    if (isRemovingDummyItems) return;
    isRemovingDummyItems = true;
    try {
        const db = dbService.getDb();
        const dummyNames = [
            'Ethiopia Yirgacheffe', 'Holiday Blend', 'Oatly Barista Edition',
            'Hario V60 Size 02', 'Demerara Sugar', 'Hario V60', 'Chemex',
            'Fellow Ode', 'Fellow Stagg EKG'
        ];

        // Use placeholders to prevent SQL injection and properly match strings
        const placeholders = dummyNames.map(() => '?').join(',');
        const query = `DELETE FROM pantry_items WHERE name IN (${placeholders})`;
        await db.run(query, dummyNames);
        console.log('Dummy pantry items removed successfully.');
    } catch (error) {
        console.error('Failed to remove dummy pantry items:', error);
    } finally {
        isRemovingDummyItems = false;
    }
};

