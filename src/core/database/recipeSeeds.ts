import type { BrewingMethod, Recipe } from '../../shared/domain/entities';

const SEED_TIMESTAMP = '2026-06-12T00:00:00.000Z';

type SeedStep = {
    label: string;
    duration: number;
    target?: number;
    instruction: string;
};

type RecipeSeed = {
    id: string;
    method_id: string;
    name: string;
    difficulty: NonNullable<Recipe['difficulty']>;
    style: string;
    description_short: string;
    description_detailed: string;
    philosophy: string;
    best_for_tags: string[];
    not_recommended_tags: string[];
    ratio: string;
    temperature: number;
    grind_size: string;
    total_water: number;
    steps: SeedStep[];
};

export const BREWING_METHOD_SEEDS: BrewingMethod[] = [
    { id: 'v60', name: 'V60 Pour Over', description: 'Cone dripper for clean, expressive cups.', icon: 'filter_alt', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'aeropress', name: 'AeroPress', description: 'Pressure-assisted immersion brewer.', icon: 'science', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'french_press', name: 'French Press', description: 'Full-bodied immersion brewing.', icon: 'coffee', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'chemex', name: 'Chemex', description: 'Thick-filter brewer for refined clarity.', icon: 'hourglass_top', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'espresso', name: 'Espresso', description: 'Concentrated pressure extraction.', icon: 'coffee', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'moka_pot', name: 'Moka Pot', description: 'Stovetop brewer for intense coffee.', icon: 'local_cafe', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'cold_brew', name: 'Cold Brew', description: 'Low-acid immersion brewed cold.', icon: 'ac_unit', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'kalita', name: 'Kalita Wave', description: 'Flat-bottom dripper for steady extraction.', icon: 'waves', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'clever', name: 'Clever Dripper', description: 'Immersion with controlled drawdown.', icon: 'filter_list', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP },
    { id: 'siphon', name: 'Siphon', description: 'Vacuum brewer with high aroma clarity.', icon: 'science', created_at: SEED_TIMESTAMP, updated_at: SEED_TIMESTAMP }
];

const buildRecipe = (seed: RecipeSeed): Recipe => ({
    id: seed.id,
    method_id: seed.method_id,
    name: seed.name,
    difficulty: seed.difficulty,
    style: seed.style,
    description_short: seed.description_short,
    description_detailed: seed.description_detailed,
    philosophy: seed.philosophy,
    best_for_tags: seed.best_for_tags,
    not_recommended_tags: seed.not_recommended_tags,
    ratio: seed.ratio,
    temperature: seed.temperature,
    grind_size: seed.grind_size,
    total_water: seed.total_water,
    is_custom: false,
    is_favorite: false,
    version: 1,
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
    steps: seed.steps.map((step, index) => ({
        id: `${seed.id}-step-${index + 1}`,
        recipe_id: seed.id,
        step_order: index + 1,
        label: step.label,
        duration_seconds: step.duration,
        target_weight: step.target,
        instruction: step.instruction,
        created_at: SEED_TIMESTAMP,
        updated_at: SEED_TIMESTAMP
    }))
});

export const RECIPE_SEEDS: Recipe[] = [
    buildRecipe({
        id: 'v60-balanced-daily-driver',
        method_id: 'v60',
        name: 'Balanced Daily Driver',
        difficulty: 'Beginner',
        style: 'Balanced / Sweet',
        description_short: 'A dependable V60 recipe for clear sweetness and gentle acidity.',
        description_detailed: 'This recipe uses a simple bloom and two steady pours to keep agitation moderate. It is designed as a baseline for dialing most washed or honey processed coffees.',
        philosophy: 'Start with repeatability, then adjust grind to move the cup sweeter or brighter.',
        best_for_tags: ['Light Roast', 'Medium Roast', 'Washed', 'Honey', 'Arabica'],
        not_recommended_tags: ['Very Dark Roast', 'Fine Espresso Grind'],
        ratio: '1:16',
        temperature: 93,
        grind_size: 'Medium-Fine',
        total_water: 288,
        steps: [
            { label: 'Bloom', duration: 35, target: 50, instruction: 'Pour to 50g and gently swirl until all grounds are wet.' },
            { label: 'First Pour', duration: 35, target: 170, instruction: 'Pour in slow circles, keeping the slurry height stable.' },
            { label: 'Settle', duration: 20, instruction: 'Let the bed drop slightly without drying out.' },
            { label: 'Final Pour', duration: 35, target: 288, instruction: 'Pour to final weight, then give one light swirl.' },
            { label: 'Drawdown', duration: 55, instruction: 'Let the brew drain. Target total time is around 3:00.' }
        ]
    }),
    buildRecipe({
        id: 'v60-bright-light-roast',
        method_id: 'v60',
        name: 'Bright Light Roast Lift',
        difficulty: 'Intermediate',
        style: 'Bright / Floral',
        description_short: 'Higher temperature and staged pours for crisp light roasts.',
        description_detailed: 'Small repeated pours refresh the slurry and highlight aroma without pushing too much body. It works well for dense, high-altitude coffees.',
        philosophy: 'Use heat and controlled pulses to unlock clarity while avoiding harsh agitation.',
        best_for_tags: ['Light Roast', 'Washed', 'Floral', 'Citrus', 'High Altitude'],
        not_recommended_tags: ['Dark Roast', 'Low Density Beans'],
        ratio: '1:16.5',
        temperature: 96,
        grind_size: 'Medium-Fine',
        total_water: 300,
        steps: [
            { label: 'Bloom', duration: 45, target: 55, instruction: 'Saturate evenly and let the bloom expand fully.' },
            { label: 'Pulse 1', duration: 20, target: 120, instruction: 'Pour a narrow spiral from center outward.' },
            { label: 'Pulse 2', duration: 20, target: 185, instruction: 'Repeat with a calm, even stream.' },
            { label: 'Pulse 3', duration: 20, target: 245, instruction: 'Keep the stream low to reduce splashing.' },
            { label: 'Finish', duration: 25, target: 300, instruction: 'Pour to final weight and swirl once.' },
            { label: 'Drawdown', duration: 60, instruction: 'Let drain. If sour, grind finer; if dry, grind coarser.' }
        ]
    }),
    buildRecipe({
        id: 'v60-sweet-46-inspired',
        method_id: 'v60',
        name: 'Sweet 4:6 Style Split',
        difficulty: 'Advanced',
        style: 'Sweet / Layered',
        description_short: 'A five-pour V60 inspired by the 4:6 approach, tuned for sweetness.',
        description_detailed: 'This recipe separates early sweetness shaping pours from later strength building pours. It is flexible but rewards consistent pouring.',
        philosophy: 'Early water distribution shapes balance; later pulses control concentration.',
        best_for_tags: ['Medium Roast', 'Natural', 'Honey', 'Sweet Profile'],
        not_recommended_tags: ['Tiny Dose', 'Very Fine Grind'],
        ratio: '1:15',
        temperature: 92,
        grind_size: 'Medium-Coarse',
        total_water: 300,
        steps: [
            { label: 'Sweetness Pour', duration: 45, target: 60, instruction: 'Pour 60g slowly to saturate the bed.' },
            { label: 'Balance Pour', duration: 45, target: 120, instruction: 'Pour another 60g and let it drain halfway.' },
            { label: 'Strength Pour 1', duration: 35, target: 180, instruction: 'Pour 60g with a slightly faster stream.' },
            { label: 'Strength Pour 2', duration: 35, target: 240, instruction: 'Repeat when the water level drops.' },
            { label: 'Strength Pour 3', duration: 35, target: 300, instruction: 'Finish to final weight and avoid heavy swirling.' },
            { label: 'Drawdown', duration: 55, instruction: 'Target total time is 3:30 to 4:00.' }
        ]
    }),
    buildRecipe({
        id: 'v60-low-agitation-clean-cup',
        method_id: 'v60',
        name: 'Low Agitation Clean Cup',
        difficulty: 'Intermediate',
        style: 'Clean / Tea-like',
        description_short: 'Gentle center-focused pouring for delicate coffees.',
        description_detailed: 'A calmer recipe that avoids over-agitating fragile beans. It is useful when a coffee becomes astringent with aggressive swirling.',
        philosophy: 'Less agitation can preserve elegance when extraction is already easy.',
        best_for_tags: ['Delicate Coffee', 'Floral', 'Tea-like', 'Light Roast'],
        not_recommended_tags: ['Underdeveloped Roast', 'Very Coarse Grind'],
        ratio: '1:17',
        temperature: 92,
        grind_size: 'Medium-Fine',
        total_water: 255,
        steps: [
            { label: 'Bloom', duration: 40, target: 45, instruction: 'Pour gently and avoid stirring.' },
            { label: 'Center Pour', duration: 35, target: 150, instruction: 'Pour mostly in the center with small circles.' },
            { label: 'Pause', duration: 25, instruction: 'Let the bed settle naturally.' },
            { label: 'Finish Pour', duration: 30, target: 255, instruction: 'Pour to final weight with low stream height.' },
            { label: 'Drawdown', duration: 60, instruction: 'Let drain without swirling.' }
        ]
    }),
    buildRecipe({
        id: 'v60-battefeld-five-pour',
        method_id: 'v60',
        name: "Nicole Battefeld's Five-Pour",
        difficulty: 'Intermediate',
        style: 'Clean / Sweet',
        description_short: 'Coarse grind with five equal pours for sweetness and clarity.',
        description_detailed: "Nicole Battefeld's Brewers Cup go-to recipe. Uses 5 equal 60g pours with 30s breaks on a coarse grind to extract a clean cup with high sweetness and clarity.",
        philosophy: 'Five equal infusions control contact time and extraction, delivering consistent cup clarity.',
        best_for_tags: ['Clean Cup', 'Sweetness', 'Acidity', 'Coarse Grind', 'Light Roast'],
        not_recommended_tags: ['Very Fine Grind', 'Under-developed Roast'],
        ratio: '1:15',
        temperature: 93,
        grind_size: 'Coarse (30-32 Comandante clicks)',
        total_water: 300,
        steps: [
            { label: 'Bloom (1st Pour)', duration: 40, target: 60, instruction: 'Pour 60g in 10s starting from the center outward in a spiral, then pause.' },
            { label: '2nd Pour', duration: 40, target: 120, instruction: 'Pour 60g in 10s starting from the center outward in a spiral, then pause.' },
            { label: '3rd Pour', duration: 40, target: 180, instruction: 'Pour 60g in 10s starting from the center outward in a spiral, then pause.' },
            { label: '4th Pour', duration: 40, target: 240, instruction: 'Pour 60g in 10s starting from the center outward in a spiral, then pause.' },
            { label: '5th Pour', duration: 10, target: 300, instruction: 'Final 60g pour in 10s starting from the center outward in a spiral.' },
            { label: 'Drawdown', duration: 30, instruction: 'Let drain. Target total brew time is 3:00 to 3:20.' }
        ]
    }),
    buildRecipe({
        id: 'v60-low-key-go-to',
        method_id: 'v60',
        name: 'Low-Key Go-To V60',
        difficulty: 'Beginner',
        style: 'Balanced / Everyday',
        description_short: 'An easy, repeatable 1:16 recipe with a 70g bloom and 3 staged pours.',
        description_detailed: 'The go-to Hario V60 recipe by Low-Key Coffee Snobs. Uses an 18g dose to 288g water (1:16 ratio) at 96°C. Features a 70g bloom with gentle stirring followed by three staged pulse pours for balanced extraction.',
        philosophy: 'A simple, forgiving daily routine that minimizes fuss while maximizing sweet, clean flavors.',
        best_for_tags: ['Everyday Brew', 'Balanced', 'Easy', 'Medium Roast', 'Washed'],
        not_recommended_tags: ['Very Fine Grind', 'Tiny Cup'],
        ratio: '1:16',
        temperature: 96,
        grind_size: 'Medium (16 on Baratza Encore)',
        total_water: 288,
        steps: [
            { label: 'Bloom', duration: 45, target: 70, instruction: 'Pour 70g water (or 50-90g). Stir gently with a spoon or stick to make sure all grounds are fully saturated, then pause to let the coffee bloom.' },
            { label: 'First Pour', duration: 30, target: 140, instruction: 'Pour 70g in a calm spiral starting from the center outward. Avoid pouring too close to the paper filter edge. Keep the coffee bed wet.' },
            { label: 'Second Pour', duration: 30, target: 210, instruction: 'Pour another 70g in a spiral pattern. Do not pour in a single place, and never let the coffee bed run completely dry to maintain heat.' },
            { label: 'Final Pour', duration: 30, target: 288, instruction: 'Pour final 78g in a calm spiral. Give the V60 dripper a gentle swirl to flatten the coffee bed for an even drawdown.' },
            { label: 'Drawdown', duration: 50, instruction: 'Let the water drain completely. Total brew time should be around 2:45 to 3:00 minutes.' }
        ]
    }),
    buildRecipe({
        id: 'v60-flores-floral-berries',
        method_id: 'v60',
        name: 'Flores Floral Berries V60',
        difficulty: 'Beginner',
        style: 'Sweet / Aromatic',
        description_short: 'Resep V60 dasar dari Three Folks untuk rasa manis, aromatik, dan body lembut.',
        description_detailed: 'Resep V60 kalibrasi dasar Three Folks untuk Flores Floral Berries. Menggunakan dosis 15g kopi dengan total air 225g (rasio 1:15) pada suhu 95℃ untuk menghasilkan rasa manis blackberry, orange, dan chamomile.',
        philosophy: 'Ekstraksi stabil dengan fokus pada aliran air yang pelan dan memutar untuk cita rasa optimal.',
        best_for_tags: ['Sweetness', 'Aromatic', 'Smooth Body', 'Blackberry', 'Medium Roast'],
        not_recommended_tags: ['Coarse Grind', 'High Mineral Water'],
        ratio: '1:15',
        temperature: 95,
        grind_size: 'Medium',
        total_water: 225,
        steps: [
            { label: 'Bloom', duration: 30, target: 30, instruction: 'Tuang 30g air secara merata untuk membuang gas (blooming). Diamkan selama 30 detik.' },
            { label: 'Tuangan Utama', duration: 60, target: 200, instruction: 'Tuang 170g air secara pelan dengan gerakan memutar stabil. Tunggu hingga genangan air hampir kering.' },
            { label: 'Tuangan Akhir', duration: 30, target: 225, instruction: 'Tuang 25g air terakhir secara perlahan untuk melengkapi ekstraksi.' },
            { label: 'Drawdown', duration: 30, instruction: 'Biarkan air turun seluruhnya. Target total waktu seduh idealnya adalah sekitar 2:30 menit.' }
        ]
    }),
    buildRecipe({
        id: 'v60-4-6-method-basic',
        method_id: 'v60',
        name: 'V60 Basic 4:6 Method',
        difficulty: 'Intermediate',
        style: 'Balanced / Structured',
        description_short: 'Tetsu Kasuya\'s World Brewers Cup winning 4:6 Method basic recipe for a balanced cup.',
        description_detailed: 'Tetsu Kasuya\'s iconic 4:6 Method divides total water into 5 equal pours spaced 45 seconds apart using a coarse grind. The first 2 pours (40%) regulate sweetness and acidity balance, while the remaining 3 pours (60%) adjust strength.',
        philosophy: 'Control sweetness and acidity with the first 40% of water, and strength with the remaining 60%. 5 pulse pours with coarse grounds prevent over-extraction.',
        best_for_tags: ['Balanced', 'Sweetness', 'Clarity', 'Coarse Grind', 'Single Origin'],
        not_recommended_tags: ['Fine Espresso Grind', 'Fast Continuous Pouring'],
        ratio: '1:15',
        temperature: 96,
        grind_size: 'Coarse',
        total_water: 300,
        steps: [
            { label: 'First Pour (40% Part 1)', duration: 45, target: 60, instruction: 'Pour 60g hot water in a continuous spiral motion within 10 seconds. Pause and let it drain until 0:45.' },
            { label: 'Second Pour (40% Part 2)', duration: 45, target: 120, instruction: 'Pour 60g hot water (+60g, target 120g) in a circular motion within 10 seconds. Pause until 1:30.' },
            { label: 'Third Pour (60% Part 1)', duration: 45, target: 180, instruction: 'Pour 60g hot water (+60g, target 180g) in a circular motion within 10 seconds. Pause until 2:15.' },
            { label: 'Fourth Pour (60% Part 2)', duration: 45, target: 240, instruction: 'Pour 60g hot water (+60g, target 240g) in a circular motion within 10 seconds. Pause until 3:00.' },
            { label: 'Fifth Pour (60% Part 3)', duration: 30, target: 300, instruction: 'Pour final 60g hot water (+60g, target 300g) in a circular motion within 10 seconds.' },
            { label: 'Drawdown & Serve', duration: 30, instruction: 'Allow water to drain completely through the coffee bed. Remove V60 dripper at 3:30 and serve.' }
        ]
    }),
    buildRecipe({
        id: 'aeropress-classic-sweet-cup',
        method_id: 'aeropress',
        name: 'Classic Sweet AeroPress',
        difficulty: 'Beginner',
        style: 'Sweet / Rounded',
        description_short: 'A simple upright AeroPress recipe with a smooth finish.',
        description_detailed: 'This recipe balances short immersion with a gentle press. It is forgiving and easy to repeat with most beans.',
        philosophy: 'Short immersion keeps bitterness low while pressure adds body.',
        best_for_tags: ['Medium Roast', 'Chocolate', 'Nutty', 'Travel'],
        not_recommended_tags: ['Very Light Roast Without Fine Grind'],
        ratio: '1:14',
        temperature: 90,
        grind_size: 'Medium-Fine',
        total_water: 210,
        steps: [
            { label: 'Add Water', duration: 15, target: 210, instruction: 'Add all water quickly over 15g coffee.' },
            { label: 'Stir', duration: 10, instruction: 'Stir front to back 5 times.' },
            { label: 'Steep', duration: 75, instruction: 'Attach cap and let it steep.' },
            { label: 'Press', duration: 30, instruction: 'Press gently until you hear a soft hiss.' }
        ]
    }),
    buildRecipe({
        id: 'aeropress-inverted-bold',
        method_id: 'aeropress',
        name: 'Inverted Bold Immersion',
        difficulty: 'Intermediate',
        style: 'Bold / Full',
        description_short: 'Longer immersion AeroPress for heavier texture.',
        description_detailed: 'A full-bodied inverted recipe that suits milk drinks or coffees with chocolate and spice notes.',
        philosophy: 'Increase contact time and reduce bypass for a richer cup.',
        best_for_tags: ['Medium-Dark Roast', 'Chocolate', 'Spice', 'Milk Drinks'],
        not_recommended_tags: ['Very Floral Light Roast'],
        ratio: '1:12',
        temperature: 88,
        grind_size: 'Medium',
        total_water: 216,
        steps: [
            { label: 'Fill', duration: 20, target: 216, instruction: 'Add water over 18g coffee and saturate evenly.' },
            { label: 'Stir', duration: 10, instruction: 'Stir 8 to 10 times for full immersion.' },
            { label: 'Steep', duration: 100, instruction: 'Let the coffee steep with cap attached.' },
            { label: 'Flip', duration: 10, instruction: 'Flip carefully onto a sturdy mug.' },
            { label: 'Press', duration: 35, instruction: 'Press slowly and stop at the hiss.' }
        ]
    }),
    buildRecipe({
        id: 'aeropress-bypass-clarity',
        method_id: 'aeropress',
        name: 'Bypass Clarity Cup',
        difficulty: 'Intermediate',
        style: 'Clean / Juicy',
        description_short: 'A concentrated AeroPress brew diluted after pressing.',
        description_detailed: 'Brewing stronger first and adding water after pressing creates a clean, juicy cup with controlled body.',
        philosophy: 'Separate extraction strength from final drinking strength.',
        best_for_tags: ['Light Roast', 'Fruit Notes', 'Washed', 'Juicy Acidity'],
        not_recommended_tags: ['Dark Roast', 'Very Bitter Coffee'],
        ratio: '1:15',
        temperature: 94,
        grind_size: 'Fine-Medium',
        total_water: 225,
        steps: [
            { label: 'Brew Water', duration: 15, target: 150, instruction: 'Pour 150g water over 15g coffee.' },
            { label: 'Stir', duration: 10, instruction: 'Stir gently to break clumps.' },
            { label: 'Steep', duration: 60, instruction: 'Let it steep upright.' },
            { label: 'Press', duration: 30, instruction: 'Press slowly into a server.' },
            { label: 'Bypass', duration: 10, target: 225, instruction: 'Add hot water to reach 225g total beverage.' }
        ]
    }),
    buildRecipe({
        id: 'french-press-clean-immersion',
        method_id: 'french_press',
        name: 'Clean Immersion Press',
        difficulty: 'Beginner',
        style: 'Round / Clean',
        description_short: 'A cleaner French Press approach with settling time.',
        description_detailed: 'Breaking the crust and waiting before pouring reduces sludge while preserving the full body French Press is known for.',
        philosophy: 'Immersion is forgiving; patience creates clarity.',
        best_for_tags: ['Medium Roast', 'Comfort Cup', 'Chocolate', 'Nutty'],
        not_recommended_tags: ['Very Fine Grind', 'Tiny Cups'],
        ratio: '1:15',
        temperature: 94,
        grind_size: 'Coarse',
        total_water: 450,
        steps: [
            { label: 'Fill', duration: 20, target: 450, instruction: 'Pour all water over 30g coarse coffee.' },
            { label: 'Steep', duration: 240, instruction: 'Let the crust form undisturbed.' },
            { label: 'Break Crust', duration: 20, instruction: 'Stir the top gently and skim foam if desired.' },
            { label: 'Settle', duration: 300, instruction: 'Wait for fines to sink before plunging.' },
            { label: 'Pour', duration: 30, instruction: 'Press only to the surface and pour gently.' }
        ]
    }),
    buildRecipe({
        id: 'french-press-heavy-body',
        method_id: 'french_press',
        name: 'Heavy Body Morning Press',
        difficulty: 'Beginner',
        style: 'Heavy / Cozy',
        description_short: 'A richer French Press for milk or bold black coffee.',
        description_detailed: 'A slightly stronger ratio and shorter settling keeps more body in the cup.',
        philosophy: 'Lean into immersion texture instead of chasing filter clarity.',
        best_for_tags: ['Dark Roast', 'Milk', 'Low Acidity', 'Bold Cup'],
        not_recommended_tags: ['Delicate Floral Coffee'],
        ratio: '1:13',
        temperature: 91,
        grind_size: 'Coarse',
        total_water: 390,
        steps: [
            { label: 'Fill', duration: 20, target: 390, instruction: 'Pour all water over 30g coffee.' },
            { label: 'Steep', duration: 210, instruction: 'Let steep without stirring.' },
            { label: 'Stir', duration: 10, instruction: 'Stir gently to sink the crust.' },
            { label: 'Settle', duration: 120, instruction: 'Wait briefly for large particles to drop.' },
            { label: 'Pour', duration: 30, instruction: 'Plunge slowly and serve immediately.' }
        ]
    }),
    buildRecipe({
        id: 'french-press-light-roast-long-steep',
        method_id: 'french_press',
        name: 'Light Roast Long Steep',
        difficulty: 'Intermediate',
        style: 'Sweet / Transparent',
        description_short: 'A longer French Press recipe for dense light roasts.',
        description_detailed: 'Higher heat and extended time help light roasts extract fully while the final wait improves clarity.',
        philosophy: 'Give dense beans time, then separate carefully.',
        best_for_tags: ['Light Roast', 'Washed', 'High Density', 'Sweet Citrus'],
        not_recommended_tags: ['Dark Roast', 'Robusta Heavy Blend'],
        ratio: '1:16',
        temperature: 96,
        grind_size: 'Medium-Coarse',
        total_water: 480,
        steps: [
            { label: 'Fill', duration: 25, target: 480, instruction: 'Pour all water over 30g coffee.' },
            { label: 'Steep', duration: 300, instruction: 'Let extraction develop fully.' },
            { label: 'Break Crust', duration: 20, instruction: 'Stir the floating grounds down gently.' },
            { label: 'Settle', duration: 300, instruction: 'Let fines sink for a cleaner cup.' },
            { label: 'Serve', duration: 30, instruction: 'Pour without pressing hard into the bed.' }
        ]
    }),
    buildRecipe({
        id: 'chemex-clean-classic',
        method_id: 'chemex',
        name: 'Clean Classic Chemex',
        difficulty: 'Intermediate',
        style: 'Clean / Refined',
        description_short: 'A classic Chemex recipe for clarity and soft sweetness.',
        description_detailed: 'The thick filter slows drawdown and polishes texture. This recipe uses broad pours to keep the bed evenly saturated.',
        philosophy: 'Chemex rewards patience and a slightly coarser grind.',
        best_for_tags: ['Washed', 'Floral', 'Light Roast', 'Shared Brew'],
        not_recommended_tags: ['Very Fine Grind', 'Oily Dark Roast'],
        ratio: '1:16',
        temperature: 94,
        grind_size: 'Medium-Coarse',
        total_water: 480,
        steps: [
            { label: 'Bloom', duration: 45, target: 80, instruction: 'Bloom 30g coffee with 80g water and swirl gently.' },
            { label: 'Pour 1', duration: 45, target: 240, instruction: 'Pour broad circles across the bed.' },
            { label: 'Pause', duration: 25, instruction: 'Let the slurry drop slightly.' },
            { label: 'Pour 2', duration: 45, target: 380, instruction: 'Pour evenly and avoid the paper wall.' },
            { label: 'Finish', duration: 30, target: 480, instruction: 'Finish to final weight.' },
            { label: 'Drawdown', duration: 90, instruction: 'Target total time is 4:30 to 5:00.' }
        ]
    }),
    buildRecipe({
        id: 'chemex-fruit-forward',
        method_id: 'chemex',
        name: 'Fruit Forward Chemex',
        difficulty: 'Advanced',
        style: 'Juicy / Clear',
        description_short: 'A hotter Chemex recipe for fruity light roasts.',
        description_detailed: 'More bloom time and hotter water help reveal fruit notes while Chemex filtration keeps the cup polished.',
        philosophy: 'Extract enough sweetness to support bright acidity.',
        best_for_tags: ['Natural', 'Anaerobic', 'Berry Notes', 'Light Roast'],
        not_recommended_tags: ['Roasty Coffee', 'Low Acidity Blend'],
        ratio: '1:15.5',
        temperature: 96,
        grind_size: 'Medium-Coarse',
        total_water: 465,
        steps: [
            { label: 'Bloom', duration: 55, target: 90, instruction: 'Pour generously and swirl to release gas.' },
            { label: 'Main Pour', duration: 60, target: 300, instruction: 'Pour in slow overlapping circles.' },
            { label: 'Settle', duration: 30, instruction: 'Let the slurry settle.' },
            { label: 'Final Pour', duration: 45, target: 465, instruction: 'Pour to final weight with a calm stream.' },
            { label: 'Drawdown', duration: 90, instruction: 'If drawdown stalls, grind coarser next brew.' }
        ]
    }),
    buildRecipe({
        id: 'chemex-crowd-brew',
        method_id: 'chemex',
        name: 'Crowd Brew Chemex',
        difficulty: 'Intermediate',
        style: 'Smooth / Large Batch',
        description_short: 'A larger Chemex recipe for serving several cups.',
        description_detailed: 'Designed for 45g coffee and a steady pour structure. It prioritizes smoothness and consistency over maximum intensity.',
        philosophy: 'Large brews need lower agitation and careful pacing.',
        best_for_tags: ['Sharing', 'Medium Roast', 'Balanced', 'Brunch'],
        not_recommended_tags: ['Very Dense Light Roast Without Strong Grinder'],
        ratio: '1:16',
        temperature: 93,
        grind_size: 'Coarse',
        total_water: 720,
        steps: [
            { label: 'Bloom', duration: 50, target: 120, instruction: 'Bloom 45g coffee thoroughly.' },
            { label: 'Pour 1', duration: 60, target: 360, instruction: 'Pour slowly to keep slurry below the rim.' },
            { label: 'Pour 2', duration: 60, target: 560, instruction: 'Continue in broad circles.' },
            { label: 'Finish', duration: 45, target: 720, instruction: 'Finish and gently swirl the brewer.' },
            { label: 'Drawdown', duration: 120, instruction: 'Serve once the bed drains fully.' }
        ]
    }),
    buildRecipe({
        id: 'espresso-classic-two-to-one',
        method_id: 'espresso',
        name: 'Classic 2:1 Espresso',
        difficulty: 'Intermediate',
        style: 'Balanced / Syrupy',
        description_short: 'A practical espresso baseline for dialing in.',
        description_detailed: 'Start with a 2:1 yield and adjust grind to land around 28 seconds. This gives a balanced reference before changing dose or yield.',
        philosophy: 'Change one variable at a time: grind first, then yield.',
        best_for_tags: ['Medium Roast', 'Blend', 'Chocolate', 'Cafe Style'],
        not_recommended_tags: ['Filter Grind', 'Stale Beans'],
        ratio: '1:2',
        temperature: 93,
        grind_size: 'Fine',
        total_water: 36,
        steps: [
            { label: 'Dose', duration: 15, instruction: 'Dose 18g coffee into the basket.' },
            { label: 'Distribute', duration: 15, instruction: 'Distribute evenly and tamp level.' },
            { label: 'Extract', duration: 28, target: 36, instruction: 'Pull to 36g beverage yield.' },
            { label: 'Assess', duration: 10, instruction: 'If sour, grind finer. If bitter and slow, grind coarser.' }
        ]
    }),
    buildRecipe({
        id: 'espresso-light-roast-longer-yield',
        method_id: 'espresso',
        name: 'Light Roast Longer Yield',
        difficulty: 'Advanced',
        style: 'Bright / Sweet',
        description_short: 'A longer espresso yield to open up dense light roasts.',
        description_detailed: 'Light roasts often need more yield and heat. This recipe aims for sweetness without forcing a slow, harsh shot.',
        philosophy: 'Use a longer ratio to increase extraction while keeping flow healthy.',
        best_for_tags: ['Light Roast', 'Single Origin', 'Citrus', 'Floral'],
        not_recommended_tags: ['Dark Roast', 'Low Acidity Blend'],
        ratio: '1:2.5',
        temperature: 95,
        grind_size: 'Fine',
        total_water: 45,
        steps: [
            { label: 'Dose', duration: 15, instruction: 'Dose 18g and prepare the puck carefully.' },
            { label: 'Preinfuse', duration: 8, instruction: 'Use gentle preinfusion if your machine supports it.' },
            { label: 'Extract', duration: 32, target: 45, instruction: 'Pull to 45g yield with steady flow.' },
            { label: 'Stir', duration: 5, instruction: 'Stir the espresso before tasting.' }
        ]
    }),
    buildRecipe({
        id: 'espresso-short-chocolate',
        method_id: 'espresso',
        name: 'Short Chocolate Shot',
        difficulty: 'Intermediate',
        style: 'Dense / Chocolate',
        description_short: 'A shorter espresso for heavy body and chocolate notes.',
        description_detailed: 'A compact yield increases texture and intensity. It is best for medium-dark coffees that already extract easily.',
        philosophy: 'Stop shorter when you want body more than clarity.',
        best_for_tags: ['Medium-Dark Roast', 'Chocolate', 'Nutty', 'Milk Drinks'],
        not_recommended_tags: ['Very Light Roast', 'Sour Espresso'],
        ratio: '1:1.75',
        temperature: 91,
        grind_size: 'Fine',
        total_water: 32,
        steps: [
            { label: 'Dose', duration: 15, instruction: 'Dose 18g into a dry basket.' },
            { label: 'Prep', duration: 15, instruction: 'Distribute and tamp level.' },
            { label: 'Extract', duration: 28, target: 32, instruction: 'Pull to 32g yield.' },
            { label: 'Serve', duration: 5, instruction: 'Serve immediately or use as a milk base.' }
        ]
    }),
    buildRecipe({
        id: 'espresso-americano-base',
        method_id: 'espresso',
        name: 'Americano Base Shot',
        difficulty: 'Beginner',
        style: 'Clean / Dilutable',
        description_short: 'A balanced espresso built to dilute cleanly with hot water.',
        description_detailed: 'This shot keeps bitterness moderate so it holds up well as an Americano or long black.',
        philosophy: 'A clean base makes diluted drinks taste intentional, not thin.',
        best_for_tags: ['Americano', 'Medium Roast', 'Balanced Blend'],
        not_recommended_tags: ['Overdeveloped Roast'],
        ratio: '1:2.2',
        temperature: 92,
        grind_size: 'Fine',
        total_water: 40,
        steps: [
            { label: 'Dose', duration: 15, instruction: 'Dose 18g coffee.' },
            { label: 'Prep', duration: 15, instruction: 'Distribute, tamp, and flush the group if needed.' },
            { label: 'Extract', duration: 30, target: 40, instruction: 'Pull to 40g yield.' },
            { label: 'Dilute', duration: 10, instruction: 'Add to 100-140g hot water for an Americano.' }
        ]
    }),
    buildRecipe({
        id: 'moka-pot-smooth-stovetop',
        method_id: 'moka_pot',
        name: 'Smooth Stovetop Moka',
        difficulty: 'Beginner',
        style: 'Strong / Smooth',
        description_short: 'A gentler Moka Pot method to avoid burnt bitterness.',
        description_detailed: 'Starting with hot water and removing from heat early reduces harshness while keeping the classic concentrated profile.',
        philosophy: 'Control heat so pressure extracts without scorching.',
        best_for_tags: ['Medium Roast', 'Milk Drinks', 'Chocolate', 'Traditional'],
        not_recommended_tags: ['Very Light Roast', 'Too Fine Grind'],
        ratio: '1:10',
        temperature: 95,
        grind_size: 'Medium-Fine',
        total_water: 180,
        steps: [
            { label: 'Fill Base', duration: 20, target: 180, instruction: 'Add hot water to just below the valve.' },
            { label: 'Load Basket', duration: 20, instruction: 'Fill with 18g coffee and level without tamping.' },
            { label: 'Heat', duration: 120, instruction: 'Heat on medium-low until coffee begins flowing.' },
            { label: 'Finish', duration: 30, instruction: 'Remove from heat when flow turns pale.' },
            { label: 'Cool Base', duration: 10, instruction: 'Run base under cool water to stop extraction.' }
        ]
    }),
    buildRecipe({
        id: 'moka-pot-milk-base',
        method_id: 'moka_pot',
        name: 'Moka Milk Base',
        difficulty: 'Beginner',
        style: 'Rich / Sweet',
        description_short: 'A stronger Moka recipe intended for milk drinks.',
        description_detailed: 'A lower water ratio creates a concentrated brew that cuts through milk without tasting hollow.',
        philosophy: 'Build intensity first, then soften with milk.',
        best_for_tags: ['Milk Drinks', 'Dark Roast', 'Nutty', 'Sweetened Drinks'],
        not_recommended_tags: ['Delicate Single Origin'],
        ratio: '1:8',
        temperature: 93,
        grind_size: 'Medium-Fine',
        total_water: 160,
        steps: [
            { label: 'Fill Base', duration: 20, target: 160, instruction: 'Use hot water below the valve.' },
            { label: 'Load Coffee', duration: 20, instruction: 'Add 20g coffee, level gently.' },
            { label: 'Brew', duration: 110, instruction: 'Use medium-low heat and keep lid open.' },
            { label: 'Stop Early', duration: 20, instruction: 'Remove from heat before sputtering.' },
            { label: 'Serve', duration: 10, instruction: 'Combine with warm milk or pour over ice and milk.' }
        ]
    }),
    buildRecipe({
        id: 'cold-brew-smooth-concentrate',
        method_id: 'cold_brew',
        name: 'Smooth Cold Brew Concentrate',
        difficulty: 'Beginner',
        style: 'Smooth / Low Acid',
        description_short: 'A reliable cold brew concentrate for dilution.',
        description_detailed: 'A stronger immersion brew that can be diluted with water, milk, or served over ice.',
        philosophy: 'Concentrate gives flexibility after brewing.',
        best_for_tags: ['Chocolate', 'Nutty', 'Milk', 'Batch Brew'],
        not_recommended_tags: ['Very Floral Coffee', 'Need Coffee Now'],
        ratio: '1:8',
        temperature: 22,
        grind_size: 'Coarse',
        total_water: 800,
        steps: [
            { label: 'Combine', duration: 60, target: 800, instruction: 'Mix 100g coarse coffee with 800g room-temperature water.' },
            { label: 'Steep', duration: 43200, instruction: 'Steep covered for 12 hours.' },
            { label: 'Filter', duration: 300, instruction: 'Filter through paper or cloth until clear.' },
            { label: 'Dilute', duration: 30, instruction: 'Serve 1 part concentrate with 1 part water or milk.' }
        ]
    }),
    buildRecipe({
        id: 'cold-brew-ready-to-drink',
        method_id: 'cold_brew',
        name: 'Ready-to-Drink Cold Brew',
        difficulty: 'Beginner',
        style: 'Refreshing / Mild',
        description_short: 'A lighter cold brew that is ready to pour over ice.',
        description_detailed: 'This recipe uses more water up front so the final brew needs little or no dilution.',
        philosophy: 'Brew at drinking strength for easy mornings.',
        best_for_tags: ['Refreshing', 'Medium Roast', 'Low Acid', 'Black Coffee'],
        not_recommended_tags: ['Milk Concentrate', 'Very Light Roast'],
        ratio: '1:14',
        temperature: 22,
        grind_size: 'Coarse',
        total_water: 980,
        steps: [
            { label: 'Combine', duration: 60, target: 980, instruction: 'Mix 70g coffee with 980g water.' },
            { label: 'Steep', duration: 50400, instruction: 'Steep for 14 hours in the fridge.' },
            { label: 'Filter', duration: 300, instruction: 'Filter carefully to reduce sediment.' },
            { label: 'Serve', duration: 20, instruction: 'Pour over ice and adjust with a splash of water if needed.' }
        ]
    }),
    buildRecipe({
        id: 'kalita-even-flatbed',
        method_id: 'kalita',
        name: 'Even Flatbed Kalita',
        difficulty: 'Beginner',
        style: 'Balanced / Consistent',
        description_short: 'A steady Kalita Wave recipe built around the flat bed.',
        description_detailed: 'Short pulses keep the flat-bottom bed evenly saturated and reduce channeling.',
        philosophy: 'Let the brewer geometry do the consistency work.',
        best_for_tags: ['Beginner', 'Medium Roast', 'Balanced', 'Washed'],
        not_recommended_tags: ['Very Fine Grind'],
        ratio: '1:16',
        temperature: 93,
        grind_size: 'Medium',
        total_water: 320,
        steps: [
            { label: 'Bloom', duration: 35, target: 60, instruction: 'Bloom 20g coffee with 60g water.' },
            { label: 'Pulse 1', duration: 30, target: 150, instruction: 'Pour to 150g in small circles.' },
            { label: 'Pulse 2', duration: 30, target: 235, instruction: 'Pour when the bed drops halfway.' },
            { label: 'Finish', duration: 30, target: 320, instruction: 'Finish to final weight.' },
            { label: 'Drawdown', duration: 60, instruction: 'Target total time around 3:00.' }
        ]
    }),
    buildRecipe({
        id: 'clever-sweet-immersion',
        method_id: 'clever',
        name: 'Sweet Clever Immersion',
        difficulty: 'Beginner',
        style: 'Sweet / Forgiving',
        description_short: 'An easy Clever Dripper recipe with filter clarity.',
        description_detailed: 'Immersion makes extraction even, while drawdown through paper cleans up texture.',
        philosophy: 'Use immersion for consistency and paper for polish.',
        best_for_tags: ['Beginner', 'Medium Roast', 'Office Brew', 'Sweet Cup'],
        not_recommended_tags: ['Need High Clarity Floral Cup'],
        ratio: '1:16',
        temperature: 94,
        grind_size: 'Medium-Coarse',
        total_water: 320,
        steps: [
            { label: 'Water First', duration: 15, target: 320, instruction: 'Add hot water to the Clever first.' },
            { label: 'Add Coffee', duration: 15, instruction: 'Add 20g coffee and stir gently.' },
            { label: 'Steep', duration: 150, instruction: 'Place lid and let it steep.' },
            { label: 'Stir', duration: 10, instruction: 'Break the crust with a gentle stir.' },
            { label: 'Drawdown', duration: 75, instruction: 'Place on mug and let it drain.' }
        ]
    }),
    buildRecipe({
        id: 'siphon-aromatic-clarity',
        method_id: 'siphon',
        name: 'Aromatic Siphon Clarity',
        difficulty: 'Advanced',
        style: 'Aromatic / Silky',
        description_short: 'A siphon recipe for high aroma and silky texture.',
        description_detailed: 'Controlled stirring and a short full-immersion phase highlight aromatics without muddying the cup.',
        philosophy: 'Siphon brewing is about heat stability and gentle movement.',
        best_for_tags: ['Floral', 'Washed', 'Light Roast', 'Aromatic'],
        not_recommended_tags: ['Oily Dark Roast', 'Very Fine Grind'],
        ratio: '1:15',
        temperature: 94,
        grind_size: 'Medium',
        total_water: 360,
        steps: [
            { label: 'Heat Water', duration: 120, target: 360, instruction: 'Heat water until it rises into the upper chamber.' },
            { label: 'Add Coffee', duration: 10, instruction: 'Add 24g coffee and fold it in gently.' },
            { label: 'Steep', duration: 60, instruction: 'Maintain heat and let it brew.' },
            { label: 'Stir', duration: 5, instruction: 'Give one gentle stir before removing heat.' },
            { label: 'Drawdown', duration: 60, instruction: 'Remove heat and let coffee draw down completely.' }
        ]
    })
];
