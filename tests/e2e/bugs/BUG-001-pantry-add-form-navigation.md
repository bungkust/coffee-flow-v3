# Bug Report: BUG-001 — Incorrect Navigation After Saving Pantry Item

## 📌 Summary
Saving a new pantry item (Supplies or Gear) in `PantryAddFormPage.tsx` executes `navigate(-1)` instead of redirecting the user directly to `/pantry`. This causes navigation failure when users or automated tests access the add form directly via URL or external navigation.

---

## 🔍 Bug Details

- **Bug ID**: `BUG-001`
- **Status**: 🔴 **OPEN (Awaiting Manual Verification)**
- **Affected File**: `src/pages/PantryAddFormPage.tsx`
- **Affected Line**: Line 121 (`navigate(-1);`)
- **Severity**: **Medium (Navigation Failure)**
- **Discovered By**: Playwright E2E Test (`tests/e2e/specs/gear-creation.spec.ts`)

---

## 🛑 Steps to Reproduce (Manual Verification)
1. Open the app directly at `http://localhost:5174/pantry/add/dripper` (or `/pantry/add/grinder`).
2. Fill out **Item Name** (e.g. *"Hario V60 02 White"*) and **Brand** (e.g. *"Hario"*).
3. Click the **Save Item** button.

---

## ⚡ Expected vs Actual Behavior

- **Expected Behavior**: The user should be redirected to the Pantry page (`/pantry`) to view their newly created gear/supplies item.
- **Actual Behavior**: The app executes `navigate(-1)`, sending the user back to whatever previous entry existed in browser history (e.g. `about:blank` or previous route), failing to guarantee arrival at `/pantry`.

---

## 🛠️ Proposed Solution (Do NOT apply until manually verified)
Update line 121 of `src/pages/PantryAddFormPage.tsx`:

```diff
- navigate(-1);
+ navigate('/pantry');
```
