# Design Guidelines & System Specifications - CoffeeFlow (MD3 Revamp)

This document is the authoritative design system specification for **CoffeeFlow**. It reflects the full Material Design 3 (Material You) architecture implemented across the application (`src/components`, `src/pages`, `tailwind.config.js`, `src/index.css`).

---

## 1. Product Feel & Design Language

CoffeeFlow is built around **Material Design 3 (Material You)** principles tailored for a modern, coffee-craft aesthetic:

- **Warm & Tactile**: Natural coffee brown palette (`#6F4E37`), warm creams, and tonal containers.
- **Mobile-First Shell**: Enforced max-width container (`max-w-md mx-auto`) with responsive scaling and safe-area padding.
- **Consistent Elevation via Tonal Surfaces**: Primary depth is communicated through surface container fill tokens (`bg-md-surface-container-low`, `bg-md-surface-container-high`) rather than heavy drop shadows.
- **Smooth Micro-Animations**: Active press feedback (`active:scale-[0.98]`), backdrop blurs (`backdrop-blur-md`), and seamless modal transitions.

---

## 2. Material Design 3 Token Architecture

### Color Palette Tokens (`tailwind.config.js` & `src/index.css`)

All color classes derive from the MD3 CSS Custom Properties:

| Token Class | Hex Value (Light) | Usage |
| :--- | :--- | :--- |
| `bg-md-surface` | `#FAF8F5` | Primary page canvas background |
| `bg-md-surface-container-low` | `#F5F2EE` | Cards, list rows, and container blocks |
| `bg-md-surface-container-high` | `#EFECE7` | Hover states, search inputs, chip fills |
| `bg-md-primary` | `#6F4E37` | Primary buttons, active tabs, main CTA |
| `text-md-on-primary` | `#FFFFFF` | Text on primary buttons/CTAs |
| `bg-md-primary-container` | `#F3EBE3` | Active chips, icon badges, avatar backgrounds |
| `text-md-on-primary-container` | `#3B2219` | Contrast text on primary container fills |
| `bg-md-secondary-container` | `#F4ECE6` | Tonal pills, toggle switches, filter badges |
| `text-md-on-secondary-container` | `#52443B` | Contrast text on secondary container fills |
| `border-md-outline-variant/30` | `rgba(215,195,183,0.3)` | Subtle card borders & divider lines |
| `text-md-on-surface` | `#1D1B16` | Main body & title typography |
| `text-md-on-surface-variant` | `#4F453E` | Subtitles, metadata, secondary descriptions |

---

## 3. Typography Tokens (MD3 Scale)

CoffeeFlow uses **Plus Jakarta Sans** and **Inter** with official MD3 typescale utility classes:

- **`typescale-display-large`**: Timer counters (`72px`, `font-extrabold`, `tabular-nums`)
- **`typescale-headline-small`**: Main sticky page headers (`24px`, `font-bold`)
- **`typescale-title-large`**: Modal titles & hero card names (`22px`, `font-bold`)
- **`typescale-title-medium`**: Card titles & list item titles (`16px`, `font-bold`)
- **`typescale-title-small`**: Secondary card headings (`14px`, `font-bold`)
- **`typescale-body-medium`**: Standard body prose (`14px`, `font-normal`)
- **`typescale-body-small`**: Card descriptions & metadata (`12px`, `font-normal`)
- **`typescale-label-large`**: Buttons, badges, and active tab labels (`14px`, `font-semibold`)
- **`typescale-label-medium`**: Filter chips, section tags (`12px`, `font-bold`, uppercase)

---

## 4. Component Standards

### A. Horizontal Row Card List Item (Standard for Equipment & Drinks)
```tsx
<div className="group flex items-center gap-4 p-4 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/30 hover:bg-md-surface-container-high hover:border-md-primary/40 transition-all active:scale-[0.98] cursor-pointer shadow-md-1">
  {/* Left Circular Avatar Container */}
  <div className="size-14 rounded-full bg-md-surface-container-highest flex items-center justify-center overflow-hidden border border-md-outline-variant/20 p-1 shrink-0">
    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-full" />
  </div>

  {/* Center Details */}
  <div className="flex-1 min-w-0">
    <h3 className="typescale-title-medium font-bold text-md-on-surface line-clamp-1 mb-0.5">
      {item.name}
    </h3>
    <p className="typescale-body-small text-md-on-surface-variant line-clamp-2 leading-tight">
      {item.description}
    </p>
  </div>

  {/* Right Chevron Only */}
  <Icon name="chevron_right" className="text-md-on-surface-variant/40 text-xl group-hover:translate-x-0.5 transition-transform shrink-0" />
</div>
```

### B. Sticky Page Header
```tsx
<header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20 space-y-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer">
        <Icon name="arrow_back" className="text-2xl" />
      </button>
      <div>
        <h1 className="typescale-headline-small font-bold text-md-on-surface">{pageTitle}</h1>
        <p className="typescale-body-small text-md-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  </div>
</header>
```

### C. Search Input Field
```tsx
<div className="relative">
  <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-md-on-surface-variant text-xl" />
  <input
    type="text"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Search..."
    className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 typescale-body-medium rounded-full pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-md-primary/40 border border-md-outline-variant/30 transition-all"
  />
</div>
```

### D. Primary Action Button (`Button.tsx`)
```tsx
<Button variant="filled" size="lg" onClick={handleSave} className="w-full">
  <span>Save Selection</span>
  <Icon name="check" className="text-xl" />
</Button>
```

---

## 5. Bottom Navigation Specs (`BottomNav.tsx`)

- **Container**: `fixed bottom-0 left-0 right-0 z-50 bg-md-surface-container border-t border-md-outline-variant/30 max-w-md mx-auto h-20 shadow-md-2`
- **4 Main Destinations**:
  1. `Home` (`/home`) — `icon: home`
  2. `Brewing` (`/brew-methods`) — `icon: coffee_maker`
  3. `Pantry` (`/pantry`) — `icon: inventory_2`
  4. `Journal` (`/journal`) — `icon: history_edu`
- **Active State**: Active tab is highlighted with `bg-md-secondary-container text-md-on-secondary-container` pill and filled icon (`fontVariationSettings: "'FILL' 1"`).

---

## 6. Page Inventory & MD3 Compliance Matrix

All 27 pages in `src/pages/` have been checked for visual and structural consistency:

| Page | Status | MD3 Features & Layout |
| :--- | :---: | :--- |
| `HomePage.tsx` | **PASS** | Tonal stats card, equipment grid, recent brew logs, MD3 quick CTAs |
| `BrewMethodsPage.tsx` | **PASS** | Clean horizontal row cards, avatar thumbnails, modal detail view, edit mode selection |
| `DrinkMenuPage.tsx` | **PASS** | Identical horizontal row list style, clean chevron right, MD3 FAB speed dial |
| `RecipeListPage.tsx` | **PASS** | Tonal container cards, MD3 filter chips, bookmark action, kebab options modal |
| `RecipeDetailPage.tsx` | **PASS** | Tonal stats grid, step timeline, tag pills, sticky bottom CTA |
| `RecipePreparationPage.tsx` | **PASS** | Dose scaler, step preview cards, pantry checklist, sticky timer CTA |
| `BrewFlowPage.tsx` | **PASS** | Wake-lock timer, phase progress bar, step recap cards, completion modal |
| `BrewLogPage.tsx` | **PASS** | Star rating slider, taste profile sliders, flavor chips, journal submit |
| `PantryPage.tsx` | **PASS** | Supplies/Gear segmented control, stock level indicators, bottom sheet detail |
| `PantryAddSelectionPage.tsx` | **PASS** | Category grid selection cards, MD3 surface containers, clean navigation |
| `PantryAddFormPage.tsx` | **PASS** | Dynamic input cards, single origin / blend toggles, quantity unit selector |
| `PantryEditPage.tsx` | **PASS** | Item detail edit fields, quantity/unit inputs, sticky save CTA |
| `JournalPage.tsx` | **PASS** | Timeline list rows, monthly stats banner, brew/drink logs tab control |
| `JournalDetailPage.tsx` | **PASS** | Interactive star rating, notes text area, sticky save/delete actions |
| `DrinkDetailPage.tsx` | **PASS** | Tonal container cards, step list, ingredient tags, sticky CTA |
| `DrinkEditPage.tsx` | **PASS** | Dynamic ingredient & instruction rows, WebP image upload, category selector |
| `DrinkLogPage.tsx` | **PASS** | Interactive star rating, notes textarea, sticky save CTA |
| `DrinkPreparationPage.tsx` | **PASS** | Step checklist with tonal checkmarks, disabled-until-done CTA |
| `RecipeEditPage.tsx` | **PASS** | Detailed recipe builder, dynamic step editor, duration/target inputs |
| `SettingsPage.tsx` | **PASS** | Settings section containers, custom toggle switches, backup & data controls |
| `BackupRestorePage.tsx` | **PASS** | Snapshot status cards, backup list rows, JSON file import/export |
| `RatioCalculatorPage.tsx` | **PASS** | Coffee & ratio input cards, prominent target water banner (`bg-md-primary`) |
| `QuickTimerPage.tsx` | **PASS** | Centered timer display (`typescale-display-large`), preset chips, primary CTA |
| `SplashPage.tsx` | **PASS** | Fullscreen brand logo animation container, MD3 progress bar |
| `WelcomePage.tsx` | **PASS** | Hero section with rounded container, brand logo badge, primary CTA |
| `OnboardingPage.tsx` | **PASS** | Multi-step setup wizard, 1+ equipment selector, bean profile forms |
| `PlaygroundPage.tsx` | **PASS** | Component showcase gallery, MD3 color tokens & typography demo |

---

## 7. Verification & Build Integrity

- **TypeScript Compilation**: Clean build (`0` errors with `tsc -b`).
- **Production Bundle**: Successfully verified via `npm run build`.
