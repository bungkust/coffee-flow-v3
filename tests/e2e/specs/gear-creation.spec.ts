import { test, expect } from '@playwright/test';
import { GearEditPage } from '../pages/GearEditPage';

test.describe('Exhaustive Gear Creation Test Suite (Positive & Negative Combinations)', () => {
  let gearEditPage: GearEditPage;

  test.beforeEach(async ({ page }) => {
    gearEditPage = new GearEditPage(page);
  });

  test('Positive Scenario 1: Create Dripper Gear with Ceramic Material & Brand', async ({ page }) => {
    await gearEditPage.gotoNewGear('dripper');

    await gearEditPage.createGear('Hario V60 02 White', 'Hario', {
      material: 'Ceramic',
      notes: 'Heat retaining ceramic pour-over dripper.',
    });

    // Verify Navigation to Pantry Page
    await page.waitForURL('**/pantry**');
    await expect(page).toHaveURL(/.*pantry/);
    await page.getByText('Gear', { exact: true }).click();
    await expect(page.getByText('Hario V60 02 White')).toBeVisible();
  });

  test('Positive Scenario 2: Create Grinder Gear with Flat Burr Type', async ({ page }) => {
    await gearEditPage.gotoNewGear('grinder');

    await gearEditPage.createGear('Ode Brew Grinder Gen 2', 'Fellow', {
      burrType: 'Flat',
      notes: 'Single-dose precision electric grinder.',
    });

    // Verify Navigation
    await page.waitForURL('**/pantry**');
    await expect(page).toHaveURL(/.*pantry/);
    await page.getByText('Gear', { exact: true }).click();
    await expect(page.getByText('Ode Brew Grinder Gen 2')).toBeVisible();
  });

  test('Positive Scenario 3: Create Espresso Machine Gear Item', async ({ page }) => {
    await gearEditPage.gotoNewGear('machine');

    await gearEditPage.createGear('Linea Micra', 'La Marzocco', {
      notes: 'Dual boiler home espresso machine.',
    });

    // Verify Navigation
    await page.waitForURL('**/pantry**');
    await expect(page).toHaveURL(/.*pantry/);
    await page.getByText('Gear', { exact: true }).click();
    await expect(page.getByText('Linea Micra')).toBeVisible();
  });

  test('Negative Scenario 1: Empty Item Name Disables Save Button', async () => {
    await gearEditPage.gotoNewGear('dripper');

    // Name is empty -> Save button must be disabled
    await expect(gearEditPage.saveButton).toBeDisabled();
  });

  test('Negative Scenario 2: Whitespace-Only Item Name Disables Save Button', async () => {
    await gearEditPage.gotoNewGear('grinder');

    // Fill only spaces
    await gearEditPage.nameInput.fill('   ');
    await expect(gearEditPage.saveButton).toBeDisabled();
  });
});
