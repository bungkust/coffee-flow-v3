# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-user-lifecycle.spec.ts >> End-to-End User Journey: Complete Lifecycle & Backup/Restore Audit >> Complete Flow: Onboarding -> Recipe -> Drink -> Gear -> Backup -> Reset -> Restore from Welcome -> Integrity Check
- Location: tests/e2e/specs/full-user-lifecycle.spec.ts:10:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/home" until "load"
  navigated to "http://localhost:5174/welcome"
============================================================
```

# Page snapshot

```yaml
- generic [ref=f8e3]:
  - img "Freshly brewed coffee" [ref=f8e5]
  - generic [ref=f8e7]:
    - generic [ref=f8e8]: coffee_maker
    - generic [ref=f8e11]:
      - heading "CoffeeFlow" [level=1] [ref=f8e12]
      - paragraph [ref=f8e13]: Brew Perfection
    - paragraph [ref=f8e14]: Discover recipes, track your brews, and master the art of coffee making.
  - generic [ref=f8e15]:
    - button "Start New Journey" [ref=f8e16] [cursor=pointer]:
      - generic [ref=f8e18]: arrow_forward
    - button "Restore Backup Data" [ref=f8e19] [cursor=pointer]:
      - generic [ref=f8e20]: cloud_sync
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { OnboardingPage } from '../pages/OnboardingPage';
  3   | import { RecipeEditPage } from '../pages/RecipeEditPage';
  4   | import { DrinkEditPage } from '../pages/DrinkEditPage';
  5   | import { GearEditPage } from '../pages/GearEditPage';
  6   | import { BackupRestorePage } from '../pages/BackupRestorePage';
  7   | import { resetAppState } from '../helpers/cleanData';
  8   | 
  9   | test.describe('End-to-End User Journey: Complete Lifecycle & Backup/Restore Audit', () => {
  10  |   test('Complete Flow: Onboarding -> Recipe -> Drink -> Gear -> Backup -> Reset -> Restore from Welcome -> Integrity Check', async ({ page }) => {
  11  |     // Page Objects Initialization
  12  |     const onboardingPage = new OnboardingPage(page);
  13  |     const recipeEditPage = new RecipeEditPage(page);
  14  |     const drinkEditPage = new DrinkEditPage(page);
  15  |     const gearEditPage = new GearEditPage(page);
  16  |     const backupRestorePage = new BackupRestorePage(page);
  17  | 
  18  |     // Initial Fresh App State Reset
  19  |     await resetAppState(page);
  20  | 
  21  |     // -------------------------------------------------------------
  22  |     // STEP 1: Complete Onboarding
  23  |     // -------------------------------------------------------------
  24  |     await page.goto('/onboarding');
  25  |     await onboardingPage.completeStep1Profile('Barista Lifecycle Test', 'Track my brews', 'metric');
  26  |     await onboardingPage.completeStep2Equipment();
  27  |     await onboardingPage.skipStep3Beans();
  28  |     await onboardingPage.completeStep4SmartImport(false);
  29  | 
  30  |     await page.waitForURL('**/home');
  31  |     await expect(page).toHaveURL(/.*home/);
  32  |     await expect(page.getByText('Barista Lifecycle Test')).toBeVisible();
  33  | 
  34  |     // -------------------------------------------------------------
  35  |     // STEP 2: Create a Custom Brew Recipe
  36  |     // -------------------------------------------------------------
  37  |     await page.goto('/recipes/new/edit');
  38  |     await recipeEditPage.createRecipe('E2E Lifecycle V60 Special', '1:15', 300);
  39  | 
  40  |     await page.waitForURL(url => !url.pathname.endsWith('/edit'));
  41  |     await page.waitForTimeout(500);
  42  | 
  43  |     // -------------------------------------------------------------
  44  |     // STEP 3: Create a Custom Drink Recipe
  45  |     // -------------------------------------------------------------
  46  |     await page.goto('/drinks/new/edit');
  47  |     await drinkEditPage.createDrink('E2E Lifecycle Iced Latte', 'Cold', ['18g Espresso']);
  48  | 
  49  |     await page.waitForURL(/.*\/drinks.*/);
  50  |     await expect(page.getByText('E2E Lifecycle Iced Latte')).toBeVisible();
  51  |     await page.waitForTimeout(500);
  52  | 
  53  |     // -------------------------------------------------------------
  54  |     // STEP 4: Create a Gear Item
  55  |     // -------------------------------------------------------------
  56  |     await page.goto('/pantry');
  57  |     await page.goto('/pantry/add/dripper');
  58  |     await gearEditPage.createGear('E2E Lifecycle Dripper', 'Hario');
  59  | 
  60  |     // Wait for URL to land back on /pantry
  61  |     await page.waitForURL('**/pantry');
  62  | 
  63  |     // Switch to Gear Tab in Pantry Page
  64  |     await page.getByText('Gear', { exact: true }).click();
  65  |     await expect(page.getByText('E2E Lifecycle Dripper')).toBeVisible();
  66  |     await page.waitForTimeout(500);
  67  | 
  68  |     // -------------------------------------------------------------
  69  |     // STEP 5: Perform Local Backup & Export JSON Backup Payload
  70  |     // -------------------------------------------------------------
  71  |     await page.goto('/settings/backup');
  72  |     await backupRestorePage.performBackupNow();
  73  |     await expect(page.getByText(/Ready/i)).toBeVisible();
  74  | 
  75  |     const backupJson = await backupRestorePage.exportLatestBackupSnapshot();
  76  |     expect(backupJson.length).toBeGreaterThan(50);
  77  |     expect(backupJson).toContain('E2E Lifecycle Dripper');
  78  | 
  79  |     // -------------------------------------------------------------
  80  |     // STEP 6: Full Device & Database Reset (Simulate Clean Phone)
  81  |     // -------------------------------------------------------------
  82  |     await resetAppState(page);
  83  |     await page.waitForTimeout(500);
  84  | 
  85  |     // Navigate to Welcome Screen on fresh device
  86  |     await page.goto('/welcome');
  87  |     await expect(page.getByText(/Start New Journey/i)).toBeVisible();
  88  | 
  89  |     // -------------------------------------------------------------
  90  |     // STEP 7: Trigger Restore Backup Data from Welcome Screen
  91  |     // -------------------------------------------------------------
  92  |     await page.getByRole('button', { name: /Restore Backup Data/i }).click();
  93  |     await page.waitForURL('**/settings/backup');
  94  | 
  95  |     // Import JSON Backup File & Confirm "Restore Now"
  96  |     await backupRestorePage.importBackupFile(backupJson);
  97  | 
  98  |     // -------------------------------------------------------------
  99  |     // STEP 8: Integrity Audit — Verify Restored User Data
  100 |     // -------------------------------------------------------------
> 101 |     await page.waitForURL('**/home');
      |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  102 |     await expect(page).toHaveURL(/.*home/);
  103 |     await expect(page.getByText('Barista Lifecycle Test')).toBeVisible();
  104 | 
  105 |     // Verify Restored Custom Drink Recipe
  106 |     await page.goto('/drinks/list?base=coffee');
  107 |     await expect(page.getByText('E2E Lifecycle Iced Latte')).toBeVisible();
  108 | 
  109 |     // Verify Restored Gear Item on Pantry Gear Tab
  110 |     await page.goto('/pantry');
  111 |     await page.getByText('Gear', { exact: true }).click();
  112 |     await expect(page.getByText('E2E Lifecycle Dripper')).toBeVisible();
  113 |   });
  114 | });
  115 | 
```