# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: brew-calculation-and-log.spec.ts >> Brewing Calculation & Unsaved Log Integration Test Suite >> Scenario 4: Complete Brew Timer & Direct "Back to Home" Persistence Audit
- Location: tests/e2e/specs/brew-calculation-and-log.spec.ts:176:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Done!')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Done!')

```

```yaml
- banner:
  - text: Brewing Method
  - heading "V60 - Kurasu Japanese Iced Pour-Over" [level=1]
- text: Phase 1 of 8 hourglass_empty Pour ~0s • Rest ~10s 0:10
- heading "Prep Ice & Tare Scale" [level=2]
- paragraph: Place 70g ice cubes into server, attach V60, add 70g medium-fine coffee & tare scale.
- text: Total Water 0g / 220ml
- heading "Next Up" [level=3]
- text: "2"
- heading "Pour +40g" [level=4]
- paragraph: "Target: 40g on scale"
- text: 0:10 3
- heading "Bloom Rest Interval" [level=4]
- paragraph: Allow coffee to bloom and saturate grounds until 0:45.
- text: 0:35 4
- heading "Pour +60g" [level=4]
- paragraph: "Target: 100g on scale"
- text: 0:10 5
- heading "Rest Interval 1" [level=4]
- paragraph: Wait 35s for drawdown (until 1:30).
- text: 0:35 6
- heading "Pour +50g" [level=4]
- paragraph: "Target: 150g on scale"
- text: 0:10 7
- heading "Final Drawdown & Melt" [level=4]
- paragraph: Stir coffee bed once. Allow brew to drain into ice until 2:10.
- text: 0:30 8
- heading "Stir & Serve over Fresh Ice" [level=4]
- paragraph: Swirl server until ice in server completely melts. Pour into a glass filled with fresh ice cubes & enjoy!
- text: 0:10
- button "play_arrow Start Brew"
```

# Test source

```ts
  120 |     await expect(startBrewBtn).toBeEnabled();
  121 |     await startBrewBtn.click();
  122 |     await page.waitForURL('**/brew-flow');
  123 | 
  124 |     // 3. Click "Start Brew" button on BrewFlowPage to activate timer engine
  125 |     const initialStartBtn = page.getByRole('button', { name: 'Start Brew' });
  126 |     if (await initialStartBtn.isVisible()) {
  127 |       await initialStartBtn.click();
  128 |       await page.waitForTimeout(200);
  129 |     }
  130 | 
  131 |     // 4. Fast-forward brew steps until timer completes (Done! screen)
  132 |     for (let step = 0; step < 12; step++) {
  133 |       if (await page.getByText('Done!').isVisible()) break;
  134 | 
  135 |       const modalConfirmBtn = page.locator('.fixed.inset-0').getByRole('button', { name: /Skip Step/i });
  136 |       if (await modalConfirmBtn.isVisible()) {
  137 |         await modalConfirmBtn.click();
  138 |         await page.waitForTimeout(300);
  139 |         continue;
  140 |       }
  141 | 
  142 |       const mainSkipBtn = page.getByRole('button', { name: /^Skip$/i });
  143 |       if (await mainSkipBtn.isVisible()) {
  144 |         await mainSkipBtn.click();
  145 |         await page.waitForTimeout(300);
  146 |       }
  147 |     }
  148 | 
  149 |     // 5. Verify Done screen is visible
  150 |     await expect(page.getByText('Done!')).toBeVisible();
  151 | 
  152 |     // 6. Click "Finish & Log Brew" to go to Brew Log Page
  153 |     await page.getByRole('button', { name: /Finish & Log Brew/i }).click();
  154 |     await page.waitForURL('**/brew-log');
  155 |     await expect(page.getByText(/How was it?/i)).toBeVisible();
  156 | 
  157 |     // 7. Do NOT submit the log form — Click Discard button
  158 |     await page.getByRole('button', { name: /Discard/i }).click();
  159 | 
  160 |     // Confirm Discard modal
  161 |     const modalDiscardBtn = page.locator('.fixed.inset-0').getByRole('button', { name: 'Discard Log' });
  162 |     await expect(modalDiscardBtn).toBeVisible();
  163 |     await modalDiscardBtn.click();
  164 | 
  165 |     // 8. Verify navigation lands on Homepage (/home)
  166 |     await page.waitForURL('**/home');
  167 |     await expect(page).toHaveURL(/.*home/);
  168 | 
  169 |     // 9. Audit Journal / Brew Logs to check if log is saved in database
  170 |     await page.goto('/journal');
  171 |     await page.waitForTimeout(500);
  172 |     const hasLogEntry = await page.getByText('Kurasu Japanese Iced Pour-Over').isVisible();
  173 |     console.log(`[AUDIT RESULT - DISCARD] Discarded Brew Log in Journal Visibility: ${hasLogEntry}`);
  174 |   });
  175 | 
  176 |   test('Scenario 4: Complete Brew Timer & Direct "Back to Home" Persistence Audit', async ({ page }) => {
  177 |     // 1. Navigate to Preparation Page
  178 |     await page.goto('/recipes/v60-kurasu-japanese-iced-pour-over/prepare');
  179 |     await expect(page.getByText('Preparation', { exact: true })).toBeVisible();
  180 | 
  181 |     // Complete checklist
  182 |     const checkItems = page.locator('main button:has(.typescale-body-medium)');
  183 |     const count = await checkItems.count();
  184 |     for (let i = 0; i < count; i++) {
  185 |       await checkItems.nth(i).click();
  186 |       await page.waitForTimeout(100);
  187 |     }
  188 | 
  189 |     // 2. Start Brew Flow Timer
  190 |     const startBrewBtn = page.getByRole('button', { name: /I'm Ready, Start Timer/i });
  191 |     await expect(startBrewBtn).toBeEnabled();
  192 |     await startBrewBtn.click();
  193 |     await page.waitForURL('**/brew-flow');
  194 | 
  195 |     // Activate timer engine
  196 |     const initialStartBtn = page.getByRole('button', { name: 'Start Brew' });
  197 |     if (await initialStartBtn.isVisible()) {
  198 |       await initialStartBtn.click();
  199 |       await page.waitForTimeout(200);
  200 |     }
  201 | 
  202 |     // 3. Fast-forward brew steps until Done! screen
  203 |     for (let step = 0; step < 12; step++) {
  204 |       if (await page.getByText('Done!').isVisible()) break;
  205 | 
  206 |       const modalConfirmBtn = page.locator('.fixed.inset-0').getByRole('button', { name: /Skip Step/i });
  207 |       if (await modalConfirmBtn.isVisible()) {
  208 |         await modalConfirmBtn.click();
  209 |         await page.waitForTimeout(300);
  210 |         continue;
  211 |       }
  212 | 
  213 |       const mainSkipBtn = page.getByRole('button', { name: /^Skip$/i });
  214 |       if (await mainSkipBtn.isVisible()) {
  215 |         await mainSkipBtn.click();
  216 |         await page.waitForTimeout(300);
  217 |       }
  218 |     }
  219 | 
> 220 |     await expect(page.getByText('Done!')).toBeVisible();
      |                                           ^ Error: expect(locator).toBeVisible() failed
  221 | 
  222 |     // 4. Click "Back to Home" directly on Done screen (without going to /brew-log)
  223 |     await page.getByRole('button', { name: /Back to Home/i }).click();
  224 | 
  225 |     // 5. Verify navigation lands on Homepage (/home)
  226 |     await page.waitForURL('**/home');
  227 |     await expect(page).toHaveURL(/.*home/);
  228 | 
  229 |     // 6. Audit Journal / Brew Logs to check if auto-saved log entry exists in database
  230 |     await page.goto('/journal');
  231 |     await page.waitForTimeout(500);
  232 |     const hasLogEntry = await page.getByText('Kurasu Japanese Iced Pour-Over').isVisible();
  233 |     console.log(`[AUDIT RESULT - BACK TO HOME] Direct Back-to-Home Brew Log in Journal Visibility: ${hasLogEntry}`);
  234 |   });
  235 | });
  236 | 
```