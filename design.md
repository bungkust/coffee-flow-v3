# Design Guidelines - CoffeeFlow

Tujuan dokumen ini: menjaga tampilan CoffeeFlow konsisten sebagai mobile-first coffee workflow app, bukan kumpulan screen yang terasa beda-beda.

## Product Feel

CoffeeFlow harus terasa:

- Calm, warm, practical.
- Mobile-first dan task-focused.
- Coffee craft oriented, tapi tetap ringan untuk dipakai setiap hari.
- Dense enough untuk workflow, tidak seperti landing page.

Hindari:

- Screen yang terlalu dekoratif sampai action utama tenggelam.
- Banyak card bertumpuk dalam card.
- Button yang terlihat aktif tapi tidak punya behavior.
- Copy panjang untuk menjelaskan fitur di dalam app.

## Layout System

- Max app width tetap `max-w-md mx-auto` untuk mobile shell.
- Header sticky untuk page yang punya list panjang.
- BottomNav hanya untuk destinasi utama.
- Floating action button hanya untuk action utama pada screen list.
- Form page memakai header dengan back + title + save.
- Detail page memakai sticky header, content sections, dan sticky primary action jika ada next step.

Spacing:

- Page horizontal padding: `px-4` untuk list, `px-6` untuk form/detail.
- Section gap: `gap-4` sampai `gap-6`.
- Card padding: `p-4` atau `p-5`.
- Bottom safe area: page dengan BottomNav pakai `pb-24` atau `pb-32`.

Radius:

- Standard cards: `rounded-xl`.
- Primary large CTA: `rounded-xl` atau `rounded-2xl`.
- Avoid `rounded-3xl` kecuali modal sheet/hero visual khusus.

## Color Usage

Gunakan palette existing dengan disiplin:

- Primary coffee/gold untuk action dan selected state.
- White cards di atas `bg-background-light`.
- Gray untuk metadata, borders, inactive state.
- Red hanya untuk destructive/error.
- Green hanya untuk success/completed.

Jangan membuat screen baru yang dominan satu warna penuh kecuali timer/done state yang memang fokus.

## Typography

- Page title: `text-xl font-bold`.
- Detail title: `text-2xl font-bold` jika jadi fokus utama.
- Card title: `text-base` atau `text-sm font-bold`.
- Metadata: `text-xs font-medium` atau uppercase kecil.
- Jangan gunakan hero-scale type di card kecil.
- Letter spacing normal; uppercase label boleh `tracking-wider`.

## Components

Button:

- Primary action: filled primary, full width pada mobile flow step.
- Secondary action: subtle gray/white.
- Destructive: red text/background only after confirmation.
- Disabled harus memakai `disabled` attribute, bukan hanya class visual.

Inputs:

- Label kecil uppercase untuk form teknis.
- Required fields diberi indikator.
- Error text tampil dekat field.
- Dropdown untuk pilihan finite.
- Slider hanya untuk numeric subjective rating/profile.

Cards:

- Dipakai untuk list item, summary block, modal content.
- Jangan masukkan card besar di dalam card besar.
- List cards harus clickable jika ada detail, dan punya hover/active state.

Icons:

- Pakai `Icon` component existing.
- Icon harus membantu scan, bukan dekorasi kosong.
- Icon-only button perlu ukuran tap target minimal 40px.

## Flow-Specific Design

Home:

- Prioritaskan 2 CTA: Start Brewing dan Mix a Drink.
- Recent activity harus actionable ke journal/detail.
- Stats harus mencerminkan data asli.

Brew:

- Method list visual, recipe list scannable.
- Recipe detail harus menonjolkan coffee/water/temp/time.
- Preparation harus memberi checklist jelas.
- Timer harus fokus pada current step, remaining time, next up.
- Completed state harus jelas memberi pilihan Log Brew atau discard/back.

Pantry:

- Supplies dan gear tetap tab.
- Item detail pakai bottom sheet atau detail route, tetapi edit/delete harus mudah ditemukan.
- Stock display harus konsisten: quantity + unit, bukan campur persen tanpa konteks.

Drinks:

- Drink menu tidak boleh reuse recipe route.
- Drink detail harus menampilkan ingredients, tools, steps, dan CTA make/log.

Journal:

- Timeline grouped by date.
- Summary harus sesuai range yang ditampilkan.
- Item click membuka detail.
- Edit/delete ada di detail, bukan memenuhi list.

Settings:

- Kelompokkan Profile, Preferences, Data Management, Support.
- Toggle harus persist.
- Dangerous action selalu confirmation modal.

## Empty / Error States

Setiap list harus punya:

- Empty message singkat.
- CTA menuju action yang benar.
- Icon kecil yang relevan.

Setiap action gagal harus punya:

- Toast/modal/error text yang user-visible.
- Console error boleh ada, tapi bukan satu-satunya feedback.

## Consistency Checklist

Sebelum merge UI:

- Apakah semua visible action bekerja?
- Apakah route direct link punya fallback?
- Apakah button disabled benar-benar disabled?
- Apakah text muat di mobile width?
- Apakah data setelah save muncul di layar asal/tujuan?
- Apakah screen memakai spacing, radius, dan color pattern yang sama dengan page existing?
- Apakah dark mode class konsisten atau screen tetap light-only secara intentional?

