import { test, expect } from '@playwright/test';
import { RecipeEditPage } from '../pages/RecipeEditPage';

test.describe('Brew Recipe Creation Test Suite', () => {
  let recipeEditPage: RecipeEditPage;

  test.beforeEach(async ({ page }) => {
    recipeEditPage = new RecipeEditPage(page);
    await recipeEditPage.gotoNew();
  });

  test('Scenario 1: Create Custom V60 Pour-Over Recipe with Details & Save', async ({ page }) => {
    // Fill Basic Recipe Info
    await recipeEditPage.nameInput.fill('Ultimate V60 Pour-Over');
    await recipeEditPage.ratioInput.fill('1:16');
    await recipeEditPage.totalWaterInput.fill('320');
    await recipeEditPage.selectDifficulty('Intermediate');
    await recipeEditPage.tempInput.fill('93');
    await recipeEditPage.selectGrindSize('Medium-Fine');
    await recipeEditPage.shortDescriptionInput.fill('Sweet & clean fruit forward extraction.');

    // Save Recipe
    await recipeEditPage.saveButton.click();

    // Verify Navigation to Recipe List or Detail
    await page.waitForURL(url => url.pathname.includes('/recipes'));
    await expect(page).toHaveURL(/.*recipes/);
    await expect(page.getByText('Ultimate V60 Pour-Over')).toBeVisible();
  });

  test('Scenario 2: Form Validation — Recipe Name Required Error', async ({ page }) => {
    // Leave name blank and attempt to save
    await recipeEditPage.saveButton.click();

    // Verify Error Message
    await expect(page.getByText('Recipe name is required.')).toBeVisible();
  });

  test('Scenario 3: Create Recipe with Custom Steps & Verify Save', async ({ page }) => {
    await recipeEditPage.nameInput.fill('Tetsu Kasuya 4:6 Method');
    await recipeEditPage.ratioInput.fill('1:15');
    await recipeEditPage.totalWaterInput.fill('300');

    // Add another step
    await recipeEditPage.addStepButton.click();

    // Save Recipe
    await recipeEditPage.saveButton.click();

    // Verify Navigation
    await page.waitForURL(url => url.pathname.includes('/recipes'));
    await expect(page.getByText('Tetsu Kasuya 4:6 Method')).toBeVisible();
  });
});
