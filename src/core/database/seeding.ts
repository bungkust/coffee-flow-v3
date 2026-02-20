import { brewService, drinkService, pantryService } from '../services';

export const seedInitialData = async () => {
    // Check if recipes exist
    // Fix: brewService.getRecipes -> brewService.getAllRecipes
    const recipes = await brewService.getAllRecipes();
    if (recipes.length === 0) {
        console.log('Seeding initial recipes...');
        // Add default recipes if needed
        // (This part was empty in previous file, keeping it minimal as focus is pantry)
    }

    // Seed Pantry Items
    const pantryItems = await pantryService.getPantryItems();
    if (pantryItems.length === 0) {
        console.log('Seeding initial pantry items...');

        // Beans
        await pantryService.addPantryItem('Ethiopia Yirgacheffe', 'beans', {
            brand: 'Onyx Coffee Lab',
            roast_date: '2023-10-12',
            remaining_stock: 60,
            tags_json: ['Washed', 'Light Roast']
        });

        await pantryService.addPantryItem('Holiday Blend', 'beans', {
            brand: 'Stumptown',
            roast_date: '2023-11-02',
            remaining_stock: 85,
            tags_json: ['Blend', 'Medium Roast']
        });

        // Essentials
        await pantryService.addPantryItem('Oatly Barista Edition', 'milk', {
            brand: 'Oatly',
            description: 'Dairy Alternative',
            remaining_stock: 80,
            icon: 'water_drop'
        });

        await pantryService.addPantryItem('Hario V60 Size 02', 'filter', {
            brand: 'Hario',
            is_low_stock: true,
            remaining_stock: 20,
            icon: 'layers'
        });

        await pantryService.addPantryItem('Demerara Sugar', 'other', {
            description: 'Sweetener',
            remaining_stock: 100,
            icon: 'grain'
        });

        // Gear
        await pantryService.addPantryItem('Hario V60', 'dripper', {
            brand: 'Hario',
            description: 'Ceramic • Size 02',
            tags_json: ['Daily Driver']
        });

        await pantryService.addPantryItem('Chemex', 'dripper', {
            brand: 'Chemex',
            description: '6 Cup • Classic Series'
        });

        await pantryService.addPantryItem('Fellow Ode', 'grinder', {
            brand: 'Fellow',
            description: 'Gen 2 • Brew Grinder',
            tags_json: ['Electric']
        });

        await pantryService.addPantryItem('Fellow Stagg EKG', 'kettle', {
            brand: 'Fellow',
            description: 'Electric Gooseneck'
        });
    }
};
