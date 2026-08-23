import { Page, Locator, expect } from '@playwright/test';
import { resetAppState } from '../helpers/cleanData';

export class DrinkEditPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly addIngredientButton: Locator;
  readonly addInstructionButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByPlaceholder('e.g. Caramel Macchiato');
    this.addIngredientButton = page.getByRole('button', { name: 'Add Ingredient' });
    this.addInstructionButton = page.getByRole('button', { name: 'Add Step' });
    this.saveButton = page.getByRole('button', { name: /Save Drink/i });
  }

  async gotoNew() {
    await resetAppState(this.page);
    await this.page.goto('/drinks/new/edit');
  }

  async selectCategory(categoryLabel: 'Hot' | 'Cold') {
    const catContainer = this.page.locator('div').filter({ hasText: /^Category/ });
    await catContainer.getByRole('button').first().click();
    await catContainer.getByRole('button').filter({ hasText: categoryLabel }).last().click();
  }

  async addIngredient(ingredientText: string) {
    await this.addIngredientButton.click();
    const inputs = this.page.getByPlaceholder('e.g. 18g espresso, 120ml milk');
    await inputs.last().fill(ingredientText);
  }

  async addInstruction(instructionText: string) {
    await this.addInstructionButton.click();
    const textareas = this.page.getByPlaceholder('Describe this step...');
    await textareas.last().fill(instructionText);
  }

  async createDrink(name: string, category: 'Hot' | 'Cold' = 'Cold', ingredients: string[] = []) {
    await expect(this.saveButton).toBeVisible();
    await this.nameInput.fill(name);
    await this.selectCategory(category);

    for (const item of ingredients) {
      await this.addIngredient(item);
    }

    await this.saveButton.click();
  }

  async removeIngredient(index: number) {
    const deleteButtons = this.page.locator('section').filter({ hasText: 'Ingredients' }).locator('button:has(.material-symbols-outlined)');
    await deleteButtons.nth(index).click();
  }

  async removeInstruction(index: number) {
    const deleteButtons = this.page.locator('section').filter({ hasText: 'Instructions' }).locator('button:has(.material-symbols-outlined)');
    await deleteButtons.nth(index).click();
  }
}
