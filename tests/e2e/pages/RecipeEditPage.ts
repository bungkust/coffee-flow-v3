import { Page, Locator, expect } from '@playwright/test';
import { resetAppState } from '../helpers/cleanData';

export class RecipeEditPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly ratioInput: Locator;
  readonly totalWaterInput: Locator;
  readonly tempInput: Locator;
  readonly shortDescriptionInput: Locator;
  readonly addStepButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByPlaceholder('e.g. Even Extraction Flow');
    this.ratioInput = page.getByPlaceholder('1:15');
    this.totalWaterInput = page.getByPlaceholder('250');
    this.tempInput = page.getByPlaceholder('92');
    this.shortDescriptionInput = page.getByPlaceholder('A brief summary...');
    this.addStepButton = page.getByRole('button', { name: 'Add Step' });
    this.saveButton = page.getByRole('button', { name: /Save Recipe/i });
  }

  async gotoNew() {
    await resetAppState(this.page);
    await this.page.goto('/recipes/new/edit');
  }

  async selectDropdown(labelRegex: RegExp, value: string) {
    const container = this.page.locator('div').filter({ hasText: labelRegex });
    await container.getByRole('button').first().click();
    await container.getByRole('button').filter({ hasText: value }).last().click();
  }

  async selectGrindSize(size: string) {
    return this.selectDropdown(/^Grind Size/, size);
  }

  async selectDifficulty(level: 'Beginner' | 'Intermediate' | 'Advanced') {
    return this.selectDropdown(/^Difficulty/, level);
  }

  async fillStep(index: number, label: string, duration: number, weight: number) {
    const stepCards = this.page.locator('.bg-md-surface-container-high');
    const targetCard = stepCards.nth(index);

    const stepLabelInput = targetCard.getByPlaceholder('Step label...');
    if (await stepLabelInput.isVisible()) {
      await stepLabelInput.fill(label);
    }

    const durationInput = targetCard.getByPlaceholder('30');
    if (await durationInput.isVisible()) {
      await durationInput.fill(duration.toString());
    }

    const weightInput = targetCard.getByPlaceholder('50');
    if (await weightInput.isVisible()) {
      await weightInput.fill(weight.toString());
    }
  }

  async createRecipe(name: string, ratio = '1:15', totalWater = 250) {
    await expect(this.saveButton).toBeVisible();
    await this.nameInput.fill(name);
    await this.ratioInput.fill(ratio);
    await this.totalWaterInput.fill(totalWater.toString());
    await this.addStepButton.click();
    await expect(this.page.getByPlaceholder('Step label...').first()).toBeVisible();
    await this.saveButton.click();
  }
}
