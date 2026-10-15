# Drink, Brew & Pantry Synergy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghubungkan modul Drink dengan Manual Brew dan Pantry secara penuh — mencakup migrasi database v16 (kolom relasi, sensory evaluasi, audit ledger `pantry_logs`), navigasi UI Drink 2-level simetris dengan Brew (Category Hub & Drink List), dan komponen Drink Smart Import instan.

**Architecture:** Mengadopsi arsitektur simetris modul Brew di mana `/drinks` berfungsi sebagai Category Hub (Coffee Base vs Non-Coffee) dan `/drinks/list` sebagai Recipe List dengan filter chips dan FAB. Di lapisan data, SQLite migration v16 menambahkan audit ledger `pantry_logs`, relasi ke `pantry_items` dan `recipes`, serta snapshot takaran dan evaluasi rasa di `drink_logs`.

**Tech Stack:** React 19, TypeScript, Vite, TailwindCSS, SQLite via `@capacitor-community/sqlite` & `jeep-sqlite`, Material Design 3 tokens.

**Spec:** `docs/superpowers/specs/2026-10-15-drink-brew-pantry-synergy-design.md`

## Global Constraints
- Native platform first, preserve existing comments and docstrings.
- SQLite `ALTER TABLE ADD COLUMN` query tidak boleh menggunakan inline `CHECK` constraints (validasi enum dilakukan di level TypeScript/aplikasi).
- Pengurangan stok Pantry (`deductStock`) tidak boleh memblokir (hard-block) pembuatan minuman jika stok 0 atau kurang; clamp minimum pada 0.
- Bahan lepas (*non-inventory*) seperti es batu, garnish daun mint, atau air dilewati (*skip*) saat pemotongan stok tanpa melempar error.
- Setiap task harus lulus verifikasi kompilasi TypeScript dan build Vite (`npm run build`).

## Review Focus
1. **SQLite Migration Safety**: Migrasi v16 harus berjalan mulus pada database yang sudah ada tanpa kehilangan data lama atau error syntax.
2. **Snapshot Durability**: Menghapus atau mengedit master resep Drink tidak boleh merusak atau menghapus nama dan takaran di `drink_logs` yang sudah tercatat.
3. **Pantry Audit Ledger Accuracy**: Setiap pemotongan stok biji kopi dari Brew atau susu/sirup/beans dari Drink harus mencatat baris baru yang akurat di `pantry_logs`.
4. **Unit Conversion Fallbacks**: Takaran non-metrik barista (`shot`, `pump`, `tbsp`, `tsp`) harus terkonversi otomatis ke `g` atau `ml`.
5. **Non-Coffee Seed Availability**: Halaman Non-Coffee tidak boleh kosong saat pertama kali dibuka pengguna baru/lama.

---

## File Structure & Module Responsibilities

```
src/
├── core/
│   ├── database/
│   │   └── schema.ts                       [Modify: Tambah migration v16: pantry_logs, kolom drinks & drink_logs, non-coffee seeds]
│   └── services.ts                         [Modify: Inisialisasi pantryLogRepo & inject ke pantryService / drinkService]
├── shared/
│   └── domain/
│       └── entities.ts                     [Modify: Update Drink, DrinkLog, DrinkIngredient, DrinkLogWithDetails]
├── features/
│   ├── pantry/
│   │   ├── domain/
│   │   │   └── entities.ts                 [Modify: Tambah PantryLog entity & action types]
│   │   ├── infrastructure/
│   │   │   ├── SQLitePantryRepository.ts   [Modify: Audit-aware deductStock & addStock]
│   │   │   └── SQLitePantryLogRepository.ts[Create: Repository CRUD untuk pantry_logs]
│   │   └── application/
│   │       └── PantryService.ts            [Modify: Integrasi logging stok masuk & keluar]
│   └── brew/
│       ├── infrastructure/
│       │   ├── SQLiteDrinkRepository.ts    [Modify: Tambah filter by base_type, is_favorite, cloneDrink]
│       │   └── SQLiteDrinkLogRepository.ts [Modify: Simpan relasi bean, milk, recipe, snapshot, sensory]
│       └── application/
│           ├── BrewService.ts              [Modify: Teruskan recipe.name ke pantryService saat deductStock]
│           └── DrinkService.ts             [Modify: Deduct stok akurat ke pantry dengan unit conversion]
├── components/
│   └── DrinkSmartImportModal.tsx           [Create: Modal AI Prompt Assist & Offline Regex Parser khusus Drink]
├── pages/
│   ├── DrinkMenuPage.tsx                   [Modify: Ubah menjadi Category Hub (Coffee Base vs Non-Coffee)]
│   ├── DrinkListPage.tsx                   [Create: Recipe List page bergaya RecipeListPage: chips, cards, FAB]
│   └── DrinkDetailPage.tsx                 [Modify: Tampilkan base badge & update rute]
└── App.tsx                                 [Modify: Registrasi route /drinks/list]
```

---

## Tasks

### Task 1: Database Migration v16 & TypeScript Domain Entities

**Files:**
- Modify: `src/core/database/schema.ts:240-248`
- Modify: `src/shared/domain/entities.ts:80-120`
- Modify: `src/features/pantry/domain/entities.ts:1-37`

- [ ] **Step 1.1: Tambahkan migration v16 di `src/core/database/schema.ts`**
  Tambahkan entry migration `version: 16` di `MIGRATIONS` array:
  - `ALTER TABLE drinks ADD COLUMN base_recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL;`
  - `ALTER TABLE drinks ADD COLUMN base_type TEXT DEFAULT 'coffee';`
  - `ALTER TABLE drinks ADD COLUMN is_favorite INTEGER DEFAULT 0;`
  - `ALTER TABLE drink_logs ADD COLUMN drink_name TEXT;`
  - `ALTER TABLE drink_logs ADD COLUMN bean_id TEXT REFERENCES pantry_items(id) ON DELETE SET NULL;`
  - `ALTER TABLE drink_logs ADD COLUMN milk_id TEXT REFERENCES pantry_items(id) ON DELETE SET NULL;`
  - `ALTER TABLE drink_logs ADD COLUMN recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL;`
  - `ALTER TABLE drink_logs ADD COLUMN ingredients_snapshot_json TEXT;`
  - `ALTER TABLE drink_logs ADD COLUMN sweetness INTEGER;`
  - `ALTER TABLE drink_logs ADD COLUMN coffee_strength INTEGER;`
  - `ALTER TABLE drink_logs ADD COLUMN creaminess INTEGER;`
  - `ALTER TABLE drink_logs ADD COLUMN flavor_tags TEXT;`
  - `CREATE TABLE IF NOT EXISTS pantry_logs (...);`
  - Indexing: `idx_drink_logs_bean`, `idx_drink_logs_date`, `idx_drinks_base_recipe`, `idx_drinks_base_type`, `idx_pantry_logs_item`, `idx_pantry_logs_date`.
  - Insert initial non-coffee seeds (`matcha_latte`, `iced_chocolate`, `chai_latte`).

- [ ] **Step 1.2: Perbarui entity TypeScript di `src/features/pantry/domain/entities.ts`**
  Tambahkan interface `PantryLog`:
  ```typescript
  export type PantryLogAction = 'brew' | 'drink' | 'restock' | 'adjustment' | 'waste';

  export interface PantryLog {
      id: EntityId;
      pantry_item_id: EntityId;
      change_amount: number;
      unit?: string;
      action_type: PantryLogAction;
      reference_id?: string;
      reference_name?: string;
      notes?: string;
      created_at: string;
  }
  ```

- [ ] **Step 1.3: Perbarui entity TypeScript di `src/shared/domain/entities.ts`**
  - Perbarui interface `Drink`:
    - `base_type?: 'coffee' | 'non_coffee';`
    - `is_favorite?: boolean;`
    - `base_recipe_id?: string;`
  - Tambahkan interface `DrinkIngredient`:
    ```typescript
    export interface DrinkIngredient {
        name: string;
        amount?: number;
        unit?: 'ml' | 'g' | 'shot' | 'pump' | 'tsp' | 'tbsp' | 'pcs' | 'cube';
        category?: 'beans' | 'milk' | 'syrup' | 'sugar' | 'other_ingredient';
        default_pantry_item_id?: string;
    }
    ```
  - Perbarui interface `DrinkLog`:
    - `drink_name?: string;`
    - `bean_id?: string;`
    - `milk_id?: string;`
    - `recipe_id?: string;`
    - `ingredients_snapshot_json?: string;`
    - `sweetness?: number;`
    - `coffee_strength?: number;`
    - `creaminess?: number;`
    - `flavor_tags?: string;`
  - Tambahkan interface `DrinkLogWithDetails` untuk join data di Journal.

- [ ] **Step 1.4: Validasi kompilasi TypeScript**
  Jalankan `npm run build` dan pastikan tidak ada type error pada entity dan schema.

- [ ] **Step 1.5: Commit perubahan Task 1**
  `git add src/core/database/schema.ts src/shared/domain/entities.ts src/features/pantry/domain/entities.ts && git commit -m "feat(core): add migration v16 and entities for Drink-Pantry synergy"`

---

### Task 2: Pantry Activity Log Repository & Stock Deduction with Audit Trail

**Files:**
- Create: `src/features/pantry/infrastructure/SQLitePantryLogRepository.ts`
- Modify: `src/features/pantry/infrastructure/SQLitePantryRepository.ts:90-105`
- Modify: `src/features/pantry/application/PantryService.ts:40-51`
- Modify: `src/core/services.ts:10-32`
- Modify: `src/features/brew/application/BrewService.ts:60-80`

- [ ] **Step 2.1: Buat `SQLitePantryLogRepository.ts`**
  Implementasikan repository dengan method:
  - `save(log: PantryLog): Promise<void>`
  - `findByItemId(itemId: string): Promise<PantryLog[]>` (order by `created_at DESC`)
  - `getRecentLogs(limit?: number): Promise<PantryLog[]>`

- [ ] **Step 2.2: Perbarui `PantryService.ts` untuk mendukung audit logging**
  - Inject `SQLitePantryLogRepository`.
  - Update `deductStock(id: string, amount: number, metadata?: { actionType: PantryLogAction; referenceId?: string; referenceName?: string; unit?: string; notes?: string }): Promise<void>`:
    - Kurangi kuantitas stok di `pantry_items`.
    - Buat record log negatif di `pantry_logs` (`change_amount: -amount`).
  - Tambahkan method `addStock(id: string, amount: number, notes?: string): Promise<void>`:
    - Tambah stok di `pantry_items`.
    - Buat record log positif di `pantry_logs` (`change_amount: +amount`, `action_type: 'restock'`).
  - Tambahkan method `getItemLogs(itemId: string): Promise<PantryLog[]>`.

- [ ] **Step 2.3: Perbarui `src/core/services.ts`**
  Inisialisasi `SQLitePantryLogRepository` dan berikan ke `PantryService`.

- [ ] **Step 2.4: Perbarui `BrewService.ts` agar mencatat nama resep saat memotong stok**
  Di `logBrew`:
  - Ambil detail resep (`recipe.name`).
  - Saat memanggil `pantryService.deductStock(beanId, coffeeConsumed)`, teruskan metadata `{ actionType: 'brew', referenceId: logId, referenceName: recipe.name, unit: 'g' }`.
  - Lakukan hal yang sama untuk `filterId` jika ada.

- [ ] **Step 2.5: Validasi kompilasi build & commit Task 2**
  - Jalankan `npm run build`.
  - Commit: `git add src/features/pantry/ src/core/services.ts src/features/brew/application/BrewService.ts && git commit -m "feat(pantry): implement pantry_logs repository and audit-aware stock deduction"`

---

### Task 3: Drink Repository & DrinkService Upgrade (Preserve Snapshot & Convert Units)

**Files:**
- Modify: `src/features/brew/infrastructure/SQLiteDrinkRepository.ts:30-74`
- Modify: `src/features/brew/infrastructure/SQLiteDrinkLogRepository.ts:1-80`
- Modify: `src/features/brew/application/DrinkService.ts:35-97`

- [ ] **Step 3.1: Perbarui `SQLiteDrinkRepository.ts`**
  - Update mapping `toDomainDrink`: sertakan `base_type`, `is_favorite`, `base_recipe_id`.
  - Tambahkan method `findByBaseType(baseType: 'coffee' | 'non_coffee'): Promise<Drink[]>`.
  - Tambahkan method `toggleFavorite(id: string): Promise<void>`.
  - Tambahkan method `cloneDrink(id: string): Promise<Drink>`: menduplikasi resep minuman dengan nama `"${drink.name} (Copy)"`.
  - Update `save(drink: Drink)` agar menyimpan kolom `base_type`, `is_favorite`, dan `base_recipe_id`.

- [ ] **Step 3.2: Perbarui `SQLiteDrinkLogRepository.ts`**
  - Simpan kolom baru saat `save(log: DrinkLog)`: `drink_name`, `bean_id`, `milk_id`, `recipe_id`, `ingredients_snapshot_json`, `sweetness`, `coffee_strength`, `creaminess`, `flavor_tags`.
  - Update query `getRecentWithDrinks` agar mengambil snapshot `drink_name` jika relasi drink terhapus.

- [ ] **Step 3.3: Perbarui `DrinkService.ts` dengan konversi takaran barista & pemotongan stok akurat**
  - Definisikan konversi standar:
    ```typescript
    const GRAMS_PER_SHOT = 18;
    const ML_PER_PUMP = 10;
    const ML_PER_TBSP = 15;
    const ML_PER_TSP = 5;
    ```
  - Perbarui `logDrink`:
    - Simpan snapshot nama minuman (`drink.name`) dan snapshot takaran bahan (`drink.ingredients_json`).
    - Catat evaluasi rasa (`sweetness`, `coffee_strength`, `creaminess`, `flavor_tags`).
    - Potong stok Pantry untuk bahan yang dipilih secara spesifik:
      - Biji kopi (`bean_id`): hitung total gram berdasarkan shot / gram kopi yang tertera.
      - Susu (`milk_id`): kurangi ml susu yang tertera.
      - Sirup / pemanis: kurangi ml / pump yang tertera.
    - Catat setiap pemotongan ke `pantryService.deductStock` dengan `actionType: 'drink'` dan `referenceName: drink.name`.
  - Tambahkan wrapper `cloneDrink(id: string)` dan `toggleFavorite(id: string)`.

- [ ] **Step 3.4: Validasi kompilasi build & commit Task 3**
  - Jalankan `npm run build`.
  - Commit: `git add src/features/brew/ && git commit -m "feat(drink): enhance SQLiteDrinkRepository and DrinkService with unit conversions and favorite support"`

---

### Task 4: Komponen `DrinkSmartImportModal.tsx`

**Files:**
- Create: `src/components/DrinkSmartImportModal.tsx`

- [ ] **Step 4.1: Buat komponen `DrinkSmartImportModal.tsx`**
  Komponen modal khusus import minuman:
  - **Props**: `isOpen`, `onClose`, `onImport`, `onSaveDirect`, `defaultBaseType?: 'coffee' | 'non_coffee'`.
  - **AI Prompt Template**:
    Instruksi prompt terstruktur untuk Gemini / ChatGPT:
    Mengekstrak JSON array dengan kolom:
    `name`, `base_type` (`"coffee"` atau `"non_coffee"`), `category` (`"hot"` atau `"cold"`), `ingredients` (array of string atau `{ name, amount, unit }`), `instructions` (array of step string).
  - **Offline Regex Parser**:
    - Deteksi `base_type`: deteksi kata kunci `matcha`, `chocolate`, `coklat`, `chai`, `tea`, `teh`, `taro` → `non_coffee`; jika ada `espresso`, `coffee`, `kopi`, `cold brew` → `coffee`.
    - Deteksi `category`: kata kunci `es`, `iced`, `cold`, `dingin`, `frappe` → `cold`; default `hot`.
    - Deteksi bahan & takaran: regex mencocokkan `(\d+(?:\.\d+)?)\s*(ml|g|gram|shot|shots|pump|pumps|tbsp|tsp|cup|sdm|sdt)`.
    - Deteksi langkah instruksi: baris nomor `1.`, `2.` atau kata kerja racik.
  - **Preview UI**:
    - Badge `Coffee Base` / `Non-Coffee` dan `Hot` / `Cold`.
    - Daftar bahan dan langkah yang rapi.
    - Tombol *"Save Directly"* dan *"Edit & Customize"*.
    - Multi-drink queue counter (`Recipe 1 of 3`, tombol Next/Prev).

- [ ] **Step 4.2: Validasi kompilasi build & commit Task 4**
  - Jalankan `npm run build`.
  - Commit: `git add src/components/DrinkSmartImportModal.tsx && git commit -m "feat(ui): add dedicated DrinkSmartImportModal component"`

---

### Task 5: UI Drink Navigation (Category Hub & DrinkListPage Bergaya Brew)

**Files:**
- Create: `src/pages/DrinkListPage.tsx`
- Modify: `src/pages/DrinkMenuPage.tsx`
- Modify: `src/pages/DrinkEditPage.tsx:20-55`
- Modify: `src/App.tsx:24-32, 90-100`

- [ ] **Step 5.1: Buat halaman `DrinkListPage.tsx` (Mengadopsi UI `RecipeListPage`)**
  - URL: `/drinks/list?base=coffee` atau `/drinks/list?base=non_coffee` (default: All).
  - Header: Judul dinamis (*"Coffee Base Drinks"* atau *"Non-Coffee Drinks"* atau *"Drinks"*), SearchBar, tombol Back ke `/drinks`.
  - Filter Chips Bar: `[ All ]` `[ ♨️ Hot ]` `[ 🧊 Cold ]` `[ ⭐ Favorites ]`.
  - List Kartu Minuman (Gaya Kartu Recipe):
    - Nama minuman & ringkasan komposisi bahan.
    - Tombol Bookmark Favorite di kanan atas kartu (toggle `drinkService.toggleFavorite`).
    - Kebab Menu (3 titik):
      - `Duplicate / Clone`: panggil `drinkService.cloneDrink(id)`.
      - `Edit`: navigasi ke `/drinks/:id/edit`.
      - `Delete`: buka konfirmasi modal hapus.
    - Klik kartu: navigasi ke `/drinks/:id`.
  - Floating Action Button (FAB) Speed Dial:
    - 🪄 `Smart Import Drink`: buka `DrinkSmartImportModal`.
    - ✏️ `New Drink`: navigasi ke `/drinks/new/edit`.
  - BottomNav: `activeTab="drinks"` (atau tab yang aktif).

- [ ] **Step 5.2: Perbarui `DrinkMenuPage.tsx` menjadi Category Hub (Mengadopsi UI `BrewMethodsPage`)**
  - Menampilkan 2 kartu kategori utama besar:
    - ☕ **Coffee Base Drinks**: Ikon kopi/espresso, deskripsi *"Espresso, Latte, Cappuccino, Kopi Susu, Cold Brew"*, counter jumlah resep.
    - 🍵 **Non-Coffee Base Drinks**: Ikon matcha/teh, deskripsi *"Matcha, Artisan Tea, Chocolate, Milk-based"*, counter jumlah resep.
  - Klik kartu: navigasi ke `/drinks/list?base=coffee` atau `/drinks/list?base=non_coffee`.
  - Quick Tools Section di bawah kartu: Tombol cepat ke Ratio Calculator / Quick Timer.
  - FAB Speed-Dial untuk Quick Import / New Drink.

- [ ] **Step 5.3: Daftarkan Route di `src/App.tsx`**
  - Tambahkan route `/drinks/list` dengan lazy loading `DrinkListPage`:
    ```tsx
    const DrinkListPage = lazy(() => import('./pages/DrinkListPage').then(m => ({ default: m.DrinkListPage })));
    ...
    <Route path="/drinks" element={<DrinkMenuPage />} />
    <Route path="/drinks/list" element={<DrinkListPage />} />
    ```

- [ ] **Step 5.4: Perbaiki rute prefill di `DrinkEditPage.tsx`**
  - Pastikan `DrinkEditPage` menerima `base_type` dari `state.prefill` atau query param (misal: jika membuat minuman dari halaman Non-Coffee, otomatis terpilih `base_type: 'non_coffee'`).

- [ ] **Step 5.5: Validasi kompilasi build & commit Task 5**
  - Jalankan `npm run build`.
  - Commit: `git add src/pages/DrinkListPage.tsx src/pages/DrinkMenuPage.tsx src/pages/DrinkEditPage.tsx src/App.tsx && git commit -m "feat(ui): implement symmetric 2-level drink navigation matching Brew module"`

---

### Task 6: End-to-End Verification & Sanity Checks

**Files:**
- Test: Build verification & Capacitor asset sync

- [ ] **Step 6.1: Jalankan kompilasi TypeScript & Vite build**
  Jalankan `npm run build`. Pastikan:
  - Tidak ada lint atau TypeScript error (`tsc -b` lulus).
  - Bundle `dist/` terbentuk tanpa warning kompilasi.

- [ ] **Step 6.2: Verifikasi Alur Fungsionalitas**
  - Verifikasi Category Hub: membuka `/drinks` menampilkan 2 kartu besar (Coffee Base & Non-Coffee).
  - Verifikasi Filter: membuka `/drinks/list?base=coffee` hanya menampilkan minuman kopi; membuka `base=non_coffee` menampilkan 3 seed non-coffee.
  - Verifikasi Smart Import Drink: modal terbuka, paste teks resep menghasilkan nama, bahan terukur, dan langkah racik.
  - Verifikasi Clone/Duplicate: menekan tombol Clone di kebab menu menduplikasi resep menjadi `"(Copy)"`.
  - Verifikasi Bookmark Favorite: menekan tombol bookmark langsung memperbarui status favorit.

- [ ] **Step 6.3: Sinkronisasi Web Assets ke Android (Capacitor)**
  Jalankan `npx cap copy android`.

- [ ] **Step 6.4: Commit Akhir & Dokumentasi**
  `git commit --allow-empty -m "chore: complete drink, brew, and pantry synergy implementation Phase 1 & 2"`
