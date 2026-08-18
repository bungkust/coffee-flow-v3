# Design Guidelines - CoffeeFlow

The purpose of this document is to keep CoffeeFlow's look consistent as a mobile-first coffee workflow app. This document is a **living document** that reflects the current codebase (`src/components`, `src/pages`) — update it alongside the code whenever UI patterns change.

## Product Feel

CoffeeFlow should feel:

- Calm, warm, practical.
- Mobile-first and task-focused.
- Coffee craft oriented, but still light enough for everyday use.
- Dense enough for workflow, not like a landing page.

Avoid:

- Screens so decorative that the primary action gets buried.
- Cards stacked inside cards (see the Card rule).
- Buttons that look active but have no behavior.
- Long copy to explain features inside the app.

## Page Shell (Required)

Every page uses the following shell, except for special timer states like `isCompleted`:

```tsx
<div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl pb-32 ...">
  <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100">
    ...
  </div>
  <main className="flex-1 px-4 ...">
    ...
  </main>
  <BottomNav activeTab="..." />
</div>
```

- Max app width stays `max-w-md mx-auto` for the mobile shell.
- Root page uses `min-h-screen` + `pb-32` so content is not hidden behind the BottomNav.
- Sticky header (`sticky top-0 z-10`) uses `backdrop-blur-md` and `border-b border-gray-100`.
- Header uses `pt-12` for the status bar safe area.
- BottomNav is only for the 4 main destinations: `Home`, `Brewing`, `Pantry`, `Journal`.
- Floating action button (FAB) is only for the primary action on list screens: `RecipeListPage`, `PantryPage`, `JournalPage`.
- Form pages use a header with back + title; the save action lives in a sticky bottom button or the primary CTA.
- Detail pages use a sticky header, content sections, and a sticky primary action when there is a next step.

## Bottom Navigation

Exactly like `src/components/BottomNav.tsx` — **do not add/drop tabs without updating this file and every page that renders it.**

- 4 items, fixed order: `Home` (`/home`), `Brewing` (`/brew-methods`), `Pantry` (`/pantry`), `Journal` (`/journal`).
- `activeTab` only accepts `'home' | 'brewing' | 'pantry' | 'journal'`.
- Active item: `text-primary` + filled icon (`fontVariationSettings: "'FILL' 1"`). Inactive: `text-gray-400 hover:text-gray-600`.
- Icon label is small uppercase `text-[10px] font-bold`.
- `Settings` is NOT in the BottomNav; it is reached through the settings icon in the `HomePage` header.

## Header / Navbar Patterns

- **Page title**: `text-xl font-bold` (tracking-tight) for all pages.
- **Back button**: `w-10 h-10 -ml-2 rounded-full` with `arrow_back` icon `text-[24px]`, in the sticky header. Specifically in `BrewMethodsPage` and `DrinkMenuPage`, the back button only appears in `isEditing` mode.
- **Pages with method-level content**: header shows the title + optional `Edit` action on the top right (`text-xs font-bold text-primary`).
- **Edit mode** (`BrewMethodsPage`, `DrinkMenuPage`): the back button reappears, the title changes (`Edit Equipment` / `Edit Drinks Menu`), and there is a sticky bottom bar with the primary save button.

## Color Usage

Use the existing palette with discipline. Keep it consistent across all pages.

- `primary` (coffee brown, see `tailwind.config.js`) for action buttons, selected state, progress bar, active icons.
- `primary-dark` for primary button hover states.
- `bg-background-light` / `bg-background-dark` for page backgrounds.
- `bg-white` for cards on top of the light background.
- `bg-gray-50` for grouping headers, subtle backgrounds, and the segmented control container (active item uses `bg-white shadow-sm`).
- `bg-accent-light` for icon circles and label chips.
- `text-neutral-text` for titles and primary text.
- `text-gray-400`/`text-gray-500` for metadata, placeholders, borders, inactive states.
- `text-red-*` only for destructive/error (Delete, errors, low stock).
- `text-yellow-*`/`star` for ratings.
- Green (`#34A853` / `bg-green-100 text-green-700`) only for success/completed status.
- Dark mode: most pages are still light-first. `BrewMethodsPage` and `DrinkMenuPage` already support `dark:` classes; use the same pattern (`dark:bg-background-dark dark:bg-white/5 dark:border-white/5 dark:text-white`) when adding dark variants. Make sure it's applied across all pages before releasing dark mode.

Don't create new screens dominated by a single full color except for timer/flow screens (`BrewFlowPage` isCompleted state) that are intentionally focused.

## Typography

- Page title: `text-xl font-bold` (sometimes `tracking-tight`).
- Detail title: `text-2xl font-bold` when it's the main focus, e.g. the Pantry detail bottom sheet, `BrewFlowPage` done state.
- Card title: `text-base` or `text-sm font-bold`.
- Metadata: `text-xs font-medium text-gray-500` or small uppercase `tracking-wider`.
- Section header label: `text-xs font-bold text-gray-500 uppercase tracking-wider`.
- Icon label (super-small like `text-[10px]` uppercase) for stat details.
- Main Brew Flow timer: `text-[80px] font-extrabold tabular-nums tracking-tight`.
- Don't use hero-scale type in small cards.
- Normal letter spacing; uppercase labels may use `tracking-wider`.

## Components

### Button

- Primary action: `bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98]`.
- Large primary in flow steps: `py-4`/`py-5`, `rounded-2xl`, full width.
- Secondary/tertiary: `bg-gray-50 hover:bg-gray-100 text-[#181411] font-bold rounded-2xl border border-gray-100`.
- Destructive (text-only, e.g. "Back to Homepage"): `text-gray-400 font-bold hover:text-gray-600`.
- Red destructive: `bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl`.
- Disabled buttons must use the `disabled` attribute + `disabled:opacity-50 disabled:cursor-not-allowed` (see `BrewMethodsPage` save button).
- FAB: `w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 border-[3px] border-white`.

### Inputs

- Search input pattern: wrapper `relative` + icon `absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400` + input `w-full bg-white text-neutral-text placeholder-gray-400 rounded-xl py-2.5 pl-10 pr-4 border-none shadow-sm focus:ring-2 focus:ring-primary/50 text-sm font-medium`.
- Small uppercase labels for technical forms.
- Required fields get an indicator.
- Error text appears near the field. (See the validation message pattern in `RecipeEditPage`.)

### Cards

- Used for list items, summary blocks, modal content.
- Consistency: `bg-white p-4 rounded-xl shadow-sm border border-gray-100`.
- List cards must have hover/active states: `hover:border-primary/30 hover:shadow-md active:scale-[0.98]` (varies by screen).
- Don't put large cards inside large cards; use a single card layer with section wrappers.
- Small stat card: `flex-1 bg-accent-light rounded-lg py-1.5 px-2 text-center border border-primary/10` with label `text-[10px] uppercase tracking-wide font-bold` and value `text-xs font-bold text-primary`.

### Chips / Badge

- Filter chip: `px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm`; active `bg-primary text-white`, inactive `bg-white text-gray-600 border border-gray-200`.
- Tag pill (Best For / Not Recommended): `px-3 py-1 text-xs font-bold rounded-full border`; green `bg-green-50 text-green-700 border-green-100`, red `bg-red-50 text-red-700 border-red-100`.
- Method badge: `text-xs font-bold uppercase tracking-wider bg-primary/10 px-2 py-1 rounded-md text-primary`.
- Difficulty badge: colored bg (Beginner=green, Intermediate=orange, Advanced=red).

### Cards & Sections

- About/philosophy block: `bg-gray-50 rounded-lg border border-gray-100 p-3`.
- Steps list: `border-l-2 border-dashed border-gray-200` with number circle badges `w-8 h-8 rounded-full` (index 0 highlighted `bg-primary text-white`).
- Timeline (Journal): grouped with a date header + `h-px flex-1 bg-[#f4f2f0]`.
- Summary card: gradient `bg-gradient-to-br from-gray-50 to-[#f0ece9] rounded-xl p-5 border border-[#edebe8]`.

### Icons

- Use the existing `Icon` component (`src/components/Icons.tsx`) — Material Symbols Outlined self-hosted via `@fontsource/material-symbols-outlined`. Don't move to a CDN; icons must be offline-friendly.
- Icon fill via `style={{ fontVariationSettings: "'FILL' 1" }}`.
- Icons for section headers: `text-[16px]`-`text-[20px]`, colored `text-primary` or `text-gray-400`.
- Make sure icons use valid Material Symbols names.
- The custom `SplashLogoIcon` SVG is used for the splash, empty states, and import brand identity.

### Modal

Use `src/components/Modal.tsx` for confirmations (Delete, Stop Brewing, Delete User Data). Detail bottom sheets (like the Pantry item detail) may be built custom in the page (see `PantryPage`) — pattern: `fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm` + `bg-white w-full max-w-md rounded-t-3xl pt-8 pb-10 px-6 shadow-2xl animate-in slide-in-from-bottom-full`.

### Toast

Use the existing `src/components/Toast.tsx` when an action needs user feedback; don't build a new one.

## Flow-Specific Design (Current Implementation)

### Home (`HomePage.tsx`)
- Header: small date (greeting + `Good Morning/Afternoon/Evening`) + settings icon button on the right.
- Stats row: `flex divide-x` inside a white card with 3 columns (Weekly, Avg Rating, Beans) — numbers from real data via `brewService.getDashboardStats`.
- Action grid: 2 CTAs in `grid-cols-2 gap-3`:
  - "Start Brewing" → `/brew-methods` (primary filled, icon circle `bg-white/20`, arrow forward).
  - "Mix a Drink" → `/drinks` (outline white border, icon in `bg-accent-light`).
- Recent Brews: list items (avatar circle from method icon, name, `formatDate(brewed_at) • ratio`, rating star). CTA "View Log" → `/journal`.
- Empty state: dashed card `border-dashed border-gray-200`.
- Tip card: dark background `bg-gray-900` with lightbulb + dismiss close button.

### Brew Methods (`BrewMethodsPage.tsx`)
- Method list grid `grid-cols-2 gap-4` from `ALL_METHODS` (hardcoded) + filtered by preferred methods.
- Method card: rounded square image, name, description.
- Edit mode: picker grid `grid-cols-2 gap-3` with a max of 6 items, `check_circle` icon when selected.
- Other Tools section: Quick Timer (`/quick-timer`) & Ratio Calculator (`/ratio-calculator`) as list items with a prominent icon circle.
- Search input exists but is not yet connected to an actual filter.

### Recipes (`RecipeListPage.tsx`)
- Filter chips: `All`, `Favorites`, `Personal`, `Community`, `Light Roast`, `Dark Roast` — all work (Light/Dark based on `best_for_tags`).
- List item: title, subtitle "Synced from {method_id}", favorite bookmark button, kebab menu (`Edit`, `Clone`, `Delete`).
- Mini stat row: `Time` (from `sumStepDuration`), `Ratio`, `Temp`.
- FAB (Speed Dial): `Import Recipe` + `New Recipe` — opens the import modal or navigates to `/recipes/new/edit?method=...`.
- Empty state: icon + "No recipes found matching your criteria."

### Recipe Detail:
- Sticky header with back + title + edit.
- "About" card: method badge, difficulty badge, style, short/detailed description, philosophy block.
- Stats card: Coffee dose (from `calculateCoffeeDose`), Water (`total_water` ml), Temp (°C), Ratio, Time (`sumStepDuration`). Each stat cell: icon above value + label.
- Tags: "Best For" (green), "Not Recommended" (red).
- Steps list: numbered timeline (dashed border), step label/instruction, per-step duration `{duration_seconds}s`, pour targets shown as `+{amount}g (Target: {target}g)`.
- Ending step `Enjoy!` + total time.
- Sticky bottom CTA `Start Brewing` → `/recipes/:id/prepare`.
- Use `brewMath` helpers: `calculateCoffeeDose`, `sumStepDuration`, `formatDuration`, `formatWeight`, `getPourAmount`.
- Not found: centered icon + message + back link.

### Recipe Preparation (`RecipePreparationPage.tsx`)
- Sticky header: back + `Preparation` title.
- Title block: eyebrow `Ready to Brew?` (`text-sm font-semibold text-primary uppercase tracking-wider`) + recipe name (`text-2xl font-bold`) + hint text, on `bg-gray-50/30 border-b border-gray-50`.
- Stats grid `grid-cols-4 gap-2`: Coffee / Water / Temp / Grind; each stat cell `bg-gray-50 border border-gray-100 rounded-xl py-3` with value `text-sm font-bold` + label `text-[10px] uppercase tracking-wide font-semibold`.
- Dose Adjuster card: header title + `Ratio {ratio}` badge (`bg-primary/10 text-primary`), `-`/`+` stepper (`w-12 h-12 rounded-full border border-gray-200`, min 5g max 100g, step 0.5g), center value `text-3xl font-extrabold tabular-nums`, divider, then a `Scaled Water` + `Scale Ratio` grid (percentage of initial dose).
- Scaled Brew Steps preview card: per-step list (number, label, `+Xg (Target: Yg)` pill for pours, `{duration}s`).
- Selection via the `Dropdown` component for Bean & Filter from pantry; when empty, an inline card shows `No beans available` / `No filters available` + an `Add Beans` button → `/pantry/add/beans` or `Add Filters` → `/pantry/add/filter`.
- Checklist: 4 `CheckItem`s (weigh coffee & grind, heat water, rinse filter & preheat, add coffee & tare scale). Checked items = `bg-primary-light/30 border-primary/20`, checkbox `w-6 h-6 rounded-lg border-2`.
- Sticky CTA `I'm Ready, Start Timer`; `disabled={!isReady}` uses the `disabled` attribute + disabled style `bg-gray-100 text-gray-400 grayscale cursor-not-allowed`.
- `startBrew` sends `currentScaledRecipe` (scaled dose) + selected bean/filter, then navigates to `/brew-flow`.

### Brew Flow (`BrewFlowPage.tsx`)
- Phase card: `Phase {i+1} of {n}` badge, large countdown timer `text-[80px]`, title/instruction, cumulative water progress bar.
- Water progress: `currentTargetWeight / totalWaterRecipe`, clamped to 100%.
- Next Up list: all remaining steps, card with `rounded-xl`, number circle, label + target, duration.
- Bottom controls:
  - Pre-start: full-width `Start Brew`.
  - Running: `Stop` (secondary) + `Pause/Resume` (primary).
- Done state: full-screen centered `Done!` with trophy icon (green), "Enjoy your coffee", total water summary, previous step recap, `Finish & Log Brew` (→ `/brew-log`) + `Back to Homepage`.
- Wake Lock API keeps the screen on; haptic/sound feedback on step completion (from Settings).
- Reacts to the `feedbackEnabled` setting; `playFeedback` uses the Web Audio API.
- Persistence: sessionStorage hydrates the active brew so a refresh keeps the session.

### Brew Log (`BrewLogPage.tsx`)
- Sticky header `How was it?` + subtitle `{method.toUpperCase()} • {recipe.name}`.
- Rating: 5 large clickable stars (`text-[42px]`), selected `text-primary` + `FILL 1`, rating label below (`4.0 - Very Good`) via `getRatingLabel`.
- Taste Profile: 4 sliders (Sweetness, Acidity, Body, Bitterness) `h-1 bg-gray-100 accent-primary`; each row has a bold label + value chip `bg-primary text-white rounded-full` (Low/Medium/High); Low-High markers.
- Flavor Tags: preset chips (Fruity, Nutty, Chocolatey, Floral, Spicy) + a `+` button for custom tags via prompt.
- Notes: large `textarea` `bg-gray-50 rounded-2xl p-4`.
- Sticky bottom: `Save to Journal` (primary, writes brew log + deducts stock) and `Discard` (secondary, warning confirm).
- Without an active session (direct open of `/brew-log`) → redirect `/home`.

### Pantry (`PantryPage.tsx`)
- Tabs Supplies/Gear (segmented control `peer-checked` pattern).
- Search input live filtering (`searchQuery` over name/brand/description/tags).
- Supplies: Beans (stock bar) & Essentials lists.
- Gear: Drippers, Grinders, Kettles, Other Gear. Some with stock bars, some with tags.
- Item details via bottom sheet (not a separate route): cover with `max-w-md rounded-t-3xl`, Product/Profile/Tasting Notes/Info grid (Roast Date, Stock Left), Edit Item (→ `/pantry/:id/edit`) + Delete Item.
- FAB Add → `/pantry/add`.
- Round-dashed empty state with `inventory_2` icon.

### Drinks (`DrinkMenuPage.tsx`)
- Sticky header, search bar.
- Grid list of drinks from DB (`drinkService.getAllDrinks`), category chips (hot/cold), image, ingredients join.
- Edit mode: picker grid, save bottom bar. Similar to Brew Methods editing.
- `Edit` toggles selection. `isEditing` state renders a different UI.
- Active menu = sorted by preference.

### Journal (`JournalPage.tsx`)
- Tabs Brews/Drinks.
- Monthly summary card (Total brews/drinks + avg rating).
- Timeline grouped by date with heading + underline (using `h-px flex-1 bg-[#f4f2f0]`).
- Item card clickable → `/journal/:type/:id` detail.
- FAB: brews → `/recipes`; drinks → `/drinks`.
- Empty: "No activity recorded yet".

### Journal Detail (`JournalDetailPage.tsx`)
- Back header, log content, edit rating/notes, delete action.

### Settings (`SettingsPage.tsx`)
- Profile: User ID (from `settingsService.getUserId()`), greeting.
- Data Management: Backup & Restore (→ `/settings/backup`), Delete Data (confirm modal, `settingsService.clearUserData`).
- Preferences: Notifications toggle, Timer Feedback toggle, App Units (metric/imperial).
- Support & Legal: Send Feedback (`mailto:`), Terms & Privacy (alert/route), About (version `v1.2.0`).
- Back to Welcome → logout-like action.
- All toggles persist via `settingsService`.

### Backup/Restore (`BackupRestorePage.tsx`)
- Export snapshot as real JSON + restore with validation, per audit.
- Shows last backup & history.

## Empty / Error / Loading States

Every page that loads data must have three states:

- **Loading**: centered `animate-pulse` skeleton cards (grey `bg-white rounded-xl animate-pulse`) or a spinner `border-4 border-primary/20 border-t-primary rounded-full animate-spin`.
- **Empty**: short message, icon (small, `opacity-50`), and a CTA leading to the right action — e.g. "No recipes found matching your criteria.", "No brews logged yet. Start your journey!", "Pantry is Empty", "No activity recorded yet".
- **Error**: user-visible text/modal/toast; `console.error` is allowed but must not be the only feedback.

## Interaction States

- Buttons: `hover:opacity-90` or `hover:bg-primary-dark`; `active:scale-[0.98]`.
- Clickable cards: `hover:border-primary/30 hover:shadow-md`.
- FAB: `active:scale-90`.
- Chips: `hover:border-primary/50 hover:text-primary`.
- Chevron navigation rows: `group-hover:translate-x-1`.

## Dark Mode

- `BrewMethodsPage` and `DrinkMenuPage` already have dark classes. Pattern used:
  - `dark:bg-background-dark`.
  - Header: `dark:bg-background-dark/95 dark:border-white/5`.
  - Card: `dark:bg-[#2C241B]` `dark:border-white/5`.
  - Text: `dark:text-white` / `dark:text-gray-300`.
  - Icon bg: `dark:bg-white/5`.
- Keep it consistent: when adding a new screen, use the same pattern across all pages, or keep the screen intentionally light-only and note it.

## CSS / Tailwind Notes

- All styling uses Tailwind utilities + the scrollbar/animation helpers in `src/index.css` (scrollbar-hide, animation in).
- `font-display` is used for primary typography.
- `max-w-md mx-auto` is always on the root page.
- Don't add new dependencies when the existing stack works (same section as `agent.md`).

## Component Inventory (Existing, Reuse First)

Available in `src/components`:
- `BottomNav.tsx` — 4-tab nav.
- `Icon.tsx` (Material Symbols), `SplashLogoIcon`.
- `Modal.tsx` — confirmation/danger modal.
- `Toast.tsx` — feedback toast.
- `Card.tsx`, `Button.tsx`, `Input.tsx`, `Chip.tsx`, `Badge.tsx`, `Dropdown.tsx`, `ProgressBar.tsx`, `SmartImportModal.tsx`.
Check existing components before building new ones.

## Do Not

- Don't use an icon CDN; use the self-hosted font.
- Don't create new screens that ignore the `max-w-md` shell.
- Don't add `any` (see `agent.md`).
- Don't expand the BottomNav beyond 4 items; Settings is removed from the nav.
- Don't use gradient / decorative overlays that shrink the primary action.
- Don't write long UI text to explain features.

## Definition Of Done (design side)

Before merging UI:

- All visible actions work (remember the `disabled` attribute for buttons that aren't ready).
- Direct URLs have a fallback.
- Disabled buttons are truly disabled.
- Text fits within mobile width.
- Data after save appears on the origin/destination screen.
- The screen uses the same spacing, radius, and color patterns as existing pages.
- Reuse existing components where possible.
- `npm run build` succeeds, and `npm run lint` adds no new errors.
