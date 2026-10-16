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

    // Verify Navigation to Drink List
    await page.waitForURL(/.*\/drinks.*/);
    await expect(page).toHaveURL(/.*drinks.*/);
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
    await page.waitForURL(/.*\/drinks.*/);
    await expect(page).toHaveURL(/.*drinks.*/);
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

  test('Positive Scenario 4: Drink Preparation -> Serving Scaler & Checklist -> Flow -> Log Transition', async ({ page }) => {
    // Create drink first
    await drinkEditPage.nameInput.fill('Flow Test Cortado');
    await drinkEditPage.selectCategory('Hot');
    await drinkEditPage.addIngredient('18g Espresso Shot');
    await drinkEditPage.addIngredient('60ml Steamed Milk');
    await drinkEditPage.addInstruction('Extract 18g double shot espresso into glass.');
    await drinkEditPage.addInstruction('Steam 60ml milk with light microfoam.');
    await drinkEditPage.addInstruction('Pour milk evenly over espresso.');
    await drinkEditPage.saveButton.click();

    // Verify Navigation to Drink List
    await page.waitForURL(/.*\/drinks.*/);
    const drinkCard = page.getByText('Flow Test Cortado');
    await expect(drinkCard).toBeVisible();
    await drinkCard.click();

    // Verify DrinkDetailPage
    await page.waitForURL(/.*drinks\/[^/]+$/);
    const prepareButton = page.getByRole('button', { name: /Prepare Drink/i });
    await expect(prepareButton).toBeVisible();
    await prepareButton.click();

    // Verify DrinkPreparationPage
    await page.waitForURL(/.*\/prepare/);
    await expect(page.getByText(/Mise En Place/i)).toBeVisible();
    await expect(page.getByText(/Portion Scaler/i)).toBeVisible();

    // Test portion scaler
    const plusButton = page.getByRole('button', { name: /Increase servings/i });
    await plusButton.click();
    await expect(page.getByText('2x')).toBeVisible();

    // Complete all checklist items
    const checkItems = page.locator('main button').filter({ has: page.locator('div.size-6') });
    const count = await checkItems.count();
    for (let i = 0; i < count; i++) {
      await checkItems.nth(i).click();
    }

    // Start Flow
    const startFlowBtn = page.getByRole('button', { name: /Start Crafting Flow/i });
    await expect(startFlowBtn).toBeEnabled();
    await startFlowBtn.click();

    // Verify DrinkFlowPage
    await page.waitForURL(/.*\/flow/);
    await expect(page.getByText(/Step 1 of/i)).toBeVisible();

    // Advance through steps until finish
    let nextBtn = page.getByRole('button', { name: /Next Step|Finish & Log Drink/i });
    while (await nextBtn.isVisible()) {
      const btnText = await nextBtn.textContent();
      await nextBtn.click();
      if (btnText?.includes('Finish & Log Drink')) break;
      nextBtn = page.getByRole('button', { name: /Next Step|Finish & Log Drink/i });
    }

    // Verify DrinkLogPage
    await page.waitForURL(/.*\/drink-log\/.*/);
    await expect(page.getByText(/Sensory Evaluation/i)).toBeVisible();
  });

  test('Smart Import Scenario 1: Multi-drink import via AI sample and direct save', async ({ page }) => {
    // Navigate to drink list
    await page.goto('/drinks/list?base=coffee');
    await page.waitForLoadState('networkidle');

    // Open FAB and trigger Smart Import
    const fabButton = page.getByRole('button', { name: /Open actions/i });
    await fabButton.click();
    const importAction = page.getByRole('button', { name: /Import Drink/i });
    await importAction.click();

    // Verify modal is open
    await expect(page.getByText(/Smart Import Drink/i)).toBeVisible();

    // Switch to AI Prompt Assist
    const aiTab = page.getByRole('button', { name: /AI Prompt Assist/i });
    await aiTab.click();

    // Load sample (3 drinks: Iced Caramel Oat Macchiato, Kyoto Dirty Matcha Latte, Classic Hot Chocolate)
    const trySampleBtn = page.getByRole('button', { name: /Try Sample/i });
    await trySampleBtn.click();

    // Extract Drink
    const extractBtn = page.getByRole('button', { name: /Extract Drink/i });
    await extractBtn.click();

    // Verify multi-drink list appears showing 3 drinks found
    await expect(page.getByText('3 drinks found', { exact: true })).toBeVisible();
    await expect(page.getByText('Iced Caramel Oat Macchiato')).toBeVisible();
    await expect(page.getByText('Kyoto Dirty Matcha Latte')).toBeVisible();
    await expect(page.getByText('Classic Hot Chocolate')).toBeVisible();

    // Click on the first drink to view detailed preview
    await page.getByText('Iced Caramel Oat Macchiato').click();
    await expect(page.getByText(/Drink recipe extracted!/i)).toBeVisible();
    await expect(page.getByText(/160ml Oat Milk/i)).toBeVisible();
    await expect(page.getByText(/2 shot Espresso/i)).toBeVisible();

    // Save directly
    const saveDirectlyBtn = page.getByRole('button', { name: /Save Directly/i });
    await saveDirectlyBtn.click();

    // Now advances to next unsaved drink or back to list
    await expect(page.getByText('Drink recipe extracted!')).toBeVisible();
  });

  test('Smart Import Scenario 2: Quick Parse offline recipe text and customize in editor', async ({ page }) => {
    await page.goto('/drinks/list?base=coffee');
    await page.waitForLoadState('networkidle');

    // Open FAB and trigger Smart Import
    const fabButton = page.getByRole('button', { name: /Open actions/i });
    await fabButton.click();
    await page.getByRole('button', { name: /Import Drink/i }).click();

    // Paste offline recipe
    const offlineInput = page.locator('#offline-text-input');
    await offlineInput.fill(`Iced Vanilla Coconut Cold Brew
Bahan:
- 150ml cold brew coffee
- 60ml coconut milk
- 2 pump vanilla syrup
- 120g es batu
Langkah:
1. Masukkan es batu ke dalam gelas saji
2. Tuangkan cold brew dan vanilla syrup
3. Tambahkan coconut milk di atasnya`);

    // Extract
    await page.getByRole('button', { name: /Extract Drink/i }).click();

    // Verify single drink preview
    await expect(page.getByText(/Drink recipe extracted!/i)).toBeVisible();
    await expect(page.getByText('Iced Vanilla Coconut Cold Brew')).toBeVisible();
    await expect(page.getByText(/150ml cold brew coffee/i)).toBeVisible();

    // Click Customize in Editor
    await page.getByRole('button', { name: /Customize in Editor/i }).click();

    // Verify DrinkEditPage opens with prefilled fields
    await page.waitForURL(/.*\/drinks\/new\/edit/);
    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).toHaveValue('Iced Vanilla Coconut Cold Brew');
  });
});

