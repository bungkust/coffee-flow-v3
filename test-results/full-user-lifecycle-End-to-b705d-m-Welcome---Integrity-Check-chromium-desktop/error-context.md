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
Error: expect(locator).toBeVisible() failed

Locator:  getByText('E2E Lifecycle Dripper')
Expected: visible
Received: undefined

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('E2E Lifecycle Dripper')
  - Protocol error (Runtime.callFunctionOn): Internal server error, session closed.

```

# Page snapshot

```yaml
- generic [ref=f10e3]:
  - banner [ref=f10e4]:
    - heading "My Pantry" [level=1] [ref=f10e7]
    - generic [ref=f10e8]:
      - generic [ref=f10e9]: search
      - textbox "Search inventory..." [ref=f10e11]
    - generic [ref=f10e13]:
      - generic [ref=f10e14] [cursor=pointer]:
        - radio "Supplies" [ref=f10e15]
        - generic [ref=f10e16]: Supplies
      - generic [ref=f10e18] [cursor=pointer]:
        - radio "Gear" [checked] [active] [ref=f10e19]
        - generic [ref=f10e20]: Gear
  - main [ref=f10e22]:
    - generic [ref=f10e24]:
      - heading "Drippers" [level=2] [ref=f10e25]:
        - generic [ref=f10e26]: coffee_maker
        - text: Drippers
      - generic [ref=f10e29]:
        - heading "E2E Lifecycle Dripper" [level=3] [ref=f10e30]
        - paragraph
  - button [ref=f10e31] [cursor=pointer]:
    - generic [ref=f10e32]: add
  - navigation "Main navigation" [ref=f10e33]:
    - generic [ref=f10e34]:
      - link "Home" [ref=f10e35] [cursor=pointer]:
        - /url: /home
        - generic [ref=f10e36]: home
      - link "Brewing" [ref=f10e39] [cursor=pointer]:
        - /url: /brew-methods
        - generic [ref=f10e40]: coffee_maker
      - link "Pantry" [ref=f10e43] [cursor=pointer]:
        - /url: /pantry
        - generic [ref=f10e44]: inventory_2
      - link "Journal" [ref=f10e47] [cursor=pointer]:
        - /url: /journal
        - generic [ref=f10e48]: history_edu
```

# Test source

```ts
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
  28  | 
  29  |     await page.waitForURL('**/home');
  30  |     await expect(page).toHaveURL(/.*home/);
  31  |     await expect(page.getByText('Barista Lifecycle Test')).toBeVisible();
  32  | 
  33  |     // -------------------------------------------------------------
  34  |     // STEP 2: Create a Custom Brew Recipe
  35  |     // -------------------------------------------------------------
  36  |     await page.goto('/recipes/new/edit');
  37  |     await recipeEditPage.createRecipe('E2E Lifecycle V60 Special', '1:15', 300);
  38  | 
  39  |     await page.waitForURL(url => !url.pathname.endsWith('/edit'));
  40  |     await page.waitForTimeout(500);
  41  | 
  42  |     // -------------------------------------------------------------
  43  |     // STEP 3: Create a Custom Drink Recipe
  44  |     // -------------------------------------------------------------
  45  |     await page.goto('/drinks/new/edit');
  46  |     await drinkEditPage.createDrink('E2E Lifecycle Iced Latte', 'Cold', ['18g Espresso']);
  47  | 
  48  |     await page.waitForURL('**/drinks');
  49  |     await expect(page.getByText('E2E Lifecycle Iced Latte')).toBeVisible();
  50  |     await page.waitForTimeout(500);
  51  | 
  52  |     // -------------------------------------------------------------
  53  |     // STEP 4: Create a Gear Item
  54  |     // -------------------------------------------------------------
  55  |     await page.goto('/pantry');
  56  |     await page.goto('/pantry/add/dripper');
  57  |     await gearEditPage.createGear('E2E Lifecycle Dripper', 'Hario');
  58  | 
  59  |     // Wait for URL to land back on /pantry
  60  |     await page.waitForURL('**/pantry');
  61  | 
  62  |     // Switch to Gear Tab in Pantry Page
  63  |     await page.getByText('Gear', { exact: true }).click();
  64  |     await expect(page.getByText('E2E Lifecycle Dripper')).toBeVisible();
  65  |     await page.waitForTimeout(500);
  66  | 
  67  |     // -------------------------------------------------------------
  68  |     // STEP 5: Perform Local Backup & Export JSON Backup Payload
  69  |     // -------------------------------------------------------------
  70  |     await page.goto('/settings/backup');
  71  |     await backupRestorePage.performBackupNow();
  72  |     await expect(page.getByText(/Ready/i)).toBeVisible();
  73  | 
  74  |     const backupJson = await backupRestorePage.exportLatestBackupSnapshot();
  75  |     expect(backupJson.length).toBeGreaterThan(50);
  76  |     expect(backupJson).toContain('E2E Lifecycle Dripper');
  77  | 
  78  |     // -------------------------------------------------------------
  79  |     // STEP 6: Full Device & Database Reset (Simulate Clean Phone)
  80  |     // -------------------------------------------------------------
  81  |     await resetAppState(page);
  82  |     await page.waitForTimeout(500);
  83  | 
  84  |     // Navigate to Welcome Screen on fresh device
  85  |     await page.goto('/welcome');
  86  |     await expect(page.getByText(/Start New Journey/i)).toBeVisible();
  87  | 
  88  |     // -------------------------------------------------------------
  89  |     // STEP 7: Trigger Restore Backup Data from Welcome Screen
  90  |     // -------------------------------------------------------------
  91  |     await page.getByRole('button', { name: /Restore Backup Data/i }).click();
  92  |     await page.waitForURL('**/settings/backup');
  93  | 
  94  |     // Import JSON Backup File & Confirm "Restore Now"
  95  |     await backupRestorePage.importBackupFile(backupJson);
  96  | 
  97  |     // -------------------------------------------------------------
  98  |     // STEP 8: Integrity Audit — Verify Restored User Data
  99  |     // -------------------------------------------------------------
  100 |     await page.waitForURL('**/home');
  101 |     await expect(page).toHaveURL(/.*home/);
  102 |     await expect(page.getByText('Barista Lifecycle Test')).toBeVisible();
  103 | 
  104 |     // Verify Restored Custom Drink Recipe
  105 |     await page.goto('/drinks');
  106 |     await expect(page.getByText('E2E Lifecycle Iced Latte')).toBeVisible();
  107 | 
  108 |     // Verify Restored Gear Item on Pantry Gear Tab
  109 |     await page.goto('/pantry');
  110 |     await page.getByText('Gear', { exact: true }).click();
> 111 |     await expect(page.getByText('E2E Lifecycle Dripper')).toBeVisible();
      |                                                           ^ Error: expect(locator).toBeVisible() failed
  112 |   });
  113 | });
  114 | 
```