import { test, expect } from '@playwright/test';
import { OnboardingPage } from '../pages/OnboardingPage';
import { RecipeEditPage } from '../pages/RecipeEditPage';
import { DrinkEditPage } from '../pages/DrinkEditPage';
import { GearEditPage } from '../pages/GearEditPage';
import { BackupRestorePage } from '../pages/BackupRestorePage';
import { resetAppState } from '../helpers/cleanData';

test.describe('End-to-End User Journey: Complete Lifecycle & Backup/Restore Audit', () => {
  test('Complete Flow: Onboarding -> Recipe -> Drink -> Gear -> Backup -> Reset -> Restore from Welcome -> Integrity Check', async ({ page }) => {
    // Page Objects Initialization
    const onboardingPage = new OnboardingPage(page);
    const recipeEditPage = new RecipeEditPage(page);
    const drinkEditPage = new DrinkEditPage(page);
    const gearEditPage = new GearEditPage(page);
    const backupRestorePage = new BackupRestorePage(page);

    // Initial Fresh App State Reset
    await resetAppState(page);

    // -------------------------------------------------------------
    // STEP 1: Complete Onboarding
    // -------------------------------------------------------------
    await page.goto('/onboarding');
    await onboardingPage.completeStep1Profile('Barista Lifecycle Test', 'Track my brews', 'metric');
    await onboardingPage.completeStep2Equipment();
    await onboardingPage.skipStep3Beans();

    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);
    await expect(page.getByText('Barista Lifecycle Test')).toBeVisible();

    // -------------------------------------------------------------
    // STEP 2: Create a Custom Brew Recipe
    // -------------------------------------------------------------
    await page.goto('/recipes/new/edit');
    await recipeEditPage.createRecipe('E2E Lifecycle V60 Special', '1:15', 300);

    await page.waitForURL(url => !url.pathname.endsWith('/edit'));
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // STEP 3: Create a Custom Drink Recipe
    // -------------------------------------------------------------
    await page.goto('/drinks/new/edit');
    await drinkEditPage.createDrink('E2E Lifecycle Iced Latte', 'Cold', ['18g Espresso']);

    await page.waitForURL('**/drinks');
    await expect(page.getByText('E2E Lifecycle Iced Latte')).toBeVisible();
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // STEP 4: Create a Gear Item
    // -------------------------------------------------------------
    await page.goto('/pantry');
    await page.goto('/pantry/add/dripper');
    await gearEditPage.createGear('E2E Lifecycle Dripper', 'Hario');

    // Wait for URL to land back on /pantry
    await page.waitForURL('**/pantry');

    // Switch to Gear Tab in Pantry Page
    await page.getByText('Gear', { exact: true }).click();
    await expect(page.getByText('E2E Lifecycle Dripper')).toBeVisible();
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // STEP 5: Perform Local Backup & Export JSON Backup Payload
    // -------------------------------------------------------------
    await page.goto('/settings/backup');
    await backupRestorePage.performBackupNow();
    await expect(page.getByText(/Ready/i)).toBeVisible();

    const backupJson = await backupRestorePage.exportLatestBackupSnapshot();
    expect(backupJson.length).toBeGreaterThan(50);
    expect(backupJson).toContain('E2E Lifecycle Dripper');

    // -------------------------------------------------------------
    // STEP 6: Full Device & Database Reset (Simulate Clean Phone)
    // -------------------------------------------------------------
    await resetAppState(page);
    await page.waitForTimeout(500);

    // Navigate to Welcome Screen on fresh device
    await page.goto('/welcome');
    await expect(page.getByText(/Start New Journey/i)).toBeVisible();

    // -------------------------------------------------------------
    // STEP 7: Trigger Restore Backup Data from Welcome Screen
    // -------------------------------------------------------------
    await page.getByRole('button', { name: /Restore Backup Data/i }).click();
    await page.waitForURL('**/settings/backup');

    // Import JSON Backup File & Confirm "Restore Now"
    await backupRestorePage.importBackupFile(backupJson);

    // -------------------------------------------------------------
    // STEP 8: Integrity Audit — Verify Restored User Data
    // -------------------------------------------------------------
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);
    await expect(page.getByText('Barista Lifecycle Test')).toBeVisible();

    // Verify Restored Custom Drink Recipe
    await page.goto('/drinks');
    await expect(page.getByText('E2E Lifecycle Iced Latte')).toBeVisible();

    // Verify Restored Gear Item on Pantry Gear Tab
    await page.goto('/pantry');
    await page.getByText('Gear', { exact: true }).click();
    await expect(page.getByText('E2E Lifecycle Dripper')).toBeVisible();
  });
});
