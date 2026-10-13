import { brewService } from '../services';
import { dbService } from './sqlite';
import { BREWING_METHOD_SEEDS, RECIPE_SEEDS } from './recipeSeeds';

export const seedInitialData = async () => {
    const db = dbService.getDb();

    // Ensure category column exists in brewing_methods before seeding
    try {
        const cols = await db.query("PRAGMA table_info(brewing_methods)");
        const hasCategory = cols.values?.some((c: { name: string }) => c.name === 'category');
        if (!hasCategory) {
            await db.execute("ALTER TABLE brewing_methods ADD COLUMN category TEXT;");
        }
    } catch (e) {
        console.warn("Category column check failed, proceeding with seeding:", e);
    }

    // IGNORE, not REPLACE: REPLACE would cascade-delete user recipes (recipes.method_id).
    for (const method of BREWING_METHOD_SEEDS) {
        await db.run(
            `INSERT OR IGNORE INTO brewing_methods (id, name, description, icon, category, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [method.id, method.name, method.description, method.icon, method.category || 'Other', method.created_at, method.updated_at]
        );
    }

    // Always ensure built-in seed recipes have updated steps & instructions
    for (const seedRecipe of RECIPE_SEEDS) {
        if (!seedRecipe.is_custom) {
            await brewService.saveRecipe(seedRecipe);
        }
    }

    await seedDrinks();
    await removeDummyPantryItems();
    await dbService.saveToLocalStore();
};

const seedDrinks = async () => {
    const db = dbService.getDb();
    const existing = await db.query('SELECT COUNT(*) as count FROM drinks WHERE deleted_at IS NULL');
    if ((existing.values?.[0]?.count || 0) > 0) return;

    const now = new Date().toISOString();
    const drinks = [
        {
            id: 'espresso',
            name: 'Espresso',
            category: 'hot',
            ingredients: ['18g finely ground coffee', '36g espresso yield'],
            instructions: ['Dose and tamp coffee evenly.', 'Pull a 25-30 second shot.', 'Serve immediately.']
        },
        {
            id: 'cappuccino',
            name: 'Cappuccino',
            category: 'hot',
            ingredients: ['1 espresso shot', '120ml steamed milk', 'Milk foam'],
            instructions: ['Pull espresso.', 'Steam milk with dense foam.', 'Pour milk and finish with foam.']
        },
        {
            id: 'latte',
            name: 'Latte',
            category: 'hot',
            ingredients: ['1 espresso shot', '180ml steamed milk'],
            instructions: ['Pull espresso.', 'Steam milk to silky texture.', 'Pour slowly into cup.']
        },
        {
            id: 'flat_white',
            name: 'Flat White',
            category: 'hot',
            ingredients: ['Double espresso', '150ml microfoam milk'],
            instructions: ['Pull a double espresso.', 'Steam fine microfoam.', 'Pour with a thin foam layer.']
        },
        {
            id: 'mocha',
            name: 'Mocha',
            category: 'hot',
            ingredients: ['1 espresso shot', 'Chocolate', '150ml steamed milk'],
            instructions: ['Mix chocolate with espresso.', 'Steam milk.', 'Pour and stir gently.']
        },
        {
            id: 'cold_brew',
            name: 'Cold Brew',
            category: 'cold',
            ingredients: ['80g coarse coffee', '800ml cold water'],
            instructions: ['Combine coffee and water.', 'Steep 12 hours.', 'Filter and serve over ice.']
        },
        {
            id: 'americano',
            name: 'Americano',
            category: 'hot',
            ingredients: ['1 espresso shot', '120ml hot water'],
            instructions: ['Add hot water to cup.', 'Pull espresso over water.', 'Serve.']
        },
        {
            id: 'macchiato',
            name: 'Macchiato',
            category: 'hot',
            ingredients: ['1 espresso shot', 'Small spoon of foam'],
            instructions: ['Pull espresso.', 'Top with a small spoon of foam.']
        }
    ];

    for (const drink of drinks) {
        await db.run(
            `INSERT OR IGNORE INTO drinks
             (id, name, category, ingredients_json, instructions_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                drink.id,
                drink.name,
                drink.category,
                JSON.stringify(drink.ingredients),
                JSON.stringify(drink.instructions),
                now,
                now
            ]
        );
    }

    await dbService.saveToLocalStore();
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
