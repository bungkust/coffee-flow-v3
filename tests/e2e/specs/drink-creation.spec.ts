import { test, expect } from '@playwright/test';
import { DrinkEditPage } from '../pages/DrinkEditPage';

test.describe('Exhaustive Drink Creation Test Suite (Positive & Negative Combinations)', () => {
  let drinkEditPage: DrinkEditPage;

  test.beforeEach(async ({ page }) => {
    drinkEditPage = new DrinkEditPage(page);
    await drinkEditPage.gotoNew();
  });

  test('Positive Scenario 1: Create Cold Drink Category with Full Ingredients & Instructions', async ({ page }) => {
    await drinkEditPage.nameInput.fill('Iced Salted Caramel Latte');
    await drinkEditPage.selectCategory('Cold');

    // Add multiple ingredients
    await drinkEditPage.addIngredient('18g Double Shot Espresso');
    await drinkEditPage.addIngredient('150ml Cold Oat Milk');
    await drinkEditPage.addIngredient('20ml Salted Caramel Syrup');

    // Add multiple instructions
    await drinkEditPage.addInstruction('Extract fresh double shot espresso over ice.');
    await drinkEditPage.addInstruction('Pour cold oat milk and caramel syrup, stir gently.');

    // Save Drink
    await drinkEditPage.saveButton.click();

    // Verify Navigation to Drink Menu
    await page.waitForURL('**/drinks');
    await expect(page).toHaveURL(/.*drinks/);
    await expect(page.getByText('Iced Salted Caramel Latte')).toBeVisible();
  });

  test('Positive Scenario 2: Create Hot Drink Category & Verify Detail Save', async ({ page }) => {
    await drinkEditPage.nameInput.fill('Espresso Con Panna');
    await drinkEditPage.selectCategory('Hot');

    await drinkEditPage.addIngredient('20g Single Origin Espresso');
    await drinkEditPage.addIngredient('30g Whipped Cream');
    await drinkEditPage.addInstruction('Extract espresso shot into demitasse cup.');
    await drinkEditPage.addInstruction('Top generously with cold whipped cream.');

    // Save Drink
    await drinkEditPage.saveButton.click();

    // Verify Navigation
    await page.waitForURL('**/drinks');
    await expect(page).toHaveURL(/.*drinks/);
    await expect(page.getByText('Espresso Con Panna')).toBeVisible();
  });

  test('Positive Scenario 3: Dynamic Field Management (Add & Remove Ingredients & Instructions)', async () => {
    await drinkEditPage.nameInput.fill('Matcha Espresso Fusion');
    await drinkEditPage.selectCategory('Cold');

    // Add 2 ingredients and remove 1
    await drinkEditPage.addIngredient('10g Ceremonial Matcha');
    await drinkEditPage.addIngredient('Temp Ingredient To Delete');
    await drinkEditPage.removeIngredient(0); // removes the temporary item

    // Add 2 instructions and remove 1
    await drinkEditPage.addInstruction('Whisk matcha powder with 50ml warm water.');
    await drinkEditPage.addInstruction('Temp Instruction To Delete');
    await drinkEditPage.removeInstruction(0); // removes the temporary step

    // Verify Save Button is enabled
    await expect(drinkEditPage.saveButton).toBeEnabled();
  });

  test('Negative Scenario 1: Empty Drink Name Error Validation', async ({ page }) => {
    // Leave name blank and attempt to save
    await drinkEditPage.saveButton.click();

    // Verify error alert
    await expect(page.getByText('Drink name is required.')).toBeVisible();
  });

  test('Negative Scenario 2: Whitespace-Only Drink Name Validation', async ({ page }) => {
    // Fill only spaces
    await drinkEditPage.nameInput.fill('   ');
    await drinkEditPage.saveButton.click();

    // Verify error alert
    await expect(page.getByText('Drink name is required.')).toBeVisible();
  });
});
