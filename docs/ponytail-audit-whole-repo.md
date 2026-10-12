# Ponytail Audit — Whole Repo

Scope: over-engineering and complexity **only**. Correctness bugs, security holes, and performance
issues are out of scope and should be handled in a separate review pass. Findings are ranked
biggest-cut-first. Verification after each batch: `tsc --noEmit` + `eslint .` + `npm run build`.

## Net

- **2 top-level deps removed** from `package.json`: `sql.js` (transitive of `jeep-sqlite` now) and `clsx` (→ `tailwind-merge`).
- **~660 lines** of dead/legacy code cut (component merge + dead repo methods + singleton boilerplate + lint cleanup).
- **652 KB** unused `public/sql-wasm.wasm` + 0-byte `public/coffee_flow.db` deleted.
- `tsc`: green. `eslint .`: green (1 intentional `exhaustive-deps` warning). `npm run build`: green.

## Findings — status

### ✅ Implemented (tsc + lint + build green)

**Universal components (pass 1–2)**
- `Button` universal (merged `Chip` `active`+`icon`, dropped dead variants). [src/components/Button.tsx]
- `Chip.tsx` deleted → `<Button size="sm" variant="secondary" active>` / `<Button size="sm" variant="ghost">` (PlaygroundPage).
- `TopAppBar.tsx` deleted (0 refs).
- `Badge.tsx` / `Card.tsx` retained (distinct semantics — not folded into interactive Button).
- `Input.tsx`: `helperText` removed, `clsx`→`tailwind-merge`; `active`/`icon`/`error`/`rightElement` kept.
- `Dropdown.tsx`: `Option.description`+`required` removed, dropped `React.FC`. Callers compatible.
- `Modal.tsx`: **`size` restored** (used by `SettingsPage size="lg"`).
- `Toast.tsx`/`ProgressBar.tsx` retained.

**Data / config (Batch A)**
- `vite.config.ts`: dead `'charts'` manualChunks removed.
- `DatabaseService` singleton → module-level `new DatabaseService()`.
- `BrewEngine.removeListener()` removed (0 callers).
- Dead repo methods removed: `findAllByRecipeId`, `findAllByDrinkId`, `IDrinkLogRepository.findAll` chain + `DrinkService.getAllLogs()`, `IBrewLogRepository.findAll`. `IRecipeRepository.findAll`/`IDrinkRepository.findAll` **live** — kept.
- `sql.js`/`clsx` removed from `package.json`; unused WASM/DB deleted.

**Data layer (Batch B)**
- `SettingsService` removed (pass-through) — `settingsService = settingsRepo`.
- Repository interfaces removed (`IRecipe*`, `IDrink*`, `IBrewLog*`, `IDrinkLog*`) + `repositories.ts`; `BrewService`/`DrinkService` use concrete SQLite repos; impls dropped `implements` + interface imports.
- `getAllMethods` routed through `SQLiteBrewingMethodRepository` (concrete, no interface).

**Micro-shrink (Batch B3)**
- **B3b**: `DrinkService.deductDrinkIngredients` now fetches pantry **once** (`getPantryItems()` 1x), caches `beanItem`/`milkItem`, `GRAMS_PER_SHOT` constant. Regex + logic/order unchanged (behavior-preserving).

**UI type cleanup (C2 minimal — zero behavior)**
- `SmartImportModal` → typed arrow function (no `React.FC`), clean React imports (`useState, useEffect`). AI-mode, multi-recipe queue, `sessionStorage`, Save-All UI **untouched**.

**Lint cleanup**
- `BrewFlowPage`: dead `totalSeconds` removed.
- `BrewMethodsPage`: `as any` → `(CATEGORIES as readonly string[])`.
- `BrewLogPage`: hooks order fixed, lazy-init for `autoSavedLogId`; `exhaustive-deps` warning left intentionally.

### 🔁 Audit corrections (mislabeled "dead")
- `removeDummyPantryItems` used by `PantryPage:28` — kept.
- `Input.active` used by `PlaygroundPage` — kept.
- `Modal.size` used by `SettingsPage:341` — restored.
- `getAllMethods` used by `OnboardingPage:96` + `BrewMethodsPage:76` — kept (routed).

### ⏳ Pending (decision/approval)
- **B3a DeductStock thresholds** — per-unit branching (`%`≤10, `g`≤50, `ml`≤50, `pcs`≤2) + `%` vs absolute split is **domain-correct** (migration 8). Simplification to single threshold risks `%` regression and requires migration work; **not recommended** as a pure complexity cut. (Outside strict "over-engineering" scope.)
- **C1 Migration 9** — table rebuild (CREATE→INSERT→DROP→RENAME) to switch FK `ON DELETE SET NULL` → `CASCADE` (SQLite can't ALTER constraint). Runs once on user DB. **HIGH risk (data safety)** — needs backup+review before any trim/rewrite.
- **C2 (full)** — could remove AI-mode + multi-recipe queue (`_saved`, prev/next, `handleSaveAll`, `sessionStorage`, multi-picker UI). **UX change (medium-high risk)** — not implemented (minimal-only).

## How to act on this
1. **`delete`** — ship first (dead code, TopAppBar, dead variants, dead repo methods). ✅
2. **`native`** — drop unused deps. ✅
3. **`yagni`** — remove single-impl layers (B1, B2 ✅).
4. **`shrink`** — B3b done. B3a questionable. ✅
5. **C1 / C2** — review + manual-verify before cutting (data safety / UI scope).

Re-run this audit after cuts to confirm the tree stays lean.
