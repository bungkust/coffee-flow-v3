import { test, expect } from '@playwright/test';
import { resetAppState } from '../helpers/cleanData';

test.describe('Brewing Calculation & Unsaved Log Integration Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test('Scenario 1: Japanese V60 Recipe Detail & Dynamic Preparation Scaling (Dose & Ice)', async ({ page }) => {
    // 1. Open Kurasu Japanese Iced V60 Pour-Over Recipe
    await page.goto('/recipes/v60-kurasu-japanese-iced-pour-over');
    await expect(page.getByText('Kurasu Japanese Iced Pour-Over')).toBeVisible();

    // Verify Initial Recipe Detail Stats (exact matches)
    await expect(page.getByText('16g', { exact: true })).toBeVisible(); // Coffee Dose
    await expect(page.getByText('91°C', { exact: true })).toBeVisible(); // Water Temp

    // 2. Click Start Brewing to open Preparation Page
    await page.getByRole('button', { name: /Start Brewing/i }).click();
    await page.waitForURL('**/prepare');
    await expect(page.getByText('Preparation', { exact: true })).toBeVisible();

    // Verify Preparation Initial Calculations
    // Coffee: 16.0g, Hot Water: 150ml, Ice: 70g
    await expect(page.getByText('16.0g').first()).toBeVisible();
    await expect(page.getByText('150ml').first()).toBeVisible();
    await expect(page.getByText('70g').first()).toBeVisible();

    // 3. Test Coffee Dose Stepper (+0.5g twice = +1.0g -> 17.0g)
    const plusButtons = page.getByRole('button', { name: '+' });
    const dosePlusButton = plusButtons.first();

    await dosePlusButton.click();
    await page.waitForTimeout(100);
    await dosePlusButton.click();
    await page.waitForTimeout(100);

    // Verify Coffee Dose recalculated to 17.0g
    await expect(page.getByText('17.0g').first()).toBeVisible();

    // Verify Ice Weight recalculated dynamically (70 * (17 / 16) = ~74g)
    await expect(page.getByText('74g').first()).toBeVisible();

    // 4. Test Ice Weight Stepper (+5g twice = +10g -> 84g)
    const icePlusButton = plusButtons.nth(1);
    if (await icePlusButton.isVisible()) {
      await icePlusButton.click();
      await page.waitForTimeout(100);
      await icePlusButton.click();
      await page.waitForTimeout(100);

      // Verify Custom Ice Weight updated to 84g
      await expect(page.getByText('84g').first()).toBeVisible();
    }
  });

  test('Scenario 2: Preparation Checklist & Start Brew Execution Flow', async ({ page }) => {
    await page.goto('/recipes/v60-kurasu-japanese-iced-pour-over/prepare');
    await expect(page.getByText('Preparation', { exact: true })).toBeVisible();

    // Select bean if dropdown options exist
    const selects = page.locator('select');
    const selectCount = await selects.count();
    for (let s = 0; s < selectCount; s++) {
      const select = selects.nth(s);
      if (await select.isVisible()) {
        const optionCount = await select.locator('option').count();
        if (optionCount > 1) {
          await select.selectOption({ index: 1 });
        }
      }
    }

    // Complete all checklist item buttons to satisfy isReady
    const checkItems = page.locator('main button:has(.typescale-body-medium)');
    const count = await checkItems.count();
    for (let i = 0; i < count; i++) {
      await checkItems.nth(i).click();
      await page.waitForTimeout(100);
    }

    // Start Brew button should be enabled
    const startBrewBtn = page.getByRole('button', { name: /I'm Ready, Start Timer/i });
    await expect(startBrewBtn).toBeEnabled();
    await startBrewBtn.click();

    // Verify navigation to Brew Flow timer
    await page.waitForURL('**/brew-flow');
    await expect(page.getByText(/V60 - Kurasu Japanese Iced Pour-Over/i)).toBeVisible();
  });

  test('Scenario 3: Complete Brew Execution & Discard Brew Log Persistence Audit', async ({ page }) => {
    // 1. Navigate to Preparation Page
    await page.goto('/recipes/v60-kurasu-japanese-iced-pour-over/prepare');
    await expect(page.getByText('Preparation', { exact: true })).toBeVisible();

    // Select bean/filter if dropdown options exist
    const selects = page.locator('select');
    const selectCount = await selects.count();
    for (let s = 0; s < selectCount; s++) {
      const select = selects.nth(s);
      if (await select.isVisible()) {
        const optionCount = await select.locator('option').count();
        if (optionCount > 1) {
          await select.selectOption({ index: 1 });
        }
      }
    }

    // Complete checklist
    const checkItems = page.locator('main button:has(.typescale-body-medium)');
    const count = await checkItems.count();
    for (let i = 0; i < count; i++) {
      await checkItems.nth(i).click();
      await page.waitForTimeout(100);
    }

    // 2. Start Brew Flow Timer
    const startBrewBtn = page.getByRole('button', { name: /I'm Ready, Start Timer/i });
    await expect(startBrewBtn).toBeEnabled();
    await startBrewBtn.click();
    await page.waitForURL('**/brew-flow');

    // 3. Click "Start Brew" button on BrewFlowPage to activate timer engine
    const initialStartBtn = page.getByRole('button', { name: 'Start Brew' });
    if (await initialStartBtn.isVisible()) {
      await initialStartBtn.click();
      await page.waitForTimeout(200);
    }

    // 4. Fast-forward brew steps until timer completes (Done! screen)
    for (let step = 0; step < 12; step++) {
      if (await page.getByText('Done!').isVisible()) break;

      const modalConfirmBtn = page.locator('.fixed.inset-0').getByRole('button', { name: /Skip Step/i });
      if (await modalConfirmBtn.isVisible()) {
        await modalConfirmBtn.click();
        await page.waitForTimeout(300);
        continue;
      }

      const mainSkipBtn = page.getByRole('button', { name: /^Skip$/i });
      if (await mainSkipBtn.isVisible()) {
        await mainSkipBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 5. Verify Done screen is visible
    await expect(page.getByText('Done!')).toBeVisible();

    // 6. Click "Finish & Log Brew" to go to Brew Log Page
    await page.getByRole('button', { name: /Finish & Log Brew/i }).click();
    await page.waitForURL('**/brew-log');
    await expect(page.getByText(/How was it?/i)).toBeVisible();

    // 7. Do NOT submit the log form — Click Discard button
    await page.getByRole('button', { name: /Discard/i }).click();

    // Confirm Discard modal
    const modalDiscardBtn = page.locator('.fixed.inset-0').getByRole('button', { name: 'Discard Log' });
    await expect(modalDiscardBtn).toBeVisible();
    await modalDiscardBtn.click();

    // 8. Verify navigation lands on Homepage (/home)
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);

    // 9. Audit Journal / Brew Logs to check if log is saved in database
    await page.goto('/journal');
    await page.waitForTimeout(500);
    const hasLogEntry = await page.getByText('Kurasu Japanese Iced Pour-Over').isVisible();
    console.log(`[AUDIT RESULT - DISCARD] Discarded Brew Log in Journal Visibility: ${hasLogEntry}`);
  });

  test('Scenario 4: Complete Brew Timer & Direct "Back to Home" Persistence Audit', async ({ page }) => {
    // 1. Navigate to Preparation Page
    await page.goto('/recipes/v60-kurasu-japanese-iced-pour-over/prepare');
    await expect(page.getByText('Preparation', { exact: true })).toBeVisible();

    // Complete checklist
    const checkItems = page.locator('main button:has(.typescale-body-medium)');
    const count = await checkItems.count();
    for (let i = 0; i < count; i++) {
      await checkItems.nth(i).click();
      await page.waitForTimeout(100);
    }

    // 2. Start Brew Flow Timer
    const startBrewBtn = page.getByRole('button', { name: /I'm Ready, Start Timer/i });
    await expect(startBrewBtn).toBeEnabled();
    await startBrewBtn.click();
    await page.waitForURL('**/brew-flow');

    // Activate timer engine
    const initialStartBtn = page.getByRole('button', { name: 'Start Brew' });
    if (await initialStartBtn.isVisible()) {
      await initialStartBtn.click();
      await page.waitForTimeout(200);
    }

    // 3. Fast-forward brew steps until Done! screen
    for (let step = 0; step < 12; step++) {
      if (await page.getByText('Done!').isVisible()) break;

      const modalConfirmBtn = page.locator('.fixed.inset-0').getByRole('button', { name: /Skip Step/i });
      if (await modalConfirmBtn.isVisible()) {
        await modalConfirmBtn.click();
        await page.waitForTimeout(300);
        continue;
      }

      const mainSkipBtn = page.getByRole('button', { name: /^Skip$/i });
      if (await mainSkipBtn.isVisible()) {
        await mainSkipBtn.click();
        await page.waitForTimeout(300);
      }
    }

    await expect(page.getByText('Done!')).toBeVisible();

    // 4. Click "Back to Home" directly on Done screen (without going to /brew-log)
    await page.getByRole('button', { name: /Back to Home/i }).click();

    // 5. Verify navigation lands on Homepage (/home)
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);

    // 6. Audit Journal / Brew Logs to check if auto-saved log entry exists in database
    await page.goto('/journal');
    await page.waitForTimeout(500);
    const hasLogEntry = await page.getByText('Kurasu Japanese Iced Pour-Over').isVisible();
    console.log(`[AUDIT RESULT - BACK TO HOME] Direct Back-to-Home Brew Log in Journal Visibility: ${hasLogEntry}`);
  });
});
