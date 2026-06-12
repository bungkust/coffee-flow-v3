# Agent Best Practices - CoffeeFlow

Tujuan dokumen ini: menjaga semua agent/developer yang mengerjakan CoffeeFlow bergerak dengan pola yang sama, tidak asal patch, dan selalu menjaga end-to-end flow.

## Prinsip Kerja

- Audit flow sebelum edit. Untuk setiap perubahan UI, cek route, service, repository, schema, dan persistence.
- Jangan menambah layar visual tanpa action nyata. Kalau tombol terlihat clickable, harus punya behavior, disabled state, atau explicit placeholder yang tercatat.
- Utamakan end-to-end vertical slice kecil dibanding banyak UI setengah jadi.
- Ikuti struktur existing: `pages`, `features/*/application`, `features/*/infrastructure`, `core/services`, `core/database`.
- Jangan membuat duplicate source of truth. Jika data ada di SQLite table, UI sebaiknya membaca dari service/repository, bukan hardcoded array kecuali untuk seed/template.
- Setiap write ke SQLite web harus memastikan data tersimpan ke IndexedDB store via `saveToLocalStore()`.
- Jangan menghapus atau revert perubahan user tanpa izin.

## Definition Of Done

Satu flow dianggap selesai kalau:

- Route tersedia dan bisa dicapai dari menu/CTA yang relevan.
- Empty, loading, error, and success states ada.
- Form punya validation untuk required fields.
- Data tersimpan ke SQLite dan tetap ada setelah refresh.
- Flow bisa dilanjutkan dari layar sebelumnya dan selesai ke layar berikutnya.
- `npm run build` berhasil.
- `npm run lint` minimal tidak menambah error baru.
- Tidak ada button/menu visual yang dead-end.

## Workflow Implementasi

1. Baca file terkait flow:
   - Route di `src/App.tsx`.
   - Page di `src/pages`.
   - Service di `src/core/services.ts`.
   - Domain entity dan repository.
   - Schema/migration di `src/core/database`.
2. Buat perubahan secara vertical:
   - UI page.
   - State/service method.
   - Repository persistence.
   - Route/navigation.
   - Verification.
3. Jalankan:
   - `npm run build`
   - `npm run lint`
4. Update report atau catatan jika masih ada intentional gap.

## Data And Persistence Rules

- Semua insert/update/delete repository harus memanggil `dbService.saveToLocalStore()` setelah operasi berhasil.
- Jangan simpan data penting hanya di Zustand memory kalau flow bisa refresh atau pindah tab.
- Gunakan schema yang konsisten dengan TypeScript domain type.
- Jika menambah category, field, atau table:
  - Update schema migration.
  - Update domain type.
  - Update repository mapping.
  - Update seed jika dibutuhkan.
  - Update UI grouping/filter.
- Hindari `any`; buat type untuk joined rows seperti `BrewLogWithRecipe` atau `DrinkLogWithDrink`.

## Navigation Rules

- CTA utama harus mengarah ke flow yang jelas.
- Query param harus dibaca oleh destination page. Jangan kirim `?drink=` kalau destination tidak memakainya.
- Direct URL harus punya fallback yang manusiawi, bukan layar kosong.
- Back behavior harus aman untuk entry dari direct link.

## Testing Checklist Manual

Minimal cek setelah perubahan flow:

- Fresh user: splash -> welcome -> onboarding -> home.
- Brew: home -> brew methods -> recipes -> detail -> preparation -> timer -> log -> journal.
- Pantry: add item -> list -> detail -> edit/delete jika tersedia.
- Drinks: home/menu -> drink detail -> prep/make -> log -> journal.
- Settings: toggle preference -> refresh -> value tetap.
- Backup: export -> restore -> data kembali.

## Quality Bar

- Jangan menambah dependency baru kalau bisa memakai stack existing.
- Error handling harus user-visible untuk action penting.
- Loading state tidak boleh infinite tanpa fallback.
- Data invalid dari custom form harus dicegah sebelum save.
- Security/dependency high vulnerability harus diprioritaskan sebelum release.

