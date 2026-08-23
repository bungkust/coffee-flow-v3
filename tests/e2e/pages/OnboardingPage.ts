import { Page, Locator, expect } from '@playwright/test';
import { resetAppState } from '../helpers/cleanData';

export class OnboardingPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly nextButton: Locator;
  readonly finishButton: Locator;
  readonly skipButton: Locator;
  readonly beanNameInput: Locator;
  readonly roasteryInput: Locator;
  readonly originInput: Locator;
  readonly altitudeInput: Locator;
  readonly tastingNotesInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByPlaceholder('Your Name');
    this.nextButton = page.getByRole('button', { name: /Next/i });
    this.finishButton = page.getByRole('button', { name: 'Finish Setup' });
    this.skipButton = page.getByRole('button', { name: 'Skip' });
    this.beanNameInput = page.getByPlaceholder(/Aroma Nativo|Holiday Blend/i);
    this.roasteryInput = page.getByPlaceholder(/Cap Kadal/i);
    this.originInput = page.getByPlaceholder(/Temanggung/i);
    this.altitudeInput = page.getByPlaceholder(/1700 masl/i);
    this.tastingNotesInput = page.getByPlaceholder(/Peach, Berries, Jasmine/i);
  }

  async goto() {
    await resetAppState(this.page);
    await this.page.goto('/onboarding');
  }

  getGoalButton(goalText: string): Locator {
    return this.page.getByRole('button', { name: goalText });
  }

  getUnitButton(unit: 'metric' | 'imperial'): Locator {
    return this.page.getByRole('button', { name: unit === 'metric' ? /Metric/i : /Imperial/i });
  }

  getBeanTypeButton(type: 'single_origin' | 'blend'): Locator {
    return this.page.getByRole('button', { name: type === 'single_origin' ? 'Single Origin' : 'Blend' });
  }

  async selectRoastLevel(levelLabel: 'Light' | 'Medium' | 'Dark') {
    const roastContainer = this.page.locator('div').filter({ hasText: /^Roast Level/ });
    await roastContainer.getByRole('button').first().click();
    await this.page.getByRole('button', { name: levelLabel, exact: true }).click();
  }

  async completeStep1Profile(name: string, goal: string, unit: 'metric' | 'imperial' = 'metric') {
    await expect(this.page.getByText('Step 1 — Profile')).toBeVisible();
    await this.nameInput.fill(name);
    await this.getGoalButton(goal).click();
    if (unit === 'imperial') {
      await this.getUnitButton('imperial').click();
    }
    await this.nextButton.click();
  }

  async completeStep2Equipment() {
    await expect(this.page.getByText('Step 2 — Equipment')).toBeVisible();
    await this.nextButton.click();
  }

  async toggleEquipmentMethod(methodName: string) {
    await this.page.getByRole('button', { name: methodName }).click();
  }

  async skipStep3Beans() {
    await expect(this.page.getByText('Step 3 — Beans')).toBeVisible();
    await this.skipButton.click();
  }
}
