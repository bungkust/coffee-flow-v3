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
            name: 'Even Extraction Flow', // Renamed from 'Kasuya 4:6 Method' to match design request
            ratio: '1:16',
            grind_size: 'Medium-Coarse',
            temperature: 93,
            total_water: 288,
            is_custom: 0,
            difficulty: 'Intermediate',
            style: 'Balanced / Round',
            description_short: 'A high-extraction V60 method designed for clarity and sweetness through controlled agitation.',
            description_detailed: 'This recipe focuses on creating a uniform extraction by using precise pouring patterns and strategic stirring. By ensuring all coffee grounds are evenly saturated from the start, we minimize channeling and maximize the flavor potential of light to medium roast specialty coffees.',
            philosophy: 'Intentional agitation followed by rest promotes uniform extraction without harshness.',
            best_for_tags: ['Arabica', 'Light/Medium Roast', 'Washed/Honey'],
            not_recommended_tags: ['Dark Roast', 'Robusta'],
            steps: [
                { label: 'Bloom', duration: 30, target: 50, instruction: 'Saturate all grounds evenly. Release CO2.' },
                { label: 'Stir', duration: 5, target: 50, instruction: 'Gently excavate the slurry to ensure even wetness.' }, // No water added
                { label: 'Wait', duration: 15, target: 50, instruction: 'Let the bloom develop.' },
                { label: 'First Pour', duration: 35, target: 170, instruction: 'Circle pour, steady stream. Build thermal mass.' },
                { label: 'Wait', duration: 15, target: 170, instruction: 'Pause to let water drain slightly.' },
                { label: 'Second Pour', duration: 40, target: 288, instruction: 'Center pour mostly. Maintain slurry temperature.' },
                { label: 'Swirl', duration: 5, target: 288, instruction: 'Gentle swirl of the dripper. Flatten bed for even drawdown.' },
                { label: 'Drawdown', duration: 45, target: 288, instruction: 'Wait for water to drain completely.' }
            ]
        },
        {
            id: 'v60-calm-immersion',
            method_id: 'v60',
            name: 'Calm Immersion',
            ratio: '1:15',
            grind_size: 'Medium',
            temperature: 93,
            total_water: 240,
            is_custom: 0,
            difficulty: 'Beginner',
            style: 'Smooth / Forgiving',
            description_short: 'Forgiving V60 recipe with gentle immersion and settling phases.',
            description_detailed: 'Calm Immersion combines pour-over with short immersion periods, making extraction more even and reducing sharp acidity.',
            philosophy: 'Gentle agitation followed by rest creates uniform extraction without aggressive flow control.',
            best_for_tags: ['Arabica', 'Light', 'Washed', 'Natural'],
            not_recommended_tags: ['Dark Roast'],
            steps: [
                { label: 'Bloom', duration: 30, target: 50, instruction: 'Pour 50 ml to fully saturate the coffee bed.' },
                { label: 'Stir', duration: 5, target: 50, instruction: 'Stir gently 2–3 times to ensure even wetting.' },
                { label: 'Wait', duration: 30, target: 50, instruction: 'Let the coffee steep briefly. Short immersion improves extraction uniformity.' },
                { label: 'Pour', duration: 30, target: 150, instruction: 'Pour steadily to reach 150 ml.' },
                { label: 'Wait', duration: 20, target: 150, instruction: 'Allow slurry to settle slightly.' },
                { label: 'Pour', duration: 30, target: 240, instruction: 'Finish pouring to 240 ml with gentle flow.' },
                { label: 'Swirl', duration: 5, target: 240, instruction: 'Gently swirl to level the bed.' },
                { label: 'Drawdown', duration: 75, target: 240, instruction: 'Allow the brew to draw down completely. Adjust grind if brew finishes too quickly or slowly.' }
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
                { label: 'Bloom & Swirl', duration: 45, target: 60, instruction: 'Pour water and swirl the brewer.' },
                { label: 'First Pour (60%)', duration: 30, target: 240, instruction: 'Pour up to 60% of total water.' },
                { label: 'Second Pour (40%)', duration: 30, target: 200, instruction: 'Pour remaining water slowly.' },
                { label: 'Stir & Swirl', duration: 105, target: 0, instruction: 'Stir once clockwise and swirl gently.' }
            ]
        },
        // ... Keep existing or assume replaced
    ];

    for (const r of championRecipes) {
        // Use INSERT OR REPLACE to update existing recipes with new fields
        await db.run(
            `INSERT OR REPLACE INTO recipes (id, method_id, name, ratio, grind_size, temperature, total_water, is_custom, difficulty, style, description_short, description_detailed, philosophy, best_for_tags, not_recommended_tags, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                r.id,
                r.method_id,
                r.name,
                r.ratio,
                r.grind_size,
                r.temperature,
                r.total_water,
                r.is_custom,
                r.difficulty || null,
                r.style || null,
                r.description_short || null,
                r.description_detailed || null,
                r.philosophy || null,
                JSON.stringify(r.best_for_tags || []),
                JSON.stringify(r.not_recommended_tags || []),
                now,
                now
            ]
        );

        // Delete existing steps and re-insert to handle step updates
        await db.run('DELETE FROM recipe_steps WHERE recipe_id = ?', [r.id]);

        for (let i = 0; i < r.steps.length; i++) {
            const s = r.steps[i];
            await db.run(
                `INSERT INTO recipe_steps (id, recipe_id, step_order, label, duration_seconds, target_weight, instruction, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [`${r.id}-s${i}`, r.id, i, s.label, s.duration, s.target, s.instruction || '', now, now]
            );
        }
    }

    console.log('Database seeded with enhanced recipes successfully');
}
