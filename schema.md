# Database Schema - CoffeeFlow

This document defines all SQLite tables in CoffeeFlow, including columns, data types, constraints, indexes, and how each table is accessed from repositories.

---

## 1. Overview

- **Engine:** SQLite via Capacitor (web: IndexedDB-backed)
- **File:** `coffee_flow_db`
- **Schema location:** `src/core/database/schema.ts`
- **Seeding:** `src/core/database/seeding.ts` + `src/core/database/recipeSeeds.ts`

---

## 2. Tables

### 2.1 schema_migrations

Tracks which schema versions have been applied.

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL,
  applied_at TEXT NOT NULL
);
```

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | — |
| `version` | `INTEGER` | `NOT NULL` | Migration version number |
| `applied_at` | `TEXT` | `NOT NULL` | ISO timestamp |

**Repository:** None — managed directly by `dbService`.

---

### 2.2 brewing_methods

10 brewing methods seeded on first launch.

```sql
CREATE TABLE IF NOT EXISTS brewing_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | Lowercase id: `v60`, `aeropress`, `french_press`, etc. |
| `name` | `TEXT NOT NULL` | Display name: "V60 Pour Over" |
| `description` | `TEXT` | Short, 1 sentence |
| `icon` | `TEXT` | Material Symbols icon name |
| `created_at` | `TEXT NOT NULL` | ISO timestamp |
| `updated_at` | `TEXT NOT NULL` | ISO timestamp |
| `deleted_at` | `TEXT` | Soft delete (nullable) |

**Index:** `idx_methods_name ON brewing_methods(name)`

**Seed data:** 10 methods (`BREWING_METHOD_SEEDS` in `recipeSeeds.ts`)

**Repository:** No dedicated repository — accessed via `BrewService` or raw queries.

---

### 2.3 recipes

All brewing recipes. 33 seed recipes + user can create custom ones.

```sql
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  method_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ratio TEXT NOT NULL,
  grind_size TEXT,
  temperature INTEGER,
  total_water INTEGER,
  is_custom INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  difficulty TEXT,
  style TEXT,
  description_short TEXT,
  description_detailed TEXT,
  philosophy TEXT,
  best_for_tags TEXT,
  not_recommended_tags TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (method_id) REFERENCES brewing_methods(id) ON DELETE CASCADE
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | UUID or seed id (`v60-balanced-daily-driver`) |
| `method_id` | `TEXT NOT NULL FK` | → `brewing_methods.id` |
| `name` | `TEXT NOT NULL` | "Balanced Daily Driver" |
| `ratio` | `TEXT NOT NULL` | "1:16", "1:2" (espresso) |
| `grind_size` | `TEXT` | "Medium-Fine", "Coarse", etc. |
| `temperature` | `INTEGER` | Celsius, e.g. 93 |
| `total_water` | `INTEGER` | ml, e.g. 288 |
| `is_custom` | `INTEGER DEFAULT 0` | 0 = seed, 1 = user-created |
| `is_favorite` | `INTEGER DEFAULT 0` | 1 = favorited |
| `difficulty` | `TEXT` | "Beginner" \| "Intermediate" \| "Advanced" |
| `style` | `TEXT` | "Balanced / Sweet", "Clean / Tea-like" |
| `description_short` | `TEXT` | 1 sentence |
| `description_detailed` | `TEXT` | 2-3 sentences |
| `philosophy` | `TEXT` | Principle behind the recipe |
| `best_for_tags` | `TEXT` | JSON array: `["Light Roast","Washed"]` |
| `not_recommended_tags` | `TEXT` | JSON array: `["Dark Roast"]` |
| `version` | `INTEGER DEFAULT 1` | Recipe version |
| `created_at` | `TEXT NOT NULL` | ISO timestamp |
| `updated_at` | `TEXT NOT NULL` | ISO timestamp |
| `deleted_at` | `TEXT` | Soft delete |

**Index:** `idx_recipes_method ON recipes(method_id)`

**Repository:** `SQLiteRecipeRepository`

| Method | SQL | Notes |
|---|---|---|
| `findAll()` | `SELECT * FROM recipes WHERE deleted_at IS NULL` | + load steps |
| `findById(id)` | `SELECT * FROM recipes WHERE id = ? AND deleted_at IS NULL` | + load steps |
| `save(recipe)` | `INSERT OR REPLACE INTO recipes ...` | + delete + re-insert steps |
| `delete(id)` | `UPDATE recipes SET deleted_at = ? WHERE id = ?` | Soft delete |

---

### 2.4 recipe_steps

Each recipe has 1-7 steps. Steps are deleted and re-inserted when a recipe is saved.

```sql
CREATE TABLE IF NOT EXISTS recipe_steps (
  id TEXT PRIMARY KEY,
  recipe_id TEXT,
  step_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  target_weight INTEGER,
  instruction TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  UNIQUE(recipe_id, step_order)
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | `{recipe_id}-step-{n}` for seeds, UUID for custom |
| `recipe_id` | `TEXT FK` | → `recipes.id` (CASCADE delete) |
| `step_order` | `INTEGER NOT NULL` | 1-based, UNIQUE per recipe |
| `label` | `TEXT NOT NULL` | "Bloom", "First Pour", "Drawdown" |
| `duration_seconds` | `INTEGER NOT NULL` | Seconds, e.g. 35, 43200 (12h cold brew) |
| `target_weight` | `INTEGER` | Cumulative scale reading (grams). NULL for non-pour steps |
| `instruction` | `TEXT` | Detailed instruction for this step |
| `created_at` | `TEXT NOT NULL` | ISO timestamp |
| `updated_at` | `TEXT NOT NULL` | ISO timestamp |

**Index:** `idx_steps_recipe ON recipe_steps(recipe_id)`

**Constraint:** `UNIQUE(recipe_id, step_order)` — no two steps with the same order in one recipe.

**Target weight = cumulative:** `target_weight` is a scale reading, not incremental.
```
Step 1: target 50    → pour until scale reads 50g
Step 2: target 170   → pour until scale reads 170g (add 120g)
Step 3: target 288   → pour until scale reads 288g (add 118g)
```

---

### 2.5 brew_logs

Records after a brew is complete. Stores rating, taste profile, and flavor tags.

```sql
CREATE TABLE IF NOT EXISTS brew_logs (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  bean_id TEXT,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  notes TEXT,
  sweetness INTEGER,
  acidity INTEGER,
  body INTEGER,
  bitterness INTEGER,
  flavor_tags TEXT,
  brewed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
  FOREIGN KEY (bean_id) REFERENCES pantry_items(id) ON DELETE SET NULL
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | UUID |
| `recipe_id` | `TEXT NOT NULL FK` | → `recipes.id` (SET NULL on delete) |
| `bean_id` | `TEXT FK` | → `pantry_items.id` (SET NULL on delete) |
| `rating` | `INTEGER CHECK(1-5)` | Star rating |
| `notes` | `TEXT` | Free text notes |
| `sweetness` | `INTEGER` | 0-10 taste slider |
| `acidity` | `INTEGER` | 0-10 taste slider |
| `body` | `INTEGER` | 0-10 taste slider |
| `bitterness` | `INTEGER` | 0-10 taste slider |
| `flavor_tags` | `TEXT` | Comma-separated: `"Fruity,Nutty"` |
| `brewed_at` | `TEXT NOT NULL` | When the brew was made |
| `created_at` | `TEXT NOT NULL` | When the log was created |

**Indexes:**
- `idx_brew_logs_date ON brew_logs(brewed_at)`
- `idx_brew_logs_recipe ON brew_logs(recipe_id)`

**Repository:** `SQLiteBrewLogRepository`

| Method | SQL |
|---|---|
| `findAll()` | `SELECT * FROM brew_logs ORDER BY brewed_at DESC` |
| `save(log)` | `INSERT INTO brew_logs ...` |
| `update(log)` | `UPDATE brew_logs SET rating=?, notes=?, ... WHERE id=?` |
| `delete(id)` | `DELETE FROM brew_logs WHERE id=?` (hard delete) |
| `findByIdWithRecipe(id)` | `SELECT b.*, r.name, r.method_id, r.ratio FROM brew_logs b LEFT JOIN recipes r ON b.recipe_id = r.id WHERE b.id = ?` |
| `getStats()` | COUNT weekly, COUNT monthly, AVG rating, COUNT beans |
| `getRecentWithRecipes(limit)` | JOIN recipes, ORDER BY brewed_at DESC, LIMIT |

**Join view `BrewLogWithRecipe`:**
```typescript
interface BrewLogWithRecipe extends BrewLog {
    recipe_name: string;  // COALESCE(r.name, 'Deleted Recipe')
    method_id: string;     // COALESCE(r.method_id, 'unknown')
    ratio: string;         // COALESCE(r.ratio, '1:15')
}
```

---

### 2.6 drinks

Drink recipes (coffee + non-coffee). 8 drinks seeded.

```sql
CREATE TABLE IF NOT EXISTS drinks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT CHECK(category IN ('hot','cold')),
  ingredients_json TEXT NOT NULL,
  instructions_json TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | Seed id: `espresso`, `cappuccino`, etc. |
| `name` | `TEXT NOT NULL` | "Espresso", "Cold Brew" |
| `category` | `TEXT CHECK` | "hot" \| "cold" |
| `ingredients_json` | `TEXT NOT NULL` | JSON array: `["18g coffee","36g yield"]` |
| `instructions_json` | `TEXT NOT NULL` | JSON array: `["Dose and tamp...","Pull shot..."]` |
| `version` | `INTEGER DEFAULT 1` | — |
| `created_at` | `TEXT NOT NULL` | ISO timestamp |
| `updated_at` | `TEXT NOT NULL` | ISO timestamp |
| `deleted_at` | `TEXT` | Soft delete |

**Index:** `idx_drinks_name ON drinks(name)`

**Repository:** `SQLiteDrinkRepository`

| Method | SQL |
|---|---|
| `findAll()` | `SELECT * FROM drinks WHERE deleted_at IS NULL ORDER BY name ASC` |
| `findById(id)` | `SELECT * FROM drinks WHERE id = ? AND deleted_at IS NULL` |
| `save(drink)` | `INSERT OR REPLACE INTO drinks ...` |
| `delete(id)` | `UPDATE drinks SET deleted_at = ? WHERE id = ?` (soft delete) |

**Seed data:** 8 drinks (Espresso, Cappuccino, Latte, Flat White, Mocha, Cold Brew, Americano, Macchiato)

---

### 2.7 drink_logs

Records after making a drink.

```sql
CREATE TABLE IF NOT EXISTS drink_logs (
  id TEXT PRIMARY KEY,
  drink_id TEXT NOT NULL,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  notes TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (drink_id) REFERENCES drinks(id) ON DELETE SET NULL
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | UUID |
| `drink_id` | `TEXT NOT NULL FK` | → `drinks.id` (SET NULL on delete) |
| `rating` | `INTEGER CHECK(1-5)` | Star rating |
| `notes` | `TEXT` | Free text |
| `logged_at` | `TEXT NOT NULL` | When the drink was made |
| `created_at` | `TEXT NOT NULL` | When the log was created |

**Repository:** `SQLiteDrinkLogRepository`

| Method | SQL |
|---|---|
| `findAll()` | `SELECT * FROM drink_logs ORDER BY logged_at DESC` |
| `save(log)` | `INSERT INTO drink_logs ...` |
| `update(log)` | `UPDATE drink_logs SET rating=?, notes=? WHERE id=?` |
| `delete(id)` | `DELETE FROM drink_logs WHERE id=?` (hard delete) |
| `findByIdWithDrink(id)` | `SELECT dl.*, d.name, d.category FROM drink_logs dl JOIN drinks d ON dl.drink_id = d.id WHERE dl.id = ?` |
| `getStats()` | COUNT weekly, COUNT monthly, AVG rating, COUNT unique drinks |

**Join view `DrinkLogWithDrink`:**
```typescript
interface DrinkLogWithDrink extends DrinkLog {
    drink_name: string;
    category: 'hot' | 'cold';
}
```

---

### 2.8 app_settings

Key-value store for all app settings.

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

| Column | Type | Notes |
|---|---|---|
| `key` | `TEXT PK` | Setting key |
| `value` | `TEXT NOT NULL` | Setting value (always string/JSON) |
| `updated_at` | `TEXT NOT NULL` | ISO timestamp |

**Repository:** `SQLiteSettingsRepository`

**All keys in use:**

| Key | Value Format | Default | Notes |
|---|---|---|---|
| `user_name` | `string` | `""` | User name |
| `user_id` | `string` | `""` | Generated UUID |
| `user_experience_level` | `string` | `""` | Onboarding |
| `user_taste_profile` | `JSON string[]` | `[]` | Onboarding |
| `user_brewing_goal` | `string` | `""` | Onboarding |
| `user_daily_cups` | `string` | `""` | Onboarding |
| `user_preferred_methods` | `JSON string[]` | `[]` | Method ids: `["v60","aeropress"]` |
| `user_preferred_drinks` | `JSON string[]` | `[]` | Drink ids: `["espresso","latte"]` |
| `app_unit` | `"metric" \| "imperial"` | `"metric"` | Unit preference |
| `notifications_enabled` | `"true" \| "false"` | `"true"` | Push notification toggle |
| `timer_feedback_enabled` | `"true" \| "false"` | `"true"` | Haptic/audio feedback |

**Pattern:** `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`

---

### 2.9 backups

Backup metadata. Snapshot data is stored in `localStorage` with key `coffee_flow_backup_{id}`.

```sql
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | UUID |
| `created_at` | `TEXT NOT NULL` | ISO timestamp |
| `size_bytes` | `INTEGER NOT NULL` | Snapshot size in bytes |
| `location` | `TEXT NOT NULL` | "Local Storage" |
| `status` | `TEXT NOT NULL` | "Success" \| "Failed" |

**Repository:** `SQLiteBackupRepository`

**Snapshot tables backed up:**
```typescript
const BACKUP_TABLES = [
    'brewing_methods',
    'recipes',
    'recipe_steps',
    'brew_logs',
    'drinks',
    'drink_logs',
    'app_settings',
    'pantry_items'
];
```

**Snapshot format:**
```json
{
  "version": 1,
  "created_at": "2026-06-12T00:00:00.000Z",
  "tables": {
    "brewing_methods": [...],
    "recipes": [...],
    "recipe_steps": [...],
    ...
  }
}
```

---

### 2.10 pantry_items

Inventory items: beans, filters, milk, syrup, equipment.

```sql
CREATE TABLE IF NOT EXISTS pantry_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  remaining_stock INTEGER,
  quantity INTEGER,
  unit TEXT,
  is_low_stock INTEGER DEFAULT 0,
  roast_date TEXT,
  purchase_date TEXT,
  tags_json TEXT,
  icon TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | UUID |
| `name` | `TEXT NOT NULL` | "Ethiopia Yirgacheffe" |
| `category` | `TEXT NOT NULL` | PantryCategory (see below) |
| `brand` | `TEXT` | "Three Folks", "Hario" |
| `description` | `TEXT` | Short description |
| `remaining_stock` | `INTEGER` | Legacy percentage (0-100) |
| `quantity` | `INTEGER` | Universal amount |
| `unit` | `TEXT` | "g" \| "ml" \| "pcs" \| "%" |
| `is_low_stock` | `INTEGER DEFAULT 0` | 1 = low stock |
| `roast_date` | `TEXT` | ISO date, for beans |
| `purchase_date` | `TEXT` | ISO date |
| `tags_json` | `TEXT` | JSON array: `["Washed","Ethiopia"]` |
| `icon` | `TEXT` | Material icon name |
| `is_active` | `INTEGER DEFAULT 1` | 1 = active |
| `created_at` | `TEXT NOT NULL` | ISO timestamp |
| `updated_at` | `TEXT NOT NULL` | ISO timestamp |
| `deleted_at` | `TEXT` | Soft delete |

**Repository:** `SQLitePantryRepository`

| Method | SQL |
|---|---|
| `findAll()` | `SELECT * FROM pantry_items WHERE deleted_at IS NULL ORDER BY created_at DESC` |
| `findById(id)` | `SELECT * FROM pantry_items WHERE id = ? AND deleted_at IS NULL` |
| `save(item)` | `INSERT OR REPLACE INTO pantry_items ...` |
| `delete(id)` | `UPDATE pantry_items SET deleted_at = ? WHERE id = ?` (soft delete) |
| `deductStock(id, amount)` | `UPDATE pantry_items SET quantity = ?, is_low_stock = ? ...` |

**Low stock threshold:** `quantity <= 10` → `is_low_stock = 1`

**Stock deduction:**
```typescript
// Only called from BrewService.logBrew()
await pantryService.deductStock(beanId, coffeeConsumed);  // bean
await pantryService.deductStock(filterId, 1);             // filter
```

---

## 3. Valid Pantry Categories

```typescript
type PantryCategory =
  | 'beans'              // Supplies - Coffee beans
  | 'milk'               // Supplies - Milk, oat milk
  | 'syrup'              // Supplies - Syrup, flavoring
  | 'sugar'              // Supplies - Sugar, sweetener
  | 'other_ingredient'   // Supplies - Other drink ingredients
  | 'filter'             // Supplies - Paper filters
  | 'dripper'            // Gear - Pour-over drippers
  | 'grinder'            // Gear - Coffee grinders
  | 'kettle'             // Gear - Kettles
  | 'scale'              // Gear - Scales
  | 'accessory'          // Gear - Other accessories
  | 'machine'            // Gear - Espresso machines
  | 'french_press'       // Gear - French Press
  | 'aeropress'          // Gear - AeroPress
  | 'other';             // Gear - Uncategorized
```

---

## 4. Relationships Diagram

```
brewing_methods (1) ──── (N) recipes
                              │
                              └─── (N) recipe_steps
                              
recipes (1) ──── (N) brew_logs
pantry_items (1) ──── (N) brew_logs (via bean_id)

drinks (1) ──── (N) drink_logs

pantry_items ──── standalone (no FK from other tables except brew_logs.bean_id)
app_settings ──── standalone (key-value)
backups ──── standalone (metadata only)
```

---

## 5. Migration History

| Version | File | Changes |
|---|---|---|
| 1 | `schema.ts` | Initial: all base tables |
| 2 | `schema.ts` | Add taste profile to `brew_logs` |
| 3 | `schema.ts` | Add `is_favorite` to `recipes` |
| 4 | `schema.ts` | Add metadata to `recipes` + `instruction` to `recipe_steps` |
| 5 | `schema.ts` | Create `backups` table |
| 6 | `schema.ts` | Create `pantry_items` table |
| 7 | `schema.ts` | Add `bean_id` to `brew_logs` |
| 8 | `schema.ts` | Add `quantity` + `unit` to `pantry_items` |

### Adding New Migration

1. Add object to `MIGRATIONS` array in `src/core/database/schema.ts`
2. Increment `version` number
3. Write `ALTER TABLE` or `CREATE TABLE` SQL
4. Update TypeScript interface in `entities.ts`
5. Update repository implementation
6. Update UI

---

## 6. Seed Data

### Brewing Methods (10)

| id | name | icon |
|---|---|---|
| `v60` | V60 Pour Over | `filter_alt` |
| `aeropress` | AeroPress | `science` |
| `french_press` | French Press | `coffee` |
| `chemex` | Chemex | `hourglass_top` |
| `espresso` | Espresso | `coffee` |
| `moka_pot` | Moka Pot | `local_cafe` |
| `cold_brew` | Cold Brew | `ac_unit` |
| `kalita` | Kalita Wave | `waves` |
| `clever` | Clever Dripper | `filter_list` |
| `siphon` | Siphon | `science` |

### Recipes (33 seed + user custom)

| Method | Count | IDs |
|---|---|---|
| V60 | 13 | `v60-balanced-daily-driver`, `v60-bright-light-roast`, `v60-sweet-46-inspired`, `v60-low-agitation-clean-cup`, `v60-scott-rao-technique`, `v60-james-hoffmann-method`, `v60-tetsu-kasuya-46-method`, `v60-intelligentsia-method`, `v60-hario-official-method`, `v60-battefeld-five-pour`, `v60-low-key-go-to`, `v60-flores-floral-berries`, `v60-4-6-method-basic` |
| AeroPress | 3 | `aeropress-classic-sweet-cup`, `aeropress-inverted-bold`, `aeropress-bypass-clarity` |
| French Press | 3 | `french-press-clean-immersion`, `french-press-heavy-body`, `french-press-light-roast-long-steep` |
| Chemex | 3 | `chemex-clean-classic`, `chemex-fruit-forward`, `chemex-crowd-brew` |
| Espresso | 4 | `espresso-classic-two-to-one`, `espresso-light-roast-longer-yield`, `espresso-short-chocolate`, `espresso-americano-base` |
| Moka Pot | 2 | `moka-pot-smooth-stovetop`, `moka-pot-milk-base` |
| Cold Brew | 2 | `cold-brew-smooth-concentrate`, `cold-brew-ready-to-drink` |
| Kalita | 1 | `kalita-even-flatbed` |
| Clever | 1 | `clever-sweet-immersion` |
| Siphon | 1 | `siphon-aromatic-clarity` |

**Seed behavior:** `INSERT OR IGNORE` for methods, `INSERT OR REPLACE` for recipes. Missing recipes are seeded automatically on first app launch.

### Drinks (8)

| id | name | category |
|---|---|---|
| `espresso` | Espresso | hot |
| `cappuccino` | Cappuccino | hot |
| `latte` | Latte | hot |
| `flat_white` | Flat White | hot |
| `mocha` | Mocha | hot |
| `cold_brew` | Cold Brew | cold |
| `americano` | Americano | hot |
| `macchiato` | Macchiato | hot |

---

## 7. Backup & Restore

### Export (Snapshot)

```typescript
// SQLiteBackupRepository.createSnapshot()
// Loop BACKUP_TABLES, query SELECT * FROM each, return JSON string
{
  version: 1,
  created_at: "2026-06-12T...",
  tables: {
    brewing_methods: [...],
    recipes: [...],
    recipe_steps: [...],
    brew_logs: [...],
    drinks: [...],
    drink_logs: [...],
    app_settings: [...],
    pantry_items: [...]
  }
}
```

### Import (Restore)

1. Parse JSON
2. Delete all rows from each table (reverse order)
3. Insert all rows from snapshot
4. Call `saveToLocalStore()`

**Warning:** Restore deletes all existing data before import.

---

## 8. Data Access Rules

1. **Pages access via services only** — never import repositories directly
2. **Services depend on repository interfaces** — not concrete implementations
3. **Every write ends with `saveToLocalStore()`** — for web persistence
4. **JSON columns are parsed on read, stringified on write** — `best_for_tags`, `tags_json`, `ingredients_json`, `instructions_json`
5. **Booleans in SQLite = integers** — `0`/`1`, parsed to `boolean` in repository
6. **Soft delete** — `recipes`, `drinks`, `pantry_items` use `deleted_at`. `brew_logs`, `drink_logs` use hard delete.
