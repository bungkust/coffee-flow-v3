# Agent Coding Conventions - CoffeeFlow

The purpose of this document is to keep every agent (or human developer) working on CoffeeFlow following the same patterns. Any edit that touches code must follow this guide. If `design.md` conflicts with this document on UI matters, follow `design.md` for UI and this document for code structure.

---

## Non-Negotiable Principles

1. **Audit before edit.** Before changing any UI, trace the full vertical slice: route (`App.tsx`) → page → service (`core/services.ts`) → repository → schema. All layers must be consistent.
2. **No visual-only actions.** If a button looks clickable, it must have a real handler, a proper `disabled` state, or an explicit placeholder logged in this document. Never leave dead UI.
3. **Vertical slices first.** Ship one complete flow end-to-end before starting another. A partial screen with no persistence or navigation is not done.
4. **No duplicate source of truth.** If data lives in SQLite, the UI must read it through a service/repository — never from a hardcoded array, except for seed data and template defaults.
5. **Persist every write.** Every repository method that writes (insert, update, delete) to SQLite must call `await dbService.saveToLocalStore()` after the operation succeeds. This is the single most common bug.
6. **Don't guess — read the existing code.** Before adding a new service, repository, page, or utility, check if an existing one already covers the case. Reuse before creating.

---

## Architecture Map

```
src/
├── pages/                          # Route-level UI components (one file per route)
├── components/                     # Shared UI primitives
│   ├── Icons.tsx                   # Icon (Material Symbols) + SplashLogoIcon
│   ├── Modal.tsx                   # Confirmation / danger modal
│   ├── Toast.tsx                   # Feedback toast
│   ├── BottomNav.tsx               # 4-tab nav: Home, Brewing, Pantry, Journal
│   ├── Dropdown.tsx                # Select dropdown
│   ├── SmartImportModal.tsx        # Recipe import modal
│   ├── Card.tsx, Button.tsx, Input.tsx, Chip.tsx, Badge.tsx, ProgressBar.tsx
│
├── features/
│   ├── brew/
│   │   ├── application/
│   │   │   ├── BrewService.ts      # Recipe + brew log business logic
│   │   │   ├── DrinkService.ts     # Drink + drink log business logic
│   │   │   └── BrewEngine.ts       # Timer engine (step-based countdown)
│   │   └── infrastructure/
│   │       ├── SQLiteRecipeRepository.ts
│   │       ├── SQLiteBrewLogRepository.ts
│   │       ├── SQLiteDrinkRepository.ts
│   │       └── SQLiteDrinkLogRepository.ts
│   ├── pantry/
│   │   ├── domain/
│   │   │   └── entities.ts         # PantryCategory, PantryItem
│   │   ├── application/
│   │   │   └── PantryService.ts
│   │   └── infrastructure/
│   │       └── SQLitePantryRepository.ts
│   └── settings/
│       ├── domain/
│       │   └── entities.ts         # (currently empty — settings uses app_settings table directly)
│       ├── application/
│       │   ├── SettingsService.ts
│       │   └── BackupService.ts
│       └── infrastructure/
│           ├── SQLiteSettingsRepository.ts
│           └── SQLiteBackupRepository.ts
│
├── shared/
│   ├── domain/
│   │   ├── entities.ts             # All cross-feature TypeScript interfaces (Recipe, BrewLog, Drink, etc.)
│   │   └── repositories.ts         # Repository interfaces (IRecipeRepository, IBrewLogRepository, etc.)
│   └── utils/
│       └── brewMath.ts             # Pure calculation helpers (ratio, dose, duration, pour, scaling)
│
├── core/
│   ├── services.ts                 # Singleton wiring — all repositories and services instantiated here
│   └── database/
│       ├── sqlite.ts               # DatabaseService singleton (CapacitorSQLite + web fallback)
│       ├── schema.ts               # DDL statements + MIGRATIONS array
│       ├── seeding.ts              # seedInitialData + removeDummyPantryItems
│       └── recipeSeeds.ts          # BREWING_METHOD_SEEDS + RECIPE_SEEDS
│
├── state/
│   └── useBrewStore.ts             # Zustand store — active brew session only
│
├── App.tsx                         # All routes (BrowserRouter)
├── main.tsx                        # Entry point + jeep-sqlite registration
└── index.css                       # Tailwind base + scrollbar-hide + animation helpers
```

---

## TypeScript Rules

The project uses `tsconfig.app.json` with strict settings. Every file must pass these:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "verbatimModuleSyntax": true,
  "noFallthroughCasesInSwitch": true
}
```

Key consequences:

- **No `any`.** Use proper types. For joined database rows, create interfaces like `BrewLogWithRecipe` or `DrinkLogWithDrink` in `shared/domain/entities.ts`.
- **Use `import type` for type-only imports.** Because `verbatimModuleSyntax` is enabled, any import that only provides a type must use `import type { X }` syntax. If the import is used as a value at runtime (e.g. `new BrewService()`), use a regular import.
- **No unused variables or parameters.** Remove or prefix with `_` if intentionally unused.
- **No path aliases.** All imports use relative paths — e.g. `import type { Recipe } from '../../../shared/domain/entities'`.
- **Use `EntityId` (alias for `string`) for all ID types** — defined in `shared/domain/entities.ts`.

---

## Layer Rules

### Domain Entities (`features/*/domain/entities.ts` or `shared/domain/entities.ts`)

- Pure TypeScript interfaces and types only. No imports from infrastructure, services, or React.
- Define `EntityId` as the standard ID type (already in `shared/domain/entities.ts`).
- JSON columns in SQLite (e.g. `tags_json`, `ingredients_json`) are typed as `string[]` in the interface; the repository handles serialization.

### Repository Interfaces (`shared/domain/repositories.ts`)

- Define the contract for data access. Services depend on these, not on concrete implementations.
- Standard methods: `findAll()`, `findById(id)`, `save(item)`, `delete(id)`.
- Extended methods for stats/joins: `getStats()`, `findByIdWithRecipe(id)`, `getRecentWithRecipes(limit)`.
- When adding a new entity, add its interface here first.

### Repository Implementations (`features/*/infrastructure/SQLite*.ts`)

- Implement the corresponding interface from `shared/domain/repositories.ts`.
- Access the database via `private get db() { return dbService.getDb(); }`.
- **Every write method must call `await dbService.saveToLocalStore()` after the database operation.** This persists to IndexedDB on web.
- Use parameterized queries (`?` placeholders) for all user input — never string concatenation.
- Use `INSERT OR IGNORE` for seed data, `INSERT OR REPLACE` for settings.
- Return `result.values || []` for queries, `result.values?.[0] || null` for single rows.

### Services (`features/*/application/*Service.ts`)

- Depend on repository interfaces (from `shared/domain/repositories.ts`), not concrete implementations.
- Constructor receives repositories; instantiate services in `core/services.ts`.
- Generate IDs with `crypto.randomUUID()`.
- Generate timestamps with `new Date().toISOString()`.
- Services are the only layer that business logic lives in. Pages call services, never repositories directly.

### Core Services Wiring (`core/services.ts`)

- All repositories and services are instantiated as singletons here.
- Pages import from this file: `import { brewService, settingsService } from '../core/services'`.
- When adding a new service: create the repository, create the service, wire both in this file, then import in your page.

### Pages (`pages/*.tsx`)

- One file per route. Named `{Feature}Page.tsx` (e.g. `BrewMethodsPage.tsx`).
- Import services from `core/services.ts`, never instantiate repositories directly.
- Data fetching: use `useEffect` with `async` function. Load data on mount.
- Loading state: spinner (`animate-spin`) or skeleton cards (`animate-pulse`).
- Empty state: icon + short message + CTA to the right action.
- Error state: user-visible message (not just `console.error`).
- Use `useParams`, `useNavigate`, `useSearchParams` from `react-router-dom`.
- Wrap in the standard page shell (see `design.md` Page Shell section).

### State Management (`state/useBrewStore.ts`)

- Zustand is used for exactly one thing: the active brew session (`activeRecipe`, `engineState`, `selectedBeanId`, etc.).
- Persist to `sessionStorage` so the session survives page refresh.
- All other data lives in SQLite, not in Zustand. Do not create additional Zustand stores for feature data.

### Shared Utilities (`shared/utils/brewMath.ts`)

- Pure functions with no side effects, no database access, no React imports.
- Used across multiple pages/services for consistent calculations.
- When adding a calculation (ratio parsing, dose scaling, duration formatting), add it here — not inline in a page.

---

## Schema Change Checklist

When adding a new field, category, table, or column:

1. **Schema migration** — Add the `ALTER TABLE` or `CREATE TABLE` to the `MIGRATIONS` array in `src/core/database/schema.ts`. Increment the version number.
2. **Domain type** — Update the TypeScript interface in `shared/domain/entities.ts` (or `features/*/domain/entities.ts` for feature-specific types).
3. **Repository interface** — Add/update methods in `shared/domain/repositories.ts` if the change affects the data access contract.
4. **Repository implementation** — Update the `SQLite*Repository` to map the new column, handle the new type, and include it in queries.
5. **Seed data** — Update `src/core/database/seeding.ts` or `recipeSeeds.ts` if the new field needs default values.
6. **UI** — Update pages, components, or forms that display or edit the affected data.

All six steps must be completed before the change is considered done.

---

## Repository Pattern Template

This is the canonical pattern for any new repository. Follow it exactly:

```typescript
import type { IEntityRepository } from '../../../shared/domain/repositories';
import type { Entity, EntityId } from '../../../shared/domain/entities';
import { dbService } from '../../../core/database/sqlite';

export class SQLiteEntityRepository implements IEntityRepository {
    private get db() {
        return dbService.getDb();
    }

    async findAll(): Promise<Entity[]> {
        const result = await this.db.query('SELECT * FROM entities WHERE deleted_at IS NULL ORDER BY created_at DESC');
        return result.values || [];
    }

    async findById(id: EntityId): Promise<Entity | null> {
        const result = await this.db.query('SELECT * FROM entities WHERE id = ?', [id]);
        return result.values?.[0] || null;
    }

    async save(entity: Entity): Promise<void> {
        const now = new Date().toISOString();
        await this.db.run(
            `INSERT INTO entities (id, name, ..., created_at, updated_at)
             VALUES (?, ?, ..., ?, ?)`,
            [entity.id, entity.name, ..., entity.created_at || now, now]
        );
        await dbService.saveToLocalStore(); // <-- ALWAYS call this after writes
    }

    async delete(id: EntityId): Promise<void> {
        await this.db.run('DELETE FROM entities WHERE id = ?', [id]);
        await dbService.saveToLocalStore(); // <-- ALWAYS call this after writes
    }
}
```

---

## Service Pattern Template

```typescript
import type { IEntityRepository } from '../../../shared/domain/repositories';
import type { Entity, EntityId } from '../../../shared/domain/entities';

export class EntityService {
    private repo: IEntityRepository;

    constructor(repo: IEntityRepository) {
        this.repo = repo;
    }

    async getAll(): Promise<Entity[]> {
        return this.repo.findAll();
    }

    async getOne(id: EntityId): Promise<Entity | null> {
        return this.repo.findById(id);
    }

    async create(data: Omit<Entity, 'id' | 'created_at' | 'updated_at'>): Promise<Entity> {
        const now = new Date().toISOString();
        const entity: Entity = {
            id: crypto.randomUUID(),
            ...data,
            created_at: now,
            updated_at: now,
        };
        await this.repo.save(entity);
        return entity;
    }

    async remove(id: EntityId): Promise<void> {
        await this.repo.delete(id);
    }
}
```

Then wire it in `core/services.ts`:

```typescript
import { SQLiteEntityRepository } from '../features/entity/infrastructure/SQLiteEntityRepository';
import { EntityService } from '../features/entity/application/EntityService';

const entityRepo = new SQLiteEntityRepository();
export const entityService = new EntityService(entityRepo);
```

---

## Page Pattern Template

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { entityService } from '../core/services';
import type { Entity } from '../shared/domain/entities';

export const EntityListPage = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await entityService.getAll();
                setItems(data);
            } catch (err) {
                console.error('Failed to load entities:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-light">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl pb-32">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100">
                <h1 className="text-neutral-text tracking-tight text-xl font-bold">Entities</h1>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 pt-4 pb-24 flex flex-col gap-3">
                {items.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
                        <p className="text-sm text-gray-400">No items yet.</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            {item.name}
                        </div>
                    ))
                )}
            </div>

            <BottomNav activeTab="home" />
        </div>
    );
};
```

---

## Anti-Patterns (Do Not)

| Anti-Pattern | Why | Correct Approach |
|---|---|---|
| `save` in repository without `saveToLocalStore()` | Data lost on web refresh | Always call `await dbService.saveToLocalStore()` after every write/delete |
| `any` type | Defeats TypeScript strictness | Use proper types or create new interfaces in `entities.ts` |
| Hardcoded array in page when data exists in SQLite | Duplicate source of truth | Read from service/repository |
| `console.error` as only error feedback | User sees nothing | Show toast, modal, or inline error text |
| Infinite loading spinners | User thinks app is frozen | Add timeout fallback or empty state after 5s |
| `disabled` only via CSS class | Users can still interact via keyboard/screen reader | Always use the HTML `disabled` attribute |
| New npm dependency when existing stack covers the need | Increases bundle, adds vulnerability surface | Check existing components/utilities first |
| BottomNav with more than 4 tabs | Breaks existing navigation architecture | Keep 4 tabs; move extras to header/profile |
| `window.confirm` / `alert` for critical actions | Inconsistent UX | Use the existing `Modal` component from `components/Modal.tsx` |
| Import from `../core/database/sqlite` in a page | Pages must not access DB directly | Always go through services in `core/services.ts` |

---

## Build & Lint Verification

After every change, run both:

```bash
npm run build    # TypeScript compilation + Vite bundle — catches type errors
npm run lint     # ESLint (react-hooks, react-refresh, typescript-eslint) — catches hook issues, unused vars
```

Both must pass with zero new errors. If `npm run build` fails, the change is not done.

Optional security check:
```bash
npm audit --audit-level=moderate
```

---

## Manual Testing Checklist

After changing a flow, verify at minimum:

- [ ] **Fresh user:** splash → welcome → onboarding → home
- [ ] **Brew flow:** home → brew methods → recipes → detail → preparation → timer → log → journal
- [ ] **Pantry:** add item → list → detail → edit → delete
- [ ] **Drinks:** home "Mix a Drink" → drink menu → drink detail → prep → log → journal
- [ ] **Settings:** toggle notification/timer feedback → refresh → value persists
- [ ] **Backup:** export → restore → data returns correctly
- [ ] **Direct URL:** open `/recipes/any-id` directly → shows recipe or graceful fallback, not blank screen
- [ ] **Refresh:** refresh during brew-flow → session continues from `sessionStorage`

---

## Definition of Done

A flow is complete when:

- [ ] Route exists and is reachable from a menu, CTA, or direct URL
- [ ] Empty, loading, error, and success states are all present
- [ ] Forms validate required fields before save
- [ ] Data persists to SQLite and survives browser refresh
- [ ] Flow continues from the previous screen and leads to the next screen
- [ ] `npm run build` passes
- [ ] `npm run lint` adds no new errors
- [ ] No button or menu item is a dead-end (every visible action has behavior)
