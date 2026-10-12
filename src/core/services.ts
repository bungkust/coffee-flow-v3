import { BrewService } from '../features/brew/application/BrewService';
import { SQLiteRecipeRepository } from '../features/brew/infrastructure/SQLiteRecipeRepository';
import { SQLiteBrewLogRepository } from '../features/brew/infrastructure/SQLiteBrewLogRepository';
import { SQLiteBrewingMethodRepository } from '../features/brew/infrastructure/SQLiteBrewingMethodRepository';
import { BackupService } from '../features/settings/application/BackupService';
import { SQLiteBackupRepository } from '../features/settings/infrastructure/SQLiteBackupRepository';
import { SQLiteSettingsRepository } from '../features/settings/infrastructure/SQLiteSettingsRepository';

import { DrinkService } from '../features/brew/application/DrinkService';
import { SQLiteDrinkLogRepository } from '../features/brew/infrastructure/SQLiteDrinkLogRepository';
import { SQLiteDrinkRepository } from '../features/brew/infrastructure/SQLiteDrinkRepository';

import { PantryService } from '../features/pantry/application/PantryService';
import { SQLitePantryRepository } from '../features/pantry/infrastructure/SQLitePantryRepository';

// Repositories
const recipeRepo = new SQLiteRecipeRepository();
const logRepo = new SQLiteBrewLogRepository();
const brewingMethodRepo = new SQLiteBrewingMethodRepository();
const drinkLogRepo = new SQLiteDrinkLogRepository();
const drinkRepo = new SQLiteDrinkRepository();
const backupRepo = new SQLiteBackupRepository();
const settingsRepo = new SQLiteSettingsRepository();
const pantryRepo = new SQLitePantryRepository();

// Services
export const pantryService = new PantryService(pantryRepo);
export const brewService = new BrewService(recipeRepo, logRepo, brewingMethodRepo, pantryService);
export const drinkService = new DrinkService(drinkRepo, drinkLogRepo, pantryService);
export const backupService = new BackupService(backupRepo);
export const settingsService = settingsRepo;
