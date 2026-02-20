import { brewService } from '../services';
import { dbService } from './sqlite';

export const seedInitialData = async () => {
    // Check if recipes exist
    const recipes = await brewService.getAllRecipes();
    if (recipes.length === 0) {
        console.log('Seeding initial recipes...');
        // Add default recipes if needed
    }
};

export const removeDummyPantryItems = async () => {
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
    }
};

