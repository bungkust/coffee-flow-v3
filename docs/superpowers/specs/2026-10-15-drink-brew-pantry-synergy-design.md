# Specification & Implementation Plan: Drink, Brew & Pantry Synergy

**Date:** 2026-10-15  
**Topic:** Drink Recipe, Experimentation Lab & Synergy with Brew & Pantry  
**Status:** Draft / Planned  

---

## 1. Background & Executive Summary

Di versi saat ini, aplikasi `coffee-flow-v3` memiliki tiga domain utama terkait pembuatan kopi:
1. **Manual Brew (`Recipe`, `BrewLog`)**: Sangat matang, memiliki timer seduh live, kalkulasi rasio air/biji, evaluasi sensorik rasa lengkap (*Taste Profile*), dan terkoneksi langsung ke Pantry (pemilihan biji kopi & kertas saring, potong stok otomatis).
2. **Pantry (`PantryItem`)**: Menyimpan inventori lengkap dengan kategori: `beans`, `milk`, `syrup`, `sugar`, `filter`, `other_ingredient`, dan peralatan.
3. **Drink (`Drink`, `DrinkLog`)**: Masih berupa implementasi minimalis:
   - Data bahan (*ingredients*) berupa teks bebas string mentah.
   - Tidak ada kaitan ke resep ekstraksi kopi (*Brew/Espresso Base*).
   - Pengurangan stok Pantry masih menggunakan tebakan regex kasar (hanya mengambil item pertama).
   - Log minuman hanya berupa rating bintang 1–5 dan catatan teks bebas tanpa parameter sensorik rasa.
   - Tidak ada pencatatan riwayat eksperimen racikan (saat resep diedit, master resep tertimpa).
   - Fitur Smart Import masih meminjam modal manual brew (V60/filter) sehingga tidak sesuai untuk resep minuman.

Dokumen ini merancang **sinergi menyeluruh** antara **Brew, Drink, dan Pantry** serta roadmap implementasi bertahap (*multi-phase*) untuk mengubah modul Drink menjadi pusat pencatatan resep dan laboratorium eksperimen racikan minuman (*Drink Lab & Mixology*).

---

## 2. Arsitektur Sinergi (The Holy Trinity)

```
                     ┌──────────────────┐
                     │   PANTRY ITEMS   │
                     │ (Stok & Bahan)   │
                     └────────┬─────────┘
            Beans / Filters   │   Susu / Sirup / Gula
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌──────────────────┐                     ┌──────────────────┐
│   MANUAL BREW    │                     │   DRINK CRAFT    │
│ (Ekstraksi Kopi) │──[Espresso Base]───►│ (Peracikan/Mix)  │
└────────┬─────────┘                     └────────┬─────────┘
         │                                        │
         │ Brew Log                               │ Drink Log
         ▼                                        ▼
┌───────────────────────────────────────────────────────────┐
│                     ACTIVITY JOURNAL                      │
│             (Full Traceability & Sensory Lab)             │
└───────────────────────────────────────────────────────────┘
```

1. **Pantry → Brew**: Menyediakan biji kopi (`beans`) dan filter untuk ekstraksi espresso / filter / cold brew.
2. **Pantry → Drink**: Menyediakan bahan campuran non-kopi seperti susu (`milk`), sirup perasa (`syrup`), gula/pemanis (`sugar`), dan bahan lainnya (`other_ingredient`).
3. **Brew → Drink**: Menyediakan coffee base (misal: *Double Shot Espresso 36g* atau *Cold Brew Concentrate 60ml*) dengan profil ekstraksi tertentu.
4. **Drink → Journal**: Mencatat riwayat eksperimen dengan snapshot takaran presisi, bahan dari pantry yang digunakan, dan evaluasi rasa terperinci.

---

## 3. Desain Skema Database (Database Schema Migration v16)

Sistem migrasi di `src/core/database/schema.ts` akan menambahkan migration `version: 16`:

```sql
-- Migration Version 16: Synergy of Drink, Brew, and Pantry

-- 1. Menghubungkan master resep drink ke resep ekstraksi brew (opsional)
ALTER TABLE drinks ADD COLUMN base_recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL;

-- 2. Menghubungkan log eksperimen minuman ke Pantry (biji kopi & susu) dan Brew (resep ekstraksi)
ALTER TABLE drink_logs ADD COLUMN bean_id TEXT REFERENCES pantry_items(id) ON DELETE SET NULL;
ALTER TABLE drink_logs ADD COLUMN milk_id TEXT REFERENCES pantry_items(id) ON DELETE SET NULL;
ALTER TABLE drink_logs ADD COLUMN recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL;

-- 3. Menyimpan snapshot takaran persis saat eksperimen dibuat (agar riwayat tidak rusak saat master resep diedit)
ALTER TABLE drink_logs ADD COLUMN ingredients_snapshot_json TEXT;

-- 4. Parameter evaluasi sensorik eksperimen rasa
ALTER TABLE drink_logs ADD COLUMN sweetness INTEGER;        -- Skala 1 - 5
ALTER TABLE drink_logs ADD COLUMN coffee_strength INTEGER;  -- Skala 1 - 5
ALTER TABLE drink_logs ADD COLUMN creaminess INTEGER;       -- Skala 1 - 5
ALTER TABLE drink_logs ADD COLUMN flavor_tags TEXT;         -- CSV string tags, misal: "caramel,nutty,smooth"

-- 5. Indeks performa untuk query relasi
CREATE INDEX IF NOT EXISTS idx_drink_logs_bean ON drink_logs(bean_id);
CREATE INDEX IF NOT EXISTS idx_drink_logs_date ON drink_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_drinks_base_recipe ON drinks(base_recipe_id);

-- 6. Tabel Riwayat Penggunaan & Keluar-Masuk Stok Pantry (Pantry Activity Logs / Stock Ledger)
CREATE TABLE IF NOT EXISTS pantry_logs (
  id TEXT PRIMARY KEY,
  pantry_item_id TEXT NOT NULL,
  change_amount REAL NOT NULL,                 -- Nilai perubahan: negatif untuk keluar (-16), positif untuk masuk (+250)
  unit TEXT,                                  -- 'g', 'ml', 'pcs'
  action_type TEXT NOT NULL,                  -- 'brew' | 'drink' | 'restock' | 'adjustment' | 'waste'
  reference_id TEXT,                          -- id dari brew_logs atau drink_logs
  reference_name TEXT,                        -- Misal: "V60 Tetsu Kasuya 4:6" atau "Iced Vanilla Latte"
  notes TEXT,                                 -- Catatan tambahan (opsional)
  created_at TEXT NOT NULL,
  FOREIGN KEY (pantry_item_id) REFERENCES pantry_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pantry_logs_item ON pantry_logs(pantry_item_id);
CREATE INDEX IF NOT EXISTS idx_pantry_logs_date ON pantry_logs(created_at);
```

### Struktur `DrinkIngredient` (JSON Terstruktur & Kompatibel ke Belakang)
Disimpan dalam `drinks.ingredients_json`. Mendukung format string lama maupun format objek terstruktur:

```typescript
export interface DrinkIngredient {
    name: string;                                                          // Contoh: "Oat Milk" atau "Vanilla Syrup"
    amount?: number;                                                       // Contoh: 150
    unit?: 'ml' | 'g' | 'shot' | 'pump' | 'tsp' | 'tbsp' | 'pcs' | 'cube'; // Contoh: "ml"
    category?: 'beans' | 'milk' | 'syrup' | 'sugar' | 'other_ingredient'; // Pemetaan ke kategori pantry
    default_pantry_item_id?: string;                                       // Item default di pantry (opsional)
}

export interface PantryLog {
    id: string;
    pantry_item_id: string;
    change_amount: number;
    unit?: string;
    action_type: 'brew' | 'drink' | 'restock' | 'adjustment' | 'waste';
    reference_id?: string;
    reference_name?: string;
    notes?: string;
    created_at: string;
}
```

---

## 4. Rencana Implementasi Bertahap (Phased Roadmap)

### Phase 1: Database Migration & Core Domain Repositories (Include Pantry Logs)
* **Tujuan**: Mempersiapkan fondasi data dan repository agar siap menampung relasi Pantry, Brew, dan riwayat stok keluar-masuk.
* **Tugas**:
  1. Tambahkan `version: 16` di `src/core/database/schema.ts` (mencakup tabel `pantry_logs`).
  2. Perbarui entity TypeScript di `src/shared/domain/entities.ts` & `src/features/pantry/domain/entities.ts`:
     - Tambahkan field baru di `Drink` (`base_recipe_id?: string`).
     - Definisikan `DrinkIngredient` dan `PantryLog` interface.
     - Tambahkan field baru di `DrinkLog` (`bean_id`, `milk_id`, `recipe_id`, `ingredients_snapshot_json`, `sweetness`, `coffee_strength`, `creaminess`, `flavor_tags`).
  3. Buat `SQLitePantryLogRepository.ts` & perbarui `SQLiteDrinkRepository.ts`, `SQLiteDrinkLogRepository.ts`, `SQLitePantryRepository.ts`.
  4. Perbarui `PantryService.ts`:
     - Method `deductStock` diperkaya menerima metadata audit: `actionType`, `referenceId`, `referenceName`, `unit`.
     - Otomatis mencatat baris baru di `pantry_logs` setiap ada pemotongan stok dari Brew maupun Drink.
     - Method `logRestock(itemId, amount, unit, notes)` untuk mencatat stok masuk/restock.
     - Method `getItemLogs(itemId)` untuk mengambil riwayat pemakaian & keluar-masuk stok.
  5. Perbarui `BrewService.ts`:
     - Saat `logBrew` memotong stok beans & filter, teruskan nama resep (`recipe.name`) ke `pantryService.deductStock` agar tercatat di `pantry_logs` (misal: `-16g used by V60 Tetsu Kasuya`).
  6. Perbarui `DrinkService.ts`:
     - Method `logDrink` menerima parameter beans, milk, recipe, sensory profile, dan snapshot ingredients.
     - Meneruskan nama minuman ke `pantryService.deductStock` saat memotong stok beans, susu, sirup, dll.

---

### Phase 2: Drink Smart Import Modal (AI & Offline Parser)
* **Tujuan**: Menyediakan modal import instan khusus resep minuman (espresso drinks, mocktails, kopi susu kekinian) dari media sosial / web.
* **Tugas**:
  1. Buat komponen `src/components/DrinkSmartImportModal.tsx`:
     - **Mode AI (Prompt Assist)**: Instruksi prompt terstruktur untuk ChatGPT/Gemini menghasilkan JSON dengan format `name`, `category` (hot/cold), `ingredients` (amount, unit, name), `instructions`.
     - **Mode Offline (Regex Rule-Based)**: Parser lokal yang mengekstrak bahan dengan satuan (`ml`, `g`, `shot`, `pump`, `tbsp`, dll), kategori otomatis dari kata kunci (*iced, dingin, hot, hangat*), dan langkah-langkah racik.
     - **Preview UI**: Menampilkan ringkasan bahan terstruktur dan langkah racik, dengan opsi *"Save Direct"* atau *"Edit & Customize"*.
     - **Queue Support**: Mendukung import batch multi-minuman sekaligus.
  2. Perbarui `src/pages/DrinkMenuPage.tsx`:
     - Ganti modal import lama dengan `DrinkSmartImportModal`.
     - Perbaiki bug navigasi dari `/drinks/new` ke `/drinks/new/edit` dengan `state.prefill`.

---

### Phase 3: Sensory Evaluation & Experiment Logging di Journal
* **Tujuan**: Menjadikan pencatatan rasa minuman setara dengan Manual Brew, sehingga pengguna bisa mengevaluasi hasil racikan.
* **Tugas**:
  1. Perbarui `src/pages/DrinkLogPage.tsx`:
     - Tambahkan slider sensorik rasa:
       - **Sweetness** (1–5)
       - **Coffee Strength** (1–5)
       - **Creaminess** (1–5)
     - Tambahkan selector **Flavor Tags** khusus minuman (*Sweet, Milky, Creamy, Nutty, Chocolaty, Fruity, Floral, Spiced, Bitter, Refreshing*).
  2. Perbarui `src/pages/JournalPage.tsx` (Tab Drinks):
     - Tampilkan badge biji kopi / susu yang dipakai.
     - Tampilkan preview rating & tag rasa.
  3. Perbarui `src/pages/JournalDetailPage.tsx`:
     - Untuk tipe `drinks`, tampilkan detail bahan snapshot, beans yang dipakai, serta slider sensorik rasa yang bisa di-edit kembali.

---

### Phase 4: Drink Preparation & Synergy Selector (Pantry & Brew Link)
* **Tujuan**: Menghubungkan proses peracikan minuman dengan bahan di Pantry dan resep ekstraksi kopi di Brew.
* **Tugas**:
  1. Perbarui `src/pages/DrinkPreparationPage.tsx`:
     - Tambahkan bagian **"Select Ingredients from Pantry"**:
       - Dropdown Biji Kopi / Espresso Beans (filter dari `pantry_items` category `beans`).
       - Dropdown Susu (filter dari `pantry_items` category `milk`).
       - Dropdown Sirup / Pemanis (filter dari `pantry_items` category `syrup` / `sugar`).
       - (Opsional) Dropdown Resep Ekstraksi Kopi (filter dari `recipes` method `espresso` atau `cold_brew`).
     - Tampilkan peringatan jika kuantitas bahan di Pantry tidak mencukupi.
     - Tambahkan timer langkah opsional untuk proses yang memerlukan durasi (misal: *shake 15 detik*, *infuse 5 menit*).
  2. Eksekusi pemotongan stok bahan di Pantry secara presisi saat tombol *"Finish & Log"* ditekan, otomatis mencatat ke `pantry_logs`.

---

### Phase 5: Recipe Iteration, Scaling & Lab History di Drink Detail
* **Tujuan**: Mendukung alur R&D dan eksperimen berkelanjutan langsung dari halaman resep minuman.
* **Tugas**:
  1. Perbarui `src/pages/DrinkDetailPage.tsx`:
     - **Yield / Servings Multiplier**: Tombol scaling porsi (1x / 1.5x / 2x / Bottle 500ml) yang mengalikan takaran bahan secara proporsional.
     - **Trial History Tab**: Menampilkan riwayat log percobaan khusus untuk minuman tersebut langsung di bawah resep (melihat perkembangan rasa dari Trial 1 ke Trial berikutnya).
     - **"Tweak as New Version"**: Tombol duplikasi resep untuk mencoba variasi baru tanpa menimpa resep asli.

---

### Phase 6: Pantry Usage History & Stock In/Out View
* **Tujuan**: Memberikan visibilitas penuh pergerakan stok Pantry (kapan diambil, berapa gram/ml, untuk resep/minuman apa).
* **Tugas**:
  1. Di `PantryEditPage.tsx` (atau modal detail item pantry), tambahkan section **"Usage History / Riwayat Penggunaan"**:
     - Menampilkan daftar transaksi keluar-masuk barang dengan timestamp.
     - Badge jenis transaksi (misal: badge `Brew` warna primer, badge `Drink` warna sekunder, badge `Restock` warna hijau).
     - Contoh tampilan baris:
       - `Hari ini, 08:30` · `-18g` · Digunakan untuk **V60 Tetsu Kasuya 4:6**
       - `Kemarin, 14:15` · `-36g` · Digunakan untuk **Iced Spanish Latte**
       - `10 Okt, 10:00` · `+250g` · Restock / Beli baru
  2. Tombol cepat *"Quick Restock (+)"* di Pantry untuk menambah stok tanpa harus edit manual field quantity.

---

## 5. Rencana Pengujian & Validasi

1. **Database Migration Test**:
   - Memastikan app tetap bisa dibuka dan migrasi berjalan tanpa error pada database yang sudah ada data lamanya.
   - Kolom-kolom baru terisi secara aman (`NULL` untuk data lama).
2. **Build & Lint Verification**:
   - `npm run build` (`tsc -b && vite build`) harus lulus 100% tanpa type error.
3. **Smart Import Test**:
   - Menguji parser offline dengan resep bahasa Indonesia (*"Es Kopi Susu Gula Aren: 2 shot espresso, 120ml fresh milk, 20ml gula aren cair, es batu"*) dan bahasa Inggris.
   - Menguji import JSON response dari Gemini/ChatGPT.
4. **End-to-End Synergy Flow**:
   - Buat minuman baru via Smart Import.
   - Buka preparation, pilih beans & susu dari pantry.
   - Selesaikan langkah, isi slider rasa di DrinkLog.
   - Cek apakah stok beans & susu di Pantry berkurang dengan angka yang tepat.
   - Cek apakah log di Journal menampilkan beans, susu, dan skor rasa secara akurat.
