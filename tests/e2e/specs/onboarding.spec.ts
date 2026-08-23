import { test, expect } from '@playwright/test';
import { OnboardingPage } from '../pages/OnboardingPage';

test.describe('Comprehensive Onboarding Options & User Flow Test Suite', () => {
  let onboarding: OnboardingPage;

  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
    await onboarding.goto();
  });

  test('Scenario 1: Single Origin Beans + Metric Unit + "Discover new beans" Goal', async ({ page }) => {
    // Step 1: Profile
    await onboarding.completeStep1Profile('Barista Clara', 'Discover new beans', 'metric');

    // Step 2: Equipment
    await onboarding.completeStep2Equipment();

    // Step 3: Single Origin Beans
    await onboarding.getBeanTypeButton('single_origin').click();
    await onboarding.beanNameInput.fill('Gesha Panama Reserve');
    await onboarding.roasteryInput.fill('Panama Coffee Co');
    await onboarding.originInput.fill('Boquete, Panama');
    await onboarding.altitudeInput.fill('1800 masl');
    await onboarding.selectRoastLevel('Light');
    await onboarding.tastingNotesInput.fill('Jasmine, Bergamot, Peach');

    // Submit
    await onboarding.finishButton.click();

    // Verify Home
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);
    await expect(page.getByText(/Clara/i)).toBeVisible();
  });

  test('Scenario 2: Coffee Blend + Imperial Unit + "Track my brews" Goal', async ({ page }) => {
    // Step 1: Profile
    await onboarding.completeStep1Profile('Barista David', 'Track my brews', 'imperial');

    // Step 2: Equipment
    await onboarding.completeStep2Equipment();

    // Step 3: Blend Beans
    await onboarding.getBeanTypeButton('blend').click();
    await onboarding.beanNameInput.fill('House Espresso Blend');
    await onboarding.roasteryInput.fill('Kadal Roasters');
    await onboarding.selectRoastLevel('Dark');

    // Submit
    await onboarding.finishButton.click();

    // Verify Home
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);
    await expect(page.getByText(/David/i)).toBeVisible();
  });

  test('Scenario 3: Skipping Step 3 (Beans Inventory) + "Just exploring" Goal', async ({ page }) => {
    // Step 1: Profile
    await onboarding.completeStep1Profile('Barista Emma', 'Just exploring', 'metric');

    // Step 2: Equipment
    await onboarding.completeStep2Equipment();

    // Step 3: Skip Beans
    await onboarding.skipStep3Beans();

    // Verify Home
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);
    await expect(page.getByText(/Emma/i)).toBeVisible();
  });

  test('Scenario 4: Equipment Customization (Toggling Methods on/off)', async ({ page }) => {
    // Step 1: Profile
    await onboarding.completeStep1Profile('Barista Frank', 'Improve my skills', 'metric');

    // Step 2: Custom Equipment Selection
    await expect(page.getByText('Step 2 — Equipment')).toBeVisible();

    // Toggle custom equipment methods
    await onboarding.toggleEquipmentMethod('Chemex');
    await onboarding.toggleEquipmentMethod('French Press');

    // Proceed to Step 3 and Finish
    await onboarding.nextButton.click();
    await onboarding.skipStep3Beans();

    // Verify Home
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);
    await expect(page.getByText(/Frank/i)).toBeVisible();
  });

  test('Scenario 5: Form Validation (Next Button Disabled when Name is empty)', async () => {
    await expect(onboarding.nameInput).toBeVisible();
    await expect(onboarding.nextButton).toBeDisabled();

    // Fill name but don't select goal
    await onboarding.nameInput.fill('Alex');
    await expect(onboarding.nextButton).toBeDisabled();

    // Select goal -> Next button becomes enabled
    await onboarding.getGoalButton('Improve my skills').click();
    await expect(onboarding.nextButton).toBeEnabled();
  });
});
