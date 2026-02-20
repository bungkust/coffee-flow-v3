export const ENHANCED_SCHEMA = `
  -- 1. Schema Versioning
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL,
    applied_at TEXT NOT NULL
  );

  -- 2. Brewing Methods
  CREATE TABLE IF NOT EXISTS brewing_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_methods_name ON brewing_methods(name);

  -- 3. Recipes
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL,
    name TEXT NOT NULL,
    ratio TEXT NOT NULL,
    grind_size TEXT,
    temperature INTEGER,
    total_water INTEGER,
    is_custom INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (method_id) REFERENCES brewing_methods(id) ON DELETE CASCADE
  );

  -- 4. Recipe Steps
  CREATE TABLE IF NOT EXISTS recipe_steps (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    label TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    target_weight INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE(recipe_id, step_order)
  );

  -- 5. Brew Logs (Journal)
  CREATE TABLE IF NOT EXISTS brew_logs (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    notes TEXT,
    brewed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_brew_logs_date ON brew_logs(brewed_at);

  -- 6. Drinks
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

  CREATE INDEX IF NOT EXISTS idx_drinks_name ON drinks(name);

  -- 7. Drink Logs
  CREATE TABLE IF NOT EXISTS drink_logs (
    id TEXT PRIMARY KEY,
    drink_id TEXT NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    notes TEXT,
    logged_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (drink_id) REFERENCES drinks(id) ON DELETE SET NULL
  );

  -- 8. App Settings (Local Config)
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- 9. Performance Index
  CREATE INDEX IF NOT EXISTS idx_recipes_method ON recipes(method_id);
  CREATE INDEX IF NOT EXISTS idx_steps_recipe ON recipe_steps(recipe_id);
  CREATE INDEX IF NOT EXISTS idx_brew_logs_recipe ON brew_logs(recipe_id);

  -- 10. Backups
  CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL
  );
  -- 11. Pantry Items
  CREATE TABLE IF NOT EXISTS pantry_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    description TEXT,
    remaining_stock INTEGER,
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
`;

export const MIGRATIONS = [
  {
    version: 1,
    sql: ENHANCED_SCHEMA
  },
  {
    version: 2,
    sql: `
      ALTER TABLE brew_logs ADD COLUMN sweetness INTEGER;
      ALTER TABLE brew_logs ADD COLUMN acidity INTEGER;
      ALTER TABLE brew_logs ADD COLUMN body INTEGER;
      ALTER TABLE brew_logs ADD COLUMN bitterness INTEGER;
      ALTER TABLE brew_logs ADD COLUMN flavor_tags TEXT;
    `
  },
  {
    version: 3,
    sql: `ALTER TABLE recipes ADD COLUMN is_favorite INTEGER DEFAULT 0;`
  },
  {
    version: 4,
    sql: `
      ALTER TABLE recipes ADD COLUMN difficulty TEXT;
      ALTER TABLE recipes ADD COLUMN style TEXT;
      ALTER TABLE recipes ADD COLUMN description_short TEXT;
      ALTER TABLE recipes ADD COLUMN description_detailed TEXT;
      ALTER TABLE recipes ADD COLUMN philosophy TEXT;
      ALTER TABLE recipes ADD COLUMN best_for_tags TEXT;
      ALTER TABLE recipes ADD COLUMN not_recommended_tags TEXT;
      ALTER TABLE recipe_steps ADD COLUMN instruction TEXT;
    `
  },
  {
    version: 5,
    sql: `
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL
      );
    `
  },
  {
    version: 6,
    sql: `
      CREATE TABLE IF NOT EXISTS pantry_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        brand TEXT,
        description TEXT,
        remaining_stock INTEGER,
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
    `
  },
  {
    version: 7,
    sql: `
      ALTER TABLE brew_logs ADD COLUMN bean_id TEXT REFERENCES pantry_items(id) ON DELETE SET NULL;
    `
  }
];
