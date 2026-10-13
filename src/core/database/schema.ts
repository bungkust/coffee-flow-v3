export const BASE_SCHEMA = `
  -- 1. Brewing Methods
  CREATE TABLE IF NOT EXISTS brewing_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  -- 2. Recipes
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    method_id TEXT NOT NULL,
    name TEXT NOT NULL,
    ratio TEXT NOT NULL,
    grind_size TEXT,
    temperature INTEGER,
    total_water INTEGER,
    is_custom INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (method_id) REFERENCES brewing_methods(id) ON DELETE CASCADE
  );

  -- 3. Recipe Steps
  CREATE TABLE IF NOT EXISTS recipe_steps (
    id TEXT PRIMARY KEY,
    recipe_id TEXT,
    step_order INTEGER NOT NULL,
    label TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    target_weight INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE(recipe_id, step_order)
  );

  -- 4. Brew Logs (Journal)
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

  -- 5. Drinks
  CREATE TABLE IF NOT EXISTS drinks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK(category IN ('hot','cold')),
    ingredients_json TEXT NOT NULL,
    instructions_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  -- 6. Drink Logs
  CREATE TABLE IF NOT EXISTS drink_logs (
    id TEXT PRIMARY KEY,
    drink_id TEXT NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    notes TEXT,
    logged_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (drink_id) REFERENCES drinks(id) ON DELETE SET NULL
  );

  -- 7. App Settings (Local Config)
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- 8. Performance Index
  CREATE INDEX IF NOT EXISTS idx_recipes_method ON recipes(method_id);
  CREATE INDEX IF NOT EXISTS idx_steps_recipe ON recipe_steps(recipe_id);
  CREATE INDEX IF NOT EXISTS idx_brew_logs_recipe ON brew_logs(recipe_id);

  -- 9. Backups
  CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    location TEXT NOT NULL
  );
  -- 10. Pantry Items
  CREATE TABLE IF NOT EXISTS pantry_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    description TEXT,
    quantity INTEGER,
    unit TEXT,
    roast_date TEXT,
    purchase_date TEXT,
    tags_json TEXT,
    icon TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
`;

export const MIGRATIONS = [
  {
    version: 1,
    sql: BASE_SCHEMA
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
    version: 7,
    sql: `
      ALTER TABLE brew_logs ADD COLUMN bean_id TEXT REFERENCES pantry_items(id) ON DELETE SET NULL;
    `
  },
  {
    version: 8,
    sql: `
      ALTER TABLE pantry_items ADD COLUMN quantity INTEGER;
      ALTER TABLE pantry_items ADD COLUMN unit TEXT;
    `
  },
  {
    version: 9,
    sql: `
      -- Fix contradictory schema: recipe_id is NOT NULL but FK used ON DELETE SET NULL.
      -- Since brew_logs.recipe_id cannot be NULL, use CASCADE so deleting a recipe
      -- also removes its brew logs (historical data tied to the recipe).
      -- Column order must match old table so SELECT * maps correctly.
      CREATE TABLE IF NOT EXISTS brew_logs_new (
        id TEXT PRIMARY KEY,
        recipe_id TEXT NOT NULL,
        rating INTEGER CHECK(rating BETWEEN 1 AND 5),
        notes TEXT,
        brewed_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sweetness INTEGER,
        acidity INTEGER,
        body INTEGER,
        bitterness INTEGER,
        flavor_tags TEXT,
        bean_id TEXT,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      );
      INSERT OR IGNORE INTO brew_logs_new (id, recipe_id, rating, notes, brewed_at, created_at, sweetness, acidity, body, bitterness, flavor_tags, bean_id)
        SELECT id, recipe_id, rating, notes, brewed_at, created_at, sweetness, acidity, body, bitterness, flavor_tags, bean_id FROM brew_logs;
      DROP TABLE brew_logs;
      ALTER TABLE brew_logs_new RENAME TO brew_logs;
      CREATE INDEX IF NOT EXISTS idx_brew_logs_date ON brew_logs(brewed_at);
      CREATE INDEX IF NOT EXISTS idx_brew_logs_recipe ON brew_logs(recipe_id);
    `
  },
  {
    version: 10,
    sql: `
      -- Backfill best_for_tags for existing recipes that have NULL tags
      UPDATE recipes SET best_for_tags = '["Light Roast", "Medium Roast", "Washed", "Honey", "Arabica"]' WHERE method_id = 'v60' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Medium Roast", "Natural", "Honey", "Sweet Profile"]' WHERE method_id = 'aeropress' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Medium Roast", "Chocolate", "Nutty", "Balanced"]' WHERE method_id = 'french_press' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Light Roast", "Medium Roast", "Washed", "Clean Cup"]' WHERE method_id = 'chemex' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Medium-Dark Roast", "Chocolate", "Nutty", "Milk Drinks"]' WHERE method_id = 'espresso' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Dark Roast", "Bold", "Traditional"]' WHERE method_id = 'moka_pot' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Medium Roast", "Low Acid", "Smooth"]' WHERE method_id = 'cold_brew' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Light Roast", "Medium Roast", "Balanced"]' WHERE method_id = 'kalita' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Medium Roast", "Easy", "Consistent"]' WHERE method_id = 'clever' AND (best_for_tags IS NULL OR best_for_tags = '');
      UPDATE recipes SET best_for_tags = '["Light Roast", "Floral", "Aromatic"]' WHERE method_id = 'siphon' AND (best_for_tags IS NULL OR best_for_tags = '');
    `
  },
  {
    version: 11,
    sql: `
      ALTER TABLE drinks ADD COLUMN image_url TEXT;
    `
  },
  {
    version: 13,
    sql: `
      ALTER TABLE recipes ADD COLUMN source TEXT;
    `
  },
  {
    // Older installs carry app_settings.updated_at / backups.status as NOT NULL columns that the
    // current code no longer writes, so every insert failed. Rebuild both tables without them.
    version: 14,
    sql: `
      DROP TABLE IF EXISTS app_settings_new;
      CREATE TABLE app_settings_new (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT OR IGNORE INTO app_settings_new (key, value) SELECT key, value FROM app_settings;
      DROP TABLE app_settings;
      ALTER TABLE app_settings_new RENAME TO app_settings;

      DROP TABLE IF EXISTS backups_new;
      CREATE TABLE backups_new (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, size_bytes INTEGER NOT NULL, location TEXT NOT NULL);
      INSERT OR IGNORE INTO backups_new (id, created_at, size_bytes, location) SELECT id, created_at, size_bytes, location FROM backups;
      DROP TABLE backups;
      ALTER TABLE backups_new RENAME TO backups;
    `
  },
  {
    // Built-in recipes without a recorded source were retired: only cited recipes ship now.
    // Soft delete so any brew logs attached to them survive.
    version: 15,
    sql: `
      UPDATE recipes SET deleted_at = datetime('now')
      WHERE is_custom = 0 AND source IS NULL AND deleted_at IS NULL;
    `
  }
];
