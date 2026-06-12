# CoffeeFlow v3 - End-to-End Flow Audit

Tanggal audit: 2026-06-11

## Ringkasan Status

App belum siap end-to-end. Flow utama brew manual sudah punya kerangka dari onboarding -> recipes -> preparation -> timer -> log -> journal, tetapi masih ada blocker build, beberapa flow hanya UI shell, beberapa action tidak tersambung, dan beberapa data tidak dipersist dengan aman di web SQLite store.

Verifikasi teknis:

- `npm install` berhasil, tetapi menemukan 11 vulnerability: 4 moderate, 7 high.
- `npm run build` gagal karena TypeScript error di `RecipeDetailPage`.
- `npm run lint` gagal: 27 error, 2 warning.
- `node_modules` sebelumnya belum ada, sehingga build/lint awal tidak bisa jalan.

## Flow Belum Complete

### 1. Build / Release Readiness

Status: Blocker.

Yang belum jadi:

- Production build gagal di `src/pages/RecipeDetailPage.tsx` karena akses optional array `best_for_tags` dan `not_recommended_tags` dianggap mungkin `undefined`.
- Lint gagal di 27 error, termasuk `any` di repository/page, function dipakai sebelum deklarasi pada hook, dan unused variables.
- Security audit npm masih menunjukkan vulnerability high pada `react-router-dom`, `vite`, `rollup`, `flatted`, `minimatch`, `picomatch`.

Impact:

- App tidak bisa dianggap releasable karena `npm run build` berhenti sebelum Vite build.
- CI/CD akan gagal kalau memakai script build/lint standar.

### 2. Onboarding -> Home

Status: Partial.

Yang sudah ada:

- Splash mengecek `user_name` dan `user_preferred_methods`, lalu route ke welcome atau home.
- Onboarding menyimpan nama, brewing goal, app unit, user id, preferred methods, dan optional bean.

Yang belum jadi / risk:

- Kriteria onboarding selesai hardcoded harus punya tepat 6 preferred methods. Ini sesuai UI sekarang, tapi tidak ada explicit flag `onboarding_completed`.
- Step beans punya tombol `Skip` yang langsung `navigate('/home')`; karena methods sudah tersimpan, user dianggap selesai meski bean belum diinput. Ini mungkin OK, tapi belum ada state untuk membedakan skipped vs completed.
- Banyak setter settings tidak memanggil `saveToLocalStore()`, contohnya `setUserName`, `setAppUnit`, `setUserPreferredMethods`, `setUserPreferredDrinks`. Di web SQLite, data bisa tidak tersimpan permanen setelah refresh/close tergantung perilaku store.

Referensi:

- `src/pages/SplashPage.tsx`
- `src/pages/OnboardingPage.tsx`
- `src/features/settings/infrastructure/SQLiteSettingsRepository.ts:13`
- `src/features/settings/infrastructure/SQLiteSettingsRepository.ts:40`
- `src/features/settings/infrastructure/SQLiteSettingsRepository.ts:114`
- `src/features/settings/infrastructure/SQLiteSettingsRepository.ts:132`

### 3. Home Actions

Status: Partial.

Yang sudah ada:

- `Start Brewing` route ke `/brew-methods`.
- Recent brews mengambil data dari brew logs.

Yang belum jadi:

- `Mix a Drink` button tidak punya `onClick`, jadi tidak menuju `/drinks`.
- Stat `Beans` di dashboard sebenarnya menghitung `COUNT(DISTINCT recipe_id)` dari brew logs, bukan jumlah beans di pantry.
- Tip card close button tidak mengubah state, jadi tidak benar-benar dismiss.

Referensi:

- `src/pages/HomePage.tsx:83`
- `src/pages/HomePage.tsx:103`
- `src/features/brew/infrastructure/SQLiteBrewLogRepository.ts`

### 4. Brew Methods -> Recipe List

Status: Partial.

Yang sudah ada:

- Equipment preference bisa diedit dan disimpan.
- Method card route ke `/recipes?method=...`.

Yang belum jadi:

- Search input di Brew Methods belum tersambung ke filter apapun.
- `Quick Timer` dan `Ratio Calculator` hanya button visual, tidak ada route/action.
- Method source berasal dari hardcoded `ALL_METHODS`, bukan table `brewing_methods`.
- Preferred methods disimpan sebagai display name, sedangkan recipe filter memakai id lower-case. Untuk seed V60 masih aman karena filter lower-case, tapi custom recipe baru dari `method=v60` bisa menyimpan method_id berbeda dari seed `V60`.

Referensi:

- `src/pages/BrewMethodsPage.tsx`
- `src/core/database/seeding.ts`

### 5. Recipe List / CRUD

Status: Partial.

Yang sudah ada:

- List, search by name, filter method, clone, favorite, delete, add/edit recipe sudah ada.

Yang belum jadi:

- Chip `Light Roast` dan `Dark Roast` tidak punya logic filter; hanya `All`, `Personal`, `Community` yang bekerja.
- Add recipe bisa menyimpan field wajib sebagai string kosong atau angka undefined; tidak ada validation sebelum save.
- Recipe list menampilkan waktu stat hardcoded `3:30`, bukan hasil sum step duration.
- Delete adalah soft delete recipe, tetapi UI tidak menjelaskan dampaknya pada log/history.

Referensi:

- `src/pages/RecipeListPage.tsx`
- `src/pages/RecipeEditPage.tsx`
- `src/features/brew/infrastructure/SQLiteRecipeRepository.ts`

### 6. Recipe Detail

Status: Blocker karena build gagal.

Yang belum jadi:

- TypeScript error pada optional tags membuat `npm run build` gagal.
- Detail menghitung coffee weight dari `total_water / ratio`, tetapi tidak ada guard untuk ratio invalid seperti string kosong pada custom recipe.
- Start brewing route sudah ada, tapi bergantung pada recipe data valid.

Referensi:

- `src/pages/RecipeDetailPage.tsx:181`

### 7. Preparation -> Brew Timer

Status: Partial.

Yang sudah ada:

- Recipe dan pantry item diload.
- User bisa memilih bean/filter dari pantry.
- `startBrew` menyimpan active recipe, bean id, filter id, dan coffee consumed ke Zustand memory.

Yang belum jadi / bug:

- Button `I'm Ready, Start Timer` hanya berubah style saat checklist belum lengkap, tetapi tidak diberi atribut `disabled`. User tetap bisa klik dan mulai brew tanpa checklist lengkap.
- Jika tidak ada beans atau filter, user tetap bisa mulai brew setelah checklist karena tidak ada requirement selectedBeanId/selectedFilterId.
- Route Add Beans / Add Filters dari preparation mengarah ke `/pantry`, bukan langsung ke form add category.
- Sesi brew hanya ada di memory. Refresh browser di `/brew-flow` atau `/brew-log` membuat active session hilang.

Referensi:

- `src/pages/RecipePreparationPage.tsx:82`
- `src/pages/RecipePreparationPage.tsx:94`
- `src/pages/RecipePreparationPage.tsx:238`

### 8. Brew Timer -> Finish -> Log

Status: Partial.

Yang sudah ada:

- Timer engine step-based berjalan, ada pause/resume/stop.
- Finish screen route ke `/brew-log`.

Yang belum jadi / risk:

- Audio feedback function dipakai di hook sebelum deklarasi dan ditandai lint error oleh React hook immutability rule.
- Timer tidak persist. Refresh, tab close, atau app background lama akan kehilangan flow.
- Tidak ada manual next/skip step. Jika duration salah atau user perlu override, flow kurang fleksibel.
- Finish tanpa log `Back to Homepage` menghentikan brew tanpa catatan, belum ada recovery/draft.

Referensi:

- `src/pages/BrewFlowPage.tsx`
- `src/features/brew/application/BrewEngine.ts`
- `src/state/useBrewStore.ts`

### 9. Brew Log -> Journal

Status: Partial.

Yang sudah ada:

- Save log menulis ke `brew_logs`.
- Bean stock dikurangi sebesar coffee weight, filter stock dikurangi 1.
- Journal tab Brews membaca log dan join ke recipe.

Yang belum jadi / bug:

- `/brew-log` hanya bisa dipakai kalau `activeRecipe` masih ada di memory; direct open atau refresh langsung redirect ke home.
- Flavor tags hanya preset, tombol add tag belum ada action.
- Tidak ada edit/delete brew log.
- Tidak ada detail view untuk log.
- `brew_logs.recipe_id` schema `NOT NULL`, tapi foreign key memakai `ON DELETE SET NULL`; kontradiktif secara model.
- `SQLiteBrewLogRepository.save()` tidak memanggil `saveToLocalStore()`, sehingga persistensi web bergantung pada operasi berikutnya. Jika stock deduction tidak terjadi, log bisa tidak tersimpan ke IndexedDB store.

Referensi:

- `src/pages/BrewLogPage.tsx:21`
- `src/pages/BrewLogPage.tsx:56`
- `src/features/brew/application/BrewService.ts`
- `src/features/brew/infrastructure/SQLiteBrewLogRepository.ts`
- `src/core/database/schema.ts`

### 10. Pantry Inventory

Status: Partial.

Yang sudah ada:

- Add pantry item untuk beans, filters, milk, syrup, beberapa gear.
- Pantry list menampilkan beans, essentials, drippers, grinders, kettles.
- Bean detail modal ada.
- Stock deduction ada untuk brew flow.

Yang belum jadi / bug:

- Search input belum tersambung.
- Category mismatch: Add selection/form mendukung `sugar`, `other_ingredient`, `machine`, `french_press`, `aeropress`, tetapi domain type dan Pantry list tidak mendukung/menampilkan semua kategori itu.
- Pantry type hanya mengizinkan `beans | milk | syrup | filter | other | dripper | grinder | kettle | scale | accessory`, tetapi form cast category string langsung ke `PantryCategory`, sehingga invalid category tetap bisa masuk database.
- `machine`, `french_press`, `aeropress`, `scale`, `accessory`, `sugar`, `other_ingredient` tidak tampil di grouping utama setelah disimpan.
- Tidak ada edit/delete pantry item dari UI.
- Low stock flag tidak dihitung ulang saat stock berkurang.
- `remaining_stock` dan `quantity` dipakai campur; UI memakai fallback yang bisa salah untuk quantity `0` karena truthy check.

Referensi:

- `src/pages/PantryAddSelectionPage.tsx:9`
- `src/pages/PantryAddSelectionPage.tsx:18`
- `src/features/pantry/domain/entities.ts:3`
- `src/pages/PantryAddFormPage.tsx:57`
- `src/pages/PantryPage.tsx:34`
- `src/pages/PantryPage.tsx:35`

### 11. Drinks Flow

Status: Belum end-to-end.

Yang sudah ada:

- `/drinks` route ada.
- Drink menu hardcoded dengan edit preferred drinks.
- Drink logs repository dan journal tab Drinks sudah disiapkan.

Yang belum jadi / blocker flow:

- Home `Mix a Drink` tidak mengarah ke drinks menu.
- Klik drink di Drink Menu route ke `/recipes?drink=...`, tetapi `RecipeListPage` tidak membaca query `drink`. Hasilnya user masuk recipe list normal, bukan drink detail/flow.
- Tidak ada drink detail page.
- Tidak ada drink preparation / making flow.
- Tidak ada service method untuk membuat drink log.
- Table `drinks` tidak pernah di-seed, sementara journal query `JOIN drinks` butuh data drinks. Drink menu memakai hardcoded array, bukan table `drinks`.

Referensi:

- `src/App.tsx:43`
- `src/pages/HomePage.tsx:103`
- `src/pages/DrinkMenuPage.tsx:7`
- `src/pages/DrinkMenuPage.tsx:231`
- `src/features/brew/application/DrinkService.ts:11`
- `src/features/brew/infrastructure/SQLiteDrinkLogRepository.ts:54`

### 12. Journal / Activity

Status: Partial.

Yang sudah ada:

- Brews tab dan Drinks tab.
- Grouping by date.
- Monthly summary card.

Yang belum jadi / bug:

- Monthly summary untuk brews memakai `weeklyBrews`, bukan total bulan berjalan.
- Floating add pada Drinks tab route ke `/playground`, bukan drink creation/log flow.
- Timeline item tidak bisa dibuka ke detail.
- Tidak ada edit/delete log.
- Lint error karena `loadData` dipakai sebelum deklarasi dan missing dependency.

Referensi:

- `src/pages/JournalPage.tsx`

### 13. Settings / Preferences

Status: Partial.

Yang sudah ada:

- App unit toggle.
- Delete user data flow.
- Backup page route.

Yang belum jadi:

- Notifications toggle hanya local uncontrolled checkbox, tidak persist.
- User ID hardcoded `CF-102938`, bukan membaca `user_id` dari settings.
- Send Feedback, Terms & Privacy, Log Out tidak punya action.
- App unit disimpan, tapi app belum memakai unit conversion di recipe/preparation/brew screens.
- `clearUserData()` tidak memanggil `saveToLocalStore()` setelah delete, berisiko data web store tidak langsung konsisten.

Referensi:

- `src/pages/SettingsPage.tsx`
- `src/features/settings/infrastructure/SQLiteSettingsRepository.ts:141`

### 14. Backup / Restore

Status: UI simulation only.

Yang sudah ada:

- Backup list tersimpan ke table `backups`.
- UI menampilkan last backup dan history.

Yang belum jadi / blocker:

- Backup tidak mengekspor database/user data; hanya delay 2 detik dan membuat metadata random size.
- Restore tidak mengembalikan data; hanya delay 3 detik dan `console.log`.
- Label iCloud Drive hanya teks, tidak ada integrasi file/cloud.
- Backup repository save/delete tidak memanggil `saveToLocalStore()`.
- Welcome page punya tombol `Restore Backup Data`, tapi tidak ada action.

Referensi:

- `src/features/settings/application/BackupService.ts:20`
- `src/features/settings/application/BackupService.ts:36`
- `src/features/settings/infrastructure/SQLiteBackupRepository.ts:14`
- `src/pages/WelcomePage.tsx`

### 15. Database / Data Model

Status: Partial.

Yang belum jadi / risk:

- Schema punya `drinks` table, tetapi tidak ada seed drink data.
- `brew_logs.recipe_id TEXT NOT NULL` digabung dengan `ON DELETE SET NULL`, model tidak konsisten.
- Web SQLite store save tidak konsisten antar repository. Recipe dan pantry memanggil `saveToLocalStore()`, tapi banyak settings, brew log, drink log, backup tidak.
- Migration memakai `ALTER TABLE ADD COLUMN` tanpa guard per-column. Kalau state DB parsial/versi aneh, migration bisa gagal.
- `public/coffee_flow.db` ada, tetapi runtime menggunakan connection `coffee_flow_db`; belum jelas apakah file db public dipakai.

Referensi:

- `src/core/database/schema.ts`
- `src/core/database/sqlite.ts`
- `src/core/database/seeding.ts`

## Prioritas Fix Disarankan

1. Fix build blocker dan lint blocker utama supaya app bisa diverifikasi dengan build bersih.
2. Rapikan persistence: semua write repository/service harus memanggil `saveToLocalStore()` di web.
3. Complete brew E2E: disable preparation button benar, validate recipe data, persist active brew draft/session, save log reliably.
4. Complete pantry category model: samakan category selection, domain union, database grouping, dan UI display.
5. Decide drinks scope: hapus sementara dari primary nav/action atau bangun flow lengkap drink detail -> prepare/make -> log -> journal.
6. Replace backup simulation dengan export/import real database or JSON snapshot.
7. Tambahkan edit/delete/detail untuk pantry item dan journal log.
8. Upgrade vulnerable dependencies, terutama `react-router-dom` dan `vite`.

## Rekomendasi Implementasi

### Menu / Navigation Yang Perlu Dirapikan

Rekomendasi struktur menu utama:

- Home: dashboard ringkas, CTA `Start Brewing`, CTA `Mix a Drink`, recent activity.
- Brew: pilih method, recipe list, recipe detail, preparation, timer, log brew.
- Drinks: drink menu, drink detail, drink preparation, drink log.
- Pantry: inventory supplies dan gear, add/edit/delete item, stock tracking.
- Journal: history brew dan drink, detail log, edit/delete log, summary.
- Settings: profile, app preferences, data management, support/legal.

Implementasi yang perlu dilakukan:

- Hubungkan Home `Mix a Drink` ke `/drinks`.
- Putuskan apakah BottomNav tetap 5 tab atau Drinks digabung ke Brew. Kalau Drinks adalah fitur utama, BottomNav bisa: Home, Brew, Drinks, Pantry, Journal; Settings masuk dari header/profile.
- Tambahkan route yang hilang:
  - `/drinks/:id`
  - `/drinks/:id/prepare`
  - `/drink-log`
  - `/journal/brews/:id`
  - `/journal/drinks/:id`
  - `/pantry/:id`
  - `/pantry/:id/edit`
- Jangan arahkan drink ke `/recipes?drink=...`; buat flow drink sendiri.
- Tambahkan empty state dengan CTA yang benar untuk setiap tab.
- Hilangkan action visual yang belum jalan atau beri route/action: Quick Timer, Ratio Calculator, Send Feedback, Terms & Privacy, Log Out.

### Settings Yang Perlu Diimplement

Rekomendasi setting:

- Profile:
  - User name editable.
  - User ID dibaca dari `app_settings.user_id`, bukan hardcoded.
  - Brewing goal editable.
  - Preferred methods editable dari Settings juga, bukan hanya Brew Methods.
  - Preferred drinks editable.
- Preferences:
  - App unit benar-benar mempengaruhi tampilan gram/ml vs oz.
  - Notifications disimpan ke settings.
  - Haptic/audio feedback toggle untuk brew timer.
  - Theme preference: system/light/dark kalau dark mode memang dipakai.
- Data Management:
  - Export backup real sebagai JSON atau SQLite snapshot.
  - Import/restore real dengan validation dan preview.
  - Delete user data memanggil `saveToLocalStore()` setelah cleanup.
  - Optional: reset onboarding.
- Support & Legal:
  - Send Feedback minimal membuka `mailto:` atau internal feedback form.
  - Terms & Privacy route/static page.
  - About page dengan app version dari package metadata kalau memungkinkan.

### Feature Yang Perlu Diimplement

Must-have untuk MVP end-to-end:

- Build bersih: fix TypeScript, lint critical, dependency vulnerability high.
- Reliable local persistence: semua save/update/delete database memanggil web store save.
- Brew flow lengkap:
  - Recipe validation.
  - Preparation button benar-benar disabled sampai siap.
  - Optional validation beans/filter sesuai method.
  - Persist active brew session/draft.
  - Save brew log reliable.
  - Journal detail/edit/delete.
- Recipe management:
  - Add/edit validation.
  - Total time dihitung dari steps.
  - Filter chips benar-benar bekerja.
  - Favorite view/filter.
- Pantry:
  - Category model tunggal dan konsisten.
  - Search/filter.
  - Detail/edit/delete.
  - Low-stock threshold.
  - Stock history minimal untuk deductions.
- Drinks:
  - Seed table `drinks`.
  - Drink detail.
  - Drink making/preparation flow.
  - Save drink log.
  - Journal drinks detail/edit/delete.
- Backup/Restore:
  - Export all app tables.
  - Restore dengan confirmation, schema version check, dan post-restore refresh.

Nice-to-have setelah MVP:

- Quick Timer.
- Ratio Calculator.
- Recipe recommendations based on pantry beans.
- Brew analytics per method/bean.
- Import/export recipes.
- Reminder restock beans/filter.

### Urutan Implementasi Disarankan

Phase 0 - Stabilize:

- Fix build/lint blocker.
- Upgrade vulnerable dependencies.
- Tambahkan `saveToLocalStore()` konsisten.

Phase 1 - Complete Brew MVP:

- Recipe validation.
- Preparation guard.
- Brew session persistence.
- Log detail/edit/delete.
- Journal summary benar.

Phase 2 - Complete Pantry:

- Normalize category model.
- Add pantry detail/edit/delete.
- Search and low-stock logic.

Phase 3 - Complete Drinks:

- Seed drinks.
- Drink detail/prep/log flow.
- Journal drinks detail.

Phase 4 - Settings and Backup:

- Real profile/preferences.
- Real export/import restore.
- Support/legal routes.

## Commands Yang Dijalankan

```bash
npm install
npm run build
npm run lint
npm audit --json
```

## Implementation Pass - 2026-06-11

Status setelah implementasi:

- `npm run build` berhasil.
- `npm run lint` berhasil.
- `npm audit --audit-level=moderate` berhasil dengan `found 0 vulnerabilities`.
- Dev server berjalan di `http://127.0.0.1:5173/`.
- HTTP sanity check ke `/` dan `/drinks` mengembalikan `200 OK`.
- Browser automation via Playwright tidak dijalankan karena package `playwright` tidak tersedia di environment.

Yang sudah diimplement:

- Build blocker `RecipeDetailPage` diperbaiki.
- Lint blockers utama diperbaiki.
- Persistence SQLite web diperkuat untuk settings, brew logs, drink logs, pantry, backup.
- Home `Mix a Drink` tersambung ke `/drinks`.
- Welcome `Restore Backup Data` tersambung ke `/settings/backup`.
- Brew preparation button benar-benar disabled sampai checklist siap.
- Brew active session dipersist ke `sessionStorage` agar refresh tidak langsung kehilangan context.
- Timer feedback bisa dimatikan dari Settings.
- Recipe edit punya validation basic.
- Recipe list menghitung total time dari steps dan filter chips lebih fungsional.
- Pantry category model disamakan untuk kategori yang bisa ditambahkan.
- Pantry search ditambahkan.
- Pantry item bisa detail, edit, dan delete.
- Drinks flow ditambahkan end-to-end: menu dari DB, detail, preparation, log drink, journal.
- Drinks seed data ditambahkan ke database seeding.
- Journal summary monthly diperbaiki.
- Journal item bisa dibuka ke detail.
- Journal log brew/drink bisa edit rating/notes dan delete.
- Settings User ID membaca data nyata dari settings.
- Notifications dan timer feedback toggle dipersist.
- Feedback, Terms/Privacy, dan Back to Welcome action ditambahkan.
- Backup/restore diganti dari simulasi menjadi local JSON snapshot dari table app utama.
- Dependency vulnerabilities dibersihkan via `npm audit fix`.

Sisa catatan non-blocking:

- Build masih memberi warning chunk size `> 500 kB`; ini bukan blocker, tapi nanti bisa dipecah dengan dynamic import/manual chunks.
- Backup masih local snapshot, belum integrasi cloud/iCloud native.
- Browser automation visual belum terverifikasi karena dependency Playwright tidak tersedia.

## Icon, Menu, And Feature Audit - 2026-06-12

Masalah icon:

- Root cause: seluruh icon memakai Google Material Symbols CDN dari `index.html`. Jika font eksternal gagal dimuat, semua `<Icon />` berubah menjadi teks ligature seperti `arrow_back`, `coffee_maker`, atau kotak kosong.
- Fix: icon font dipindah ke self-hosted package `@fontsource/material-symbols-outlined`.
- Fix: `src/main.tsx` sekarang import font lokal.
- Fix: `src/index.css` mendefinisikan class `.material-symbols-outlined` secara eksplisit.
- Fix: link Google Material Symbols di `index.html` dihapus supaya runtime tidak bergantung CDN.

Menu/action audit:

- Static scan page-level button tanpa `onClick`/`type` sudah bersih.
- BottomNav sekarang menampilkan `Journal`, sehingga route journal tidak hanya reachable dari Home.
- `Quick Timer` sudah punya route `/quick-timer`.
- `Ratio Calculator` sudah punya route `/ratio-calculator`.
- `BrewLog` add flavor tag sekarang bekerja via prompt.
- `Journal` FAB pada tab drinks sekarang menuju `/drinks`, bukan `/playground`.
- Welcome `Terms` dan `Privacy` bukan lagi `href="#"`; sekarang ada action.
- Playground preview Cancel/Delete bukan lagi dead button.

Route HTTP audit:

Semua route berikut mengembalikan `200 OK` dari dev server:

- `/`
- `/welcome`
- `/onboarding`
- `/home`
- `/brew-methods`
- `/recipes`
- `/drinks`
- `/drinks/espresso`
- `/drinks/espresso/prepare`
- `/drink-log/espresso`
- `/pantry`
- `/pantry/add`
- `/pantry/add/beans`
- `/journal`
- `/settings`
- `/settings/backup`
- `/quick-timer`
- `/ratio-calculator`
- `/playground`

Verifikasi teknis setelah fix:

- `npm run build` berhasil.
- `npm run lint` berhasil.
- `npm audit --audit-level=moderate` berhasil dengan `found 0 vulnerabilities`.

Catatan:

- Build sekarang membundle font Material Symbols lokal. Ini menambah asset font `.woff2` dan `.woff`, tapi membuat icon reliable/offline-friendly.
- Browser visual automation tetap belum dijalankan karena Playwright tidak tersedia di environment ini.

## Navigation And Recipe Seed Pass - 2026-06-12

Navigation update:

- BottomNav disederhanakan menjadi 4 entry utama: `Home`, `Brew`, `Pantry`, `Journal`.
- `Settings` dipindahkan ke Home header sebagai icon button.
- `Drinks` tidak lagi menjadi BottomNav item; entry point tetap tersedia dari Home `Mix a Drink` dan route `/drinks`.
- `Quick Timer` dan `Ratio Calculator` tetap menjadi utility dari Brew Methods.

Recipe seed update:

- Recipe seed dipindahkan ke `src/core/database/recipeSeeds.ts`.
- Ditambahkan 10 brewing method seed.
- Ditambahkan 24 detailed original recipe seed:
  - V60: 4
  - AeroPress: 3
  - French Press: 3
  - Chemex: 3
  - Espresso: 4
  - Moka Pot: 2
  - Cold Brew: 2
  - Kalita: 1
  - Clever: 1
  - Siphon: 1
- Seeding sekarang insert missing recipes by id, sehingga tidak overwrite recipe yang sudah ada.
- Semua recipe punya metadata lengkap: difficulty, style, ratio, grind size, temperature, total water, description, philosophy, recommended/not recommended tags, dan timed steps.

End-to-end check:

- `npm run build` berhasil.
- `npm run lint` berhasil.
- `npm audit --audit-level=moderate` berhasil.
- Route HTTP check `200 OK` untuk:
  - `/`
  - `/welcome`
  - `/onboarding`
  - `/home`
  - `/settings`
  - `/brew-methods`
  - `/quick-timer`
  - `/ratio-calculator`
  - `/recipes`
  - `/recipes?method=v60`
  - `/recipes?method=aeropress`
  - `/recipes?method=french_press`
  - `/recipes?method=chemex`
  - `/recipes?method=espresso`
  - `/recipes?method=moka_pot`
  - `/recipes?method=cold_brew`
  - `/recipes?method=kalita`
  - `/recipes?method=clever`
  - `/recipes?method=siphon`
  - `/drinks`
  - `/drinks/espresso`
  - `/drinks/espresso/prepare`
  - `/drink-log/espresso`
  - `/pantry`
  - `/pantry/add`
  - `/pantry/add/beans`
  - `/journal`
  - `/settings/backup`
  - `/playground`

## Brew Flow UI Audit - 2026-06-12

Target audited:

- `http://localhost:5175/brew-flow`
- Example new recipe inspected: V60 `Balanced Daily Driver`.

Issue found:

- Recipe step `target_weight` is modeled as cumulative scale target, for example `50g -> 170g -> 288g`.
- `BrewFlowPage` incorrectly summed all previous target weights.
- Example: `50 + 170 + 288 = 508`, so the UI could show impossible progress like `508g / 288g`.
- UI text said `Pour 170g of water`, which reads like an incremental pour, even though the recipe means `pour until the scale reads 170g`.
- Non-pour steps showed generic `Wait for drawdown`, which was confusing for steps like `Stir`, `Settle`, `Dose`, or `Prep`.
- Long cold brew steps could display as very large minute values like `720:00`.

Fix implemented:

- `BrewFlowPage` now treats `target_weight` as cumulative.
- Current water progress uses latest cumulative target, not sum of all targets.
- Progress bar is clamped to max `100%`.
- Active pour title now says `Pour to Xg`.
- Subtitle shows incremental add amount, for example `Add about 120g`.
- Non-pour steps now use their real step label and instruction.
- Next-up steps now say `Pour to Xg` or the actual step label.
- Timer formatting now supports `H:MM:SS` for long durations.

Verification:

- `curl http://localhost:5175/brew-flow` returned `200`.
- `npm run build` succeeded.
- `npm run lint` succeeded.

## Calculation Audit - 2026-06-12

Scope audited:

- Recipe ratio parsing and coffee dose calculation.
- Recipe total water, cumulative pour target, and brew progress.
- Recipe total duration and long-duration formatting.
- Custom recipe step validation.
- Pantry stock save, display, and deduction after brew logs.
- Quick timer countdown and restart behavior.

Issues found:

- Coffee dose was calculated in multiple pages with manual ratio splitting, which was fragile for decimal ratios like `1:16.5`.
- Recipe list/detail/preparation used separate duration formatters; cold brew could read as `720:00` instead of `12:00:00`.
- Custom recipe editor allowed step target values that did not increase cumulatively.
- Custom recipe editor added/remapped steps with zero-based `step_order` in some cases.
- Pantry repository used `||` for quantity/remaining stock, so valid `0` stock could be saved or displayed incorrectly.
- Percentage pantry deduction did not update low-stock state.
- Quick timer showed `Restart` at `0:00`, but pressing it only toggled running without resetting remaining time.
- Brew engine progress could become invalid if a bad custom step had `0` duration.

Fix implemented:

- Added shared `src/shared/utils/brewMath.ts` for ratio parsing, dose calculation, duration formatting, cumulative target lookup, pour amount, and water progress.
- Recipe detail, preparation, list, brew flow, quick timer, and ratio calculator now use shared calculation helpers.
- Brew flow keeps `target_weight` cumulative and displays incremental pour separately as `Add about Xg`.
- Ratio calculator now supports decimal coffee and ratio inputs.
- Recipe editor validates ratio, total water, positive durations, increasing cumulative targets, and target <= total water; saved step order is normalized to 1-based.
- Pantry save/deduct/display now preserves `0`, uses nullish checks, clamps percent bars, and updates low-stock after deduction.
- Brew service deducts coffee stock only for finite positive values.
- Brew engine clamps progress and avoids division-by-zero behavior.

Verification:

- Seed calculation audit passed for 24 recipes: ratio valid, dose sane, duration positive, target increasing, target <= total water.
- Browser check on `http://localhost:5175/recipes/v60-balanced-daily-driver` showed `18g` coffee, `288ml` water, `1:16`, and `3:00`.
- Browser preparation check showed `Weigh 18g coffee` and `Heat 288ml water`.
- Browser brew-flow check showed `Pour to 50g`, `Add about 50g`, `50g / 288g`, and next cumulative target `Pour to 170g`.
- `curl -I http://localhost:5175/brew-flow` returned `200 OK`.
- `npm run lint` succeeded.
- `npm run build` succeeded.
