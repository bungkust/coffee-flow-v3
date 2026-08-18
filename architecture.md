# Architecture - CoffeeFlow

This document defines the core architecture of CoffeeFlow. Every change must be consistent with this document. If there is a conflict with other files, follow this document for architectural decisions.

---

## 1. Overview

CoffeeFlow is a mobile-first coffee workflow app running on Capacitor (web view + SQLite). The app has 3 core flows:

1. **Brew Flow** — select method → select/create recipe → preparation → timer → log → journal
2. **Drink Flow** — select drink → preparation → log → journal
3. **Pantry** — manage inventory of beans, filters, equipment

App characteristics:
- **Offline-first** — all data stored in local SQLite via Capacitor
- **No auth** — no login, user ID generated locally
- **No sync** — no cloud sync, local backup only

---

## 2. Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Pages (src/pages/*.tsx)                                │
│  Route-level UI. Import services from core/services.ts  │
│  Never import repositories directly.                    │
├─────────────────────────────────────────────────────────┤
│  Services (src/features/*/application/*Service.ts)      │
│  Business logic. Depend on repository interfaces.       │
│  Generate IDs (crypto.randomUUID()) + timestamps.      │
├─────────────────────────────────────────────────────────┤
│  Repositories (src/features/*/infrastructure/SQLite*.ts)│
│  Data access. Implement interfaces from repositories.ts │
│  Every write call → dbService.saveToLocalStore()        │
├─────────────────────────────────────────────────────────┤
│  Database (src/core/database/sqlite.ts + schema.ts)     │
│  SQLite via Capacitor. Schema + migrations.             │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User action (page)
  → Service method
    → Repository SQL query
      → SQLite
    → saveToLocalStore()  ← PERSISTENCE STEP, MANDATORY
  → Update UI state (useState)
```

### Key Rule: Persistence

**Every write** (INSERT, UPDATE, DELETE) to SQLite **MUST** be followed by `await dbService.saveToLocalStore()`. Without this, data can be lost on web (IndexedDB).

---

## 3. Data Model (SQLite Tables)

```
┌──────────────────┐     ┌──────────────────┐
│  brewing_methods │     │     recipes      │
│  ──────────────  │     │  ──────────────  │
│  id (PK)         │◄────│  method_id (FK)  │
│  name            │     │  id (PK)         │──── recipe_steps (1:N)
│  description     │     │  name            │     └── id, step_order, label,
│  icon            │     │  ratio           │         duration_seconds,
└──────────────────┘     │  grind_size      │         target_weight, instruction
                         │  temperature     │
                         │  total_water     │
                         │  difficulty      │
                         │  style           │
                         │  description_*   │
                         │  philosophy      │
                         │  best_for_tags   │  (JSON array → string[])
                         │  not_recommended │  (JSON array → string[])
                         │  is_custom       │
                         │  is_favorite     │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   brew_logs      │     │    drinks        │
│  ──────────────  │     │  ──────────────  │
│  id (PK)         │     │  id (PK)         │──── drink_logs (1:N)
│  recipe_id (FK)  │     │  name            │     └── id, rating, notes,
│  bean_id (FK)    │     │  category        │         logged_at
│  rating (1-5)    │     │  ingredients_json│
│  notes           │     │  instructions_   │
│  sweetness       │     └──────────────────┘
│  acidity         │
│  body            │
│  bitterness      │
│  flavor_tags     │
│  brewed_at       │
└──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│  pantry_items    │     │  app_settings    │
│  ──────────────  │     │  ──────────────  │
│  id (PK)         │     │  key (PK)        │
│  name            │     │  value           │
│  category        │     └──────────────────┘
│  brand           │
│  remaining_stock │
│  quantity        │
│  unit            │
│  is_low_stock    │
│  tags_json       │
│  is_active       │
└──────────────────┘
```

### Relationship Rules

- `recipes.method_id` → `brewing_methods.id` (CASCADE delete)
- `recipe_steps.recipe_id` → `recipes.id` (CASCADE delete)
- `brew_logs.recipe_id` → `recipes.id` (SET NULL on delete)
- `brew_logs.bean_id` → `pantry_items.id` (SET NULL on delete)
- `drink_logs.drink_id` → `drinks.id` (SET NULL on delete)

### Pantry Categories

Valid values for `pantry_items.category`:

| Category | Display Group | Description |
|---|---|---|
| `beans` | Supplies | Coffee beans |
| `milk` | Supplies | Milk, oat milk, etc. |
| `syrup` | Supplies | Syrup, flavoring |
| `sugar` | Supplies | Sugar, sweetener |
| `other_ingredient` | Supplies | Other drink ingredients |
| `filter` | Supplies | Paper filters, etc. |
| `dripper` | Gear | Pour-over drippers |
| `grinder` | Gear | Coffee grinders |
| `kettle` | Gear | Kettles |
| `scale` | Gear | Scales |
| `accessory` | Gear | Other accessories |
| `machine` | Gear | Espresso machines |
| `french_press` | Gear | French Press |
| `aeropress` | Gear | AeroPress |
| `other` | Gear | Uncategorized gear |

---

## 4. Route Map

```
/                          → SplashPage (routes to /welcome or /home)
/welcome                   → WelcomePage
/onboarding                → OnboardingPage

/home                      → HomePage (dashboard)
/settings                  → SettingsPage
/settings/backup           → BackupRestorePage

/brew-methods              → BrewMethodsPage (select method)
/recipes                   → RecipeListPage (filter + list)
/recipes/:id               → RecipeDetailPage
/recipes/:id/edit          → RecipeEditPage (add/edit custom recipe)
/recipes/:id/prepare       → RecipePreparationPage
/brew-flow                 → BrewFlowPage (timer)
/brew-log                  → BrewLogPage (rating + notes)

/drinks                    → DrinkMenuPage
/drinks/:id                → DrinkDetailPage
/drinks/:id/prepare        → DrinkPreparationPage
/drink-log/:id             → DrinkLogPage

/pantry                    → PantryPage
/pantry/add                → PantryAddSelectionPage
/pantry/add/:category      → PantryAddFormPage
/pantry/:id/edit           → PantryEditPage

/journal                   → JournalPage (brews + drinks tabs)
/journal/:type/:id         → JournalDetailPage

/quick-timer               → QuickTimerPage
/ratio-calculator          → RatioCalculatorPage
/playground                → PlaygroundPage (dev only)
```

---

## 5. User Flows (Golden Paths)

### 5.1 Brew Flow (Main Flow)

```
HomePage
  → BrewMethodsPage (select method)
    → RecipeListPage (?method=v60)
      → RecipeDetailPage (view details)
        → RecipePreparationPage (dose adjuster + checklist)
          → BrewFlowPage (step-by-step timer)
            → BrewLogPage (rating + taste profile + notes)
              → JournalPage (view new log)
```

**Data persisted per step:**

| Step | Write to SQLite |
|---|---|
| Select recipe | — (read only) |
| Start brew | Zustand + sessionStorage (active session) |
| Timer complete | — (session still in memory) |
| Save log | `brew_logs` (INSERT) + `pantry_items` (UPDATE stock) |

**Stock Deduction when log is saved:**
- Bean: `remaining_stock -= coffeeConsumed` (only if beanId + coffeeConsumed valid)
- Filter: `remaining_stock -= 1` (only if filterId exists)

### 5.2 Drink Flow

```
HomePage ("Mix a Drink")
  → DrinkMenuPage (select drink)
    → DrinkDetailPage (view details)
      → DrinkPreparationPage
        → DrinkLogPage (rating + notes)
          → JournalPage (view new log)
```

### 5.3 Pantry Flow

```
PantryPage (tabs: Supplies / Gear)
  → PantryAddSelectionPage (select category)
    → PantryAddFormPage (fill details)
      → PantryPage (new item appears)
  → PantryPage tap item → bottom sheet
    → PantryEditPage (/pantry/:id/edit)
    → Delete (confirmation via Modal)
```

### 5.4 First Launch Flow

```
/ (SplashPage)
  → check user_name + user_preferred_methods
  → /welcome (if not set)
    → /onboarding (name, goal, methods, beans)
      → /home
```

---

## 6. State Management

### Zustand (Active Brew Session Only)

```
src/state/useBrewStore.ts
```

| Field | Type | Purpose |
|---|---|---|
| `activeRecipe` | `Recipe \| null` | Recipe currently being brewed |
| `selectedBeanId` | `string \| null` | Bean selected in preparation |
| `selectedFilterId` | `string \| null` | Filter selected in preparation |
| `coffeeConsumed` | `number \| null` | Weight of coffee used |
| `engine` | `BrewEngine \| null` | Timer engine instance |
| `engineState` | `BrewEngineState \| null` | Timer state (step, time, progress) |

**Hydration:** Zustand hydrates from `sessionStorage` key `coffee_flow_active_brew`. Browser refresh does not lose the session.

### SQLite (All Other Data)

All persistent data (recipes, logs, pantry, settings) is stored in SQLite. **Do not store data in Zustand or localStorage** except the active brew session.

---

## 7. BrewEngine (Timer System)

```
src/features/brew/application/BrewEngine.ts
```

Step-based countdown engine. Flow:

```
start() → tick() every 1 second
  → remainingTime--
  → notify() to listeners (Zustand updates UI)
  → remainingTime == 0? → nextStep()
    → more steps? → reset remainingTime
    → no more? → isCompleted = true
```

| Method | Effect |
|---|---|
| `start()` | Start countdown |
| `pause()` | Stop interval, isRunning = false |
| `resume()` | Continue countdown |
| `stop()` | Reset to step 0, clear interval |
| `nextStep()` | Skip to next step (auto-called when timer hits 0) |

**BrewEngineState:**

```typescript
{
  currentStepIndex: number,   // index into steps array
  remainingTime: number,      // seconds remaining in this step
  totalTime: number,          // total duration of this step
  progress: number,           // 0-1, progress of this step
  isRunning: boolean,
  isCompleted: boolean        // true when all steps are done
}
```

---

## 8. BrewMath (Shared Calculations)

```
src/shared/utils/brewMath.ts
```

Pure functions used across many pages. **Do not recalculate inline** — use these functions.

| Function | Purpose |
|---|---|
| `parseRatio("1:16")` | Convert ratio string to multiplier (16) |
| `calculateCoffeeDose(water, ratio)` | Calculate coffee dose from water + ratio |
| `formatDuration(seconds)` | Format to `M:SS` or `H:MM:SS` |
| `formatWeight(grams)` | Format to `18g` or `18.5g` |
| `sumStepDuration(steps)` | Total duration of all steps |
| `getCurrentTargetWeight(steps, idx)` | Cumulative target weight at this step |
| `getPourAmount(steps, idx)` | How many grams of water to add |
| `getWaterProgressPercent(target, totalWater)` | Water progress percentage |
| `scaleRecipe(recipe, dose)` | Scale recipe to new dose |
| `scaleInstructionText(text, factor)` | Scale numbers in instruction text |

### Target Weight = Cumulative

Recipe `target_weight` is **cumulative** (scale reading), not incremental.

```
Step 1: target 50g    → pour until scale reads 50g (add 50g)
Step 2: target 170g   → pour until scale reads 170g (add 120g)
Step 3: target 288g   → pour until scale reads 288g (add 118g)
```

---

## 9. Services Map

All services are wired as singletons in `src/core/services.ts`.

| Service | Purpose | Dependencies |
|---|---|---|
| `brewService` | Recipe CRUD, brew log, stats, stock deduction | recipeRepo, logRepo, pantryService |
| `drinkService` | Drink CRUD, drink log, stats | drinkRepo, drinkLogRepo |
| `pantryService` | Pantry item CRUD, stock deduction | pantryRepo |
| `settingsService` | App settings (user, prefs) | settingsRepo |
| `backupService` | Export/import backup | backupRepo |

### Cross-Service Dependencies

```
BrewService → PantryService (stock deduction when logging brew)
```

---

## 10. Database Persistence Checklist

Every repository write method must end with:

```typescript
await dbService.saveToLocalStore();
```

Current persistence status:

| Repository | Read | Write | `saveToLocalStore()` |
|---|---|---|---|
| `SQLiteRecipeRepository` | ✅ | ✅ | ✅ |
| `SQLiteBrewLogRepository` | ✅ | ✅ | ✅ |
| `SQLiteDrinkRepository` | ✅ | ✅ | ✅ |
| `SQLiteDrinkLogRepository` | ✅ | ✅ | ✅ |
| `SQLitePantryRepository` | ✅ | ✅ | ✅ |
| `SQLiteSettingsRepository` | ✅ | ✅ | ✅ |
| `SQLiteBackupRepository` | ✅ | ✅ | ✅ |

---

## 11. Schema Migrations

Schema versioning via `src/core/database/schema.ts`.

| Version | Change |
|---|---|
| 1 | Initial schema (methods, recipes, steps, logs, drinks, settings, backups, pantry) |
| 2 | Add taste profile to brew_logs (sweetness, acidity, body, bitterness, flavor_tags) |
| 3 | Add is_favorite to recipes |
| 4 | Add metadata to recipes (difficulty, style, descriptions, philosophy, tags) + instruction to steps |
| 5 | Create backups table |
| 6 | Create pantry_items table |
| 7 | Add bean_id to brew_logs |
| 8 | Add quantity + unit to pantry_items |

### Adding New Columns

1. Add `ALTER TABLE` to `MIGRATIONS` array in `schema.ts`
2. Increment version number
3. Update TypeScript interface in `entities.ts`
4. Update repository implementation
5. Update UI that displays/edits the field

---

## 12. Component Hierarchy

```
src/
├── components/          # Shared UI primitives (see components.md)
│   ├── Icons.tsx        # Icon (Material Symbols) + SplashLogoIcon
│   ├── Modal.tsx        # Confirmation/danger modal
│   ├── Toast.tsx        # Feedback toast
│   ├── BottomNav.tsx    # 4-tab nav
│   ├── Dropdown.tsx     # Select dropdown
│   ├── Card.tsx         # Card wrapper
│   ├── Button.tsx       # Button (primary/secondary/ghost/icon)
│   ├── Input.tsx        # Text input
│   ├── Chip.tsx         # Filter chip
│   ├── Badge.tsx        # Status badge
│   ├── ProgressBar.tsx  # Progress bar
│   └── SmartImportModal.tsx  # Recipe import modal
│
├── pages/               # Route-level (one file per route)
│   ├── SplashPage.tsx
│   ├── WelcomePage.tsx
│   ├── OnboardingPage.tsx
│   ├── HomePage.tsx
│   ├── BrewMethodsPage.tsx
│   ├── RecipeListPage.tsx
│   ├── RecipeDetailPage.tsx
│   ├── RecipeEditPage.tsx
│   ├── RecipePreparationPage.tsx
│   ├── BrewFlowPage.tsx
│   ├── BrewLogPage.tsx
│   ├── JournalPage.tsx
│   ├── JournalDetailPage.tsx
│   ├── PantryPage.tsx
│   ├── PantryAddSelectionPage.tsx
│   ├── PantryAddFormPage.tsx
│   ├── PantryEditPage.tsx
│   ├── DrinkMenuPage.tsx
│   ├── DrinkDetailPage.tsx
│   ├── DrinkPreparationPage.tsx
│   ├── DrinkLogPage.tsx
│   ├── SettingsPage.tsx
│   ├── BackupRestorePage.tsx
│   ├── QuickTimerPage.tsx
│   ├── RatioCalculatorPage.tsx
│   └── PlaygroundPage.tsx
│
├── features/
│   ├── brew/
│   │   ├── application/
│   │   │   ├── BrewService.ts       # Recipe + brew log logic
│   │   │   ├── DrinkService.ts      # Drink + drink log logic
│   │   │   └── BrewEngine.ts        # Timer engine
│   │   └── infrastructure/
│   │       ├── SQLiteRecipeRepository.ts
│   │       ├── SQLiteBrewLogRepository.ts
│   │       ├── SQLiteDrinkRepository.ts
│   │       └── SQLiteDrinkLogRepository.ts
│   ├── pantry/
│   │   ├── domain/entities.ts        # PantryCategory, PantryItem
│   │   ├── application/PantryService.ts
│   │   └── infrastructure/SQLitePantryRepository.ts
│   └── settings/
│       ├── application/
│       │   ├── SettingsService.ts
│       │   └── BackupService.ts
│       └── infrastructure/
│           ├── SQLiteSettingsRepository.ts
│           └── SQLiteBackupRepository.ts
│
├── shared/
│   ├── domain/
│   │   ├── entities.ts              # All TypeScript interfaces
│   │   └── repositories.ts          # Repository interfaces
│   └── utils/
│       └── brewMath.ts              # Pure calculation helpers
│
├── core/
│   ├── services.ts                  # Singleton wiring
│   └── database/
│       ├── sqlite.ts                # DatabaseService
│       ├── schema.ts                # DDL + Migrations
│       ├── seeding.ts               # Initial data seed
│       └── recipeSeeds.ts           # Method + recipe seeds
│
├── state/
│   └── useBrewStore.ts              # Zustand (active brew only)
│
├── App.tsx                          # Routes
├── main.tsx                         # Entry point
└── index.css                        # Tailwind + helpers
```

---

## 13. Invariants (Rules That Must Never Break)

1. **Call `saveToLocalStore()` after every write** — without this, data is lost on web.
2. **Never access repositories directly from pages** — always go through services.
3. **BottomNav has exactly 4 tabs** — Home, Brewing, Pantry, Journal. Settings from header.
4. **`target_weight` = cumulative** — not incremental.
5. **Zustand only for active brew session** — all other data in SQLite.
6. **All IDs use `crypto.randomUUID()`** — no auto-increment.
7. **`import type` for type-only imports** — because `verbatimModuleSyntax` is enabled.
8. **Never use `any`** — create new interfaces in `entities.ts` if needed.
9. **Run `npm run build` + `npm run lint`** after every change.
10. **Pages import from `core/services.ts`** — never import repositories/services directly.

---

## 14. Anti-Patterns

| Don't | Why | Instead |
|---|---|---|
| Page imports `SQLiteXRepository` | Breaks dependency inversion | Import from `core/services.ts` |
| `save()` without `saveToLocalStore()` | Data lost on web | Always call both |
| Calculate dose inline in page | Duplication, bug-prone | Use `brewMath.calculateCoffeeDose()` |
| Store data in Zustand beyond brew session | State lost on refresh | Store in SQLite |
| Hardcode array in page when data exists in DB | Duplicate source of truth | Read from service |
| `window.confirm()` / `alert()` | Bad UX | Use `Modal` component |
| `disabled` only via CSS class | Keyboard/screen reader can bypass | Use HTML `disabled` attribute |
| Add tab to BottomNav | Breaks nav architecture | Keep 4 tabs |
| Add new npm dependency | Bundle size + vulnerability | Check existing stack first |
| Create new component when one exists | Duplication | Check `components.md` first |
