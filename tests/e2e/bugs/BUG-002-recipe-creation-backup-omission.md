# Bug Report: BUG-002 — Custom Brew Recipe Omitted from Database Backup Snapshot

## 📌 Summary
When creating a new custom brew recipe via `RecipeEditPage` (`/recipes/new/edit`), the form navigates away as if saved, but the recipe entry is **NOT persisted into the SQLite `recipes` table**. Consequently, when `backupService.performBackup()` exports the database backup snapshot, the newly created brew recipe is **missing** from the backup payload (whereas drink recipes created via `DrinkEditPage` are properly included).

---

## 🔍 Bug Details

- **Bug ID**: `BUG-002`
- **Status**: 🔴 **OPEN (Awaiting Verification & Resolution)**
- **Affected Area**: `src/pages/RecipeEditPage.tsx` / `src/features/brew/infrastructure/SQLiteRecipeRepository.ts`
- **Severity**: **High (Data Loss / Persistence Failure)**
- **Discovered By**: Playwright E2E Test (`tests/e2e/specs/full-user-lifecycle.spec.ts`)

---

## 🛑 Steps to Reproduce (Manual Verification)
1. Complete Onboarding and land on `/home`.
2. Navigate to `/recipes/new/edit`.
3. Fill out **Recipe Name** (e.g. *"E2E Lifecycle V60 Special"*), **Ratio** (e.g. *"1:15"*), and **Total Water** (e.g. *"300"*).
4. Click **Add Step** and then click **Save Recipe**.
5. Navigate to `/settings/backup` and click **Backup Now**.
6. Inspect the exported JSON snapshot (or `localStorage` backup entry).

---

## ⚡ Expected vs Actual Behavior

- **Expected Behavior**: The exported JSON backup snapshot should contain the newly created recipe record under `tables.recipes` with `name: "E2E Lifecycle V60 Special"`.
- **Actual Behavior**: The `tables.drinks` array in the JSON backup snapshot correctly contains newly added drinks, but `tables.recipes` does **NOT** contain the newly created custom brew recipe.

---

## 🛠️ Investigation Notes & Code References

1. **`src/pages/RecipeEditPage.tsx`**:
   - Check lines 30–54 where `prefill` state initialization occurs. When navigating without `location.state`, `prefill` is `undefined`.
   - Check `handleSave` (lines 95–114) to verify if `brewService.saveRecipe(recipe)` resolves or encounters an unhandled exception before saving to SQLite.

2. **`src/features/brew/infrastructure/SQLiteRecipeRepository.ts`**:
   - Check `save(recipe: Recipe)` query on line 121 for any parameter mismatch or foreign key constraint issue on `method_id`.
