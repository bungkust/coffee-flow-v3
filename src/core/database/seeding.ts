import { dbService } from './sqlite';

export async function seedInitialData() {
    const db = dbService.getDb();

    const now = new Date().toISOString();

    // 1. Seed Brewing Methods (If not exists)
    const methods = [
        { id: 'v60', name: 'V60', icon: 'filter_alt' },
        { id: 'aeropress', name: 'AeroPress', icon: 'science' },
        { id: 'french_press', name: 'French Press', icon: 'coffee' },
        { id: 'chemex', name: 'Chemex', icon: 'hourglass_empty' },
        { id: 'espresso', name: 'Espresso', icon: 'local_cafe' },
        { id: 'moka_pot', name: 'Moka Pot', icon: 'fireplace' }
    ];

    for (const m of methods) {
        const check = await db.query('SELECT id FROM brewing_methods WHERE id = ?', [m.id]);
        if (!check.values || check.values.length === 0) {
            await db.run(
                'INSERT INTO brewing_methods (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                [m.id, m.name, m.icon, now, now]
            );
        }
    }

    // 2. Seed World Champion V60 Recipes
    const championRecipes = [
        {
            id: 'v60-kasuya',
            method_id: 'v60',
            name: 'Kasuya 4:6 Method',
            ratio: '1:15',
            grind_size: 'Coarse',
            temperature: 92,
            total_water: 300,
            is_custom: 0,
            steps: [
                { label: 'Bloom (1st 40%)', duration: 45, target: 60 },
                { label: 'Sweetness (2nd 40%)', duration: 45, target: 60 },
                { label: 'Strength Part 1', duration: 45, target: 60 },
                { label: 'Strength Part 2', duration: 45, target: 60 },
                { label: 'Strength Part 3', duration: 45, target: 60 }
            ]
        },
        {
            id: 'v60-hoffmann',
            method_id: 'v60',
            name: 'Hoffmann Ultimate V60',
            ratio: '1:16.6',
            grind_size: 'Medium-Fine',
            temperature: 100,
            total_water: 500,
            is_custom: 0,
            steps: [
                { label: 'Bloom & Swirl', duration: 45, target: 60 },
                { label: 'First Pour (60%)', duration: 30, target: 240 },
                { label: 'Second Pour (40%)', duration: 30, target: 200 },
                { label: 'Stir & Swirl', duration: 105, target: 0 }
            ]
        },
        {
            id: 'v60-perger',
            method_id: 'v60',
            name: 'Matt Perger V60',
            ratio: '1:16.6',
            grind_size: 'Medium',
            temperature: 97,
            total_water: 200,
            is_custom: 0,
            steps: [
                { label: 'Bloom & Rappi Spin', duration: 30, target: 50 },
                { label: 'Main Pour', duration: 30, target: 150 },
                { label: 'The Rao Spin', duration: 120, target: 0 }
            ]
        }
    ];

    for (const r of championRecipes) {
        const check = await db.query('SELECT id FROM recipes WHERE id = ?', [r.id]);
        if (!check.values || check.values.length === 0) {
            await db.run(
                `INSERT INTO recipes (id, method_id, name, ratio, grind_size, temperature, total_water, is_custom, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [r.id, r.method_id, r.name, r.ratio, r.grind_size, r.temperature, r.total_water, r.is_custom, now, now]
            );

            for (let i = 0; i < r.steps.length; i++) {
                const s = r.steps[i];
                await db.run(
                    `INSERT INTO recipe_steps (id, recipe_id, step_order, label, duration_seconds, target_weight, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [`${r.id}-s${i}`, r.id, i, s.label, s.duration, s.target, now, now]
                );
            }
        }
    }

    console.log('Database seeded with champion recipes successfully');
}
