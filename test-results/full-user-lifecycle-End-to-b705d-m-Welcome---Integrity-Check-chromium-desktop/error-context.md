# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-user-lifecycle.spec.ts >> End-to-End User Journey: Complete Lifecycle & Backup/Restore Audit >> Complete Flow: Onboarding -> Recipe -> Drink -> Gear -> Backup -> Reset -> Restore from Welcome -> Integrity Check
- Location: tests/e2e/specs/full-user-lifecycle.spec.ts:10:3

# Error details

```
Error: Channel closed
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Save Recipe/i })
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /Save Recipe/i })
  - Target page, context or browser has been closed

```

```
Error: browserContext.close: Target page, context or browser has been closed
```