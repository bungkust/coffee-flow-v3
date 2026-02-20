import { BrewService } from '../features/brew/application/BrewService';
import { SQLiteRecipeRepository } from '../features/brew/infrastructure/SQLiteRecipeRepository';
import { SQLiteBrewLogRepository } from '../features/brew/infrastructure/SQLiteBrewLogRepository';
import { BackupService } from '../features/settings/application/BackupService';
import { SQLiteBackupRepository } from '../features/settings/infrastructure/SQLiteBackupRepository';
import { SettingsService } from '../features/settings/application/SettingsService';
import { SQLiteSettingsRepository } from '../features/settings/infrastructure/SQLiteSettingsRepository';

import { DrinkService } from '../features/brew/application/DrinkService';
import { SQLiteDrinkLogRepository } from '../features/brew/infrastructure/SQLiteDrinkLogRepository';

// Repositories
const recipeRepo = new SQLiteRecipeRepository();
const logRepo = new SQLiteBrewLogRepository();
const drinkLogRepo = new SQLiteDrinkLogRepository();
const backupRepo = new SQLiteBackupRepository();
const settingsRepo = new SQLiteSettingsRepository();

// Services
export const brewService = new BrewService(recipeRepo, logRepo);
export const drinkService = new DrinkService(drinkLogRepo);
export const backupService = new BackupService(backupRepo);
export const settingsService = new SettingsService(settingsRepo);
