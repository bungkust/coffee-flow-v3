# Native Mobile Design & UX Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform CoffeeFlow from a web-in-a-wrapper into a top-tier native iOS/Android experience across all core pages, adhering to Apple HIG, Material Design 3, and Appllama mobile benchmarks.

**Architecture:** 
1. Establish a native shell foundation (viewport-fit=cover, dynamic safe area insets, touch manipulation, overscroll protection, squircle continuous corners).
2. Upgrade modal presentation to native iOS/Android Bottom Sheets with spring animations and swipe-to-dismiss drag handles.
3. Polish visual hierarchy, tabular number typography, and haptics page-by-page across Smart Scale, Active Brew Flow, Home, Brewing Methods, Pantry, and Journal.

**Tech Stack:** React 19, Vite, Tailwind CSS 3, Capacitor (Android/iOS), TypeScript, Zustand, Material Symbols Outlined.

**Spec:** Appllama Mobile Design Standard (`appllama-app-design-skill`) & Antislop Quality Gate (`antislop`, `antislop-ui`, `antislop-human`).

---

## Global Constraints

- Never break existing database schemas, service interfaces, or BLE scale communication protocols.
- Always support both Light Mode and Dark Mode with Material Design 3 semantic color tokens.
- Numbers that count, weigh, or measure time must always use `tabular-nums` / font-variant tabular numerals.
- Spacing rhythm must strictly adhere to the 4pt/8pt grid.
- Modals that present options or hardware pairing on mobile must be rendered as bottom sheets, not centered desktop dialogs.
- Interactive tap targets must be at least 44x44pt (Apple HIG / WCAG 2.2).
- Dynamic safe areas `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` must be used dynamically; no static `pt-10` or fixed `h-20` headers/footers.

---

## Review Focus

1. **Notch & Dynamic Island Collision:** Status bar or camera cutout clipping header text or action buttons on devices with deep insets.
2. **Home Indicator Overlap:** Bottom navigation labels or sticky action bars covered by the iOS home swipe bar.
3. **Double-Tap Zoom / Tap Delay Glitches:** Mobile web browser defaulting to 300ms tap delay or accidental zooming on quick taps.
4. **Number Jitter:** Timers, scale decimals, or flow rates shifting layout horizontally as numbers change.
5. **Back Navigation Hijack:** Modals and bottom sheets must dismiss on Android hardware back button or swipe-down gesture without exiting the app.

---

## Task 1: Native Shell, Viewport & Global Touch Hygiene

**Files:**
- Modify: `index.html:7`
- Modify: `src/index.css:83-146`
- Modify: `src/components/PageHeader.tsx:26-37`
- Modify: `src/components/BottomNav.tsx:8-39`

**Impact Analysis:**
- Affects every screen in the app.
- Resolves letterboxing on edge-to-edge screens.
- Fixes home indicator clipping and status bar notch collisions.

- [x] **Step 1: Update viewport metadata in `index.html`**
  Add `viewport-fit=cover, user-scalable=no, maximum-scale=1.0` to the viewport meta tag in `index.html`.

- [x] **Step 2: Add global mobile hygiene and safe-area utilities in `src/index.css`**
  - Add `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` to all interactive elements.
  - Add `overscroll-behavior-y: none` and `user-select: none` to `body`.
  - Add safe-area padding helper classes (`pt-safe`, `pb-safe`, `min-h-safe-bottom`).

- [x] **Step 3: Refactor `PageHeader.tsx` to dynamic safe-area insets**
  Replace static `pt-10` with `pt-[max(env(safe-area-inset-top),1.5rem)]` and ensure smooth backdrop-blur.

- [x] **Step 4: Refactor `BottomNav.tsx` to dynamic safe-area insets and enhanced active tab indicator**
  - Replace static `h-20` with `min-h-[4.5rem] pb-[env(safe-area-inset-bottom)]`.
  - Polish the active tab pill with continuous squircle corners and subtle scale feedback.

- [x] **Step 5: Verify build**
  Run `npm run build` to confirm compilation without errors.

---

## Task 2: Native Bottom Sheet Pattern & Scale Pairing Modal

**Files:**
- Modify: `src/components/ScalePairingModal.tsx:48-130`
- Modify: `src/components/Modal.tsx:68-119`

**Impact Analysis:**
- Replaces desktop-like floating dialogs with modern mobile bottom sheets with grab handle and slide-up transition.
- Hardware back button continues to dismiss the sheet gracefully via existing `useBackHandler`.

- [x] **Step 1: Refactor `ScalePairingModal.tsx` into a Native Bottom Sheet**
  - Change wrapper from centered flex to bottom-aligned `items-end sm:items-center`.
  - Add standard grab handle: `w-10 h-1.5 rounded-full bg-md-outline-variant/40 mx-auto mb-3`.
  - Add rounded top corners `rounded-t-[32px] sm:rounded-[32px]` with slide-up animation `animate-in slide-in-from-bottom duration-250 ease-out`.
  - Polish device list items with pulse indicator for scanning and crisp battery/RSSI status badges.

- [x] **Step 2: Update `Modal.tsx` to support bottom sheet presentation on mobile**
  - Allow responsive presentation: bottom sheet on mobile screens, centered dialog on larger screens.
  - Refactor action buttons to full-width stacked or balanced grid with primary action clearly highlighted.

- [x] **Step 3: Verify build**
  Run `npm run build` to ensure type safety and styling integrity.

---

## Task 3: Smart Scale Page (`ScalePage.tsx`) Native Polish

**Files:**
- Modify: `src/pages/ScalePage.tsx:130-298`

**Impact Analysis:**
- Enhances readability during active weighing.
- Aligns typography of unit 'g' with the giant numbers.
- Ensures zero layout shift with `tabular-nums` throughout.

- [x] **Step 1: Refine Hero Weight Card & Unit 'g' alignment**
  - Ensure dominant weight number (`text-7xl` to `text-9xl`) has tight letter-spacing (`tracking-tighter`) and explicit `font-variant-numeric: tabular-nums`.
  - Position the 'g' unit neatly at the baseline with optical offset and subtle opacity (`text-md-on-surface-variant/70`).
  - Optimize reactive ambient glow to reduce GPU overdraw while keeping warm visual depth.

- [x] **Step 2: Polish Companion Symmetrical Row (Auto - Timer - Reset)**
  - Enhance active state pill for Auto-Start toggle with gold/primary accent.
  - Format timer display with monospaced tabular numerals.
  - Add micro-haptic triggers (`navigator.vibrate`) on Reset, Tare, and Mode changes.

- [x] **Step 3: Polish Tare and Timer Bottom CTA Buttons**
  - Ensure 56px minimum tap height with `rounded-2xl` squircle curves and tactile active scale feedback (`active:scale-[0.98]`).
  - Give "Tare" solid primary elevation and "Timer" secondary tonal contrast.

- [x] **Step 4: Verify build**
  Run `npm run build`.

---

## Task 4: Home Page (`HomePage.tsx`) Visual Hierarchy & Shelf Peek

**Files:**
- Modify: `src/pages/HomePage.tsx:57-220`

**Impact Analysis:**
- Elevates the visual hierarchy of the main landing screen.
- Distinguishes primary daily action ("Start Brewing") from secondary actions.
- Replaces the single isolated bean card with a richer shelf peek with roast freshness badges.

- [x] **Step 1: Redesign Quick Actions Section**
  - Transform "Start Brewing" into the dominant primary hero card (rich coffee roast background, warm iconography, subtle elevation).
  - Arrange "Mix a Drink" and "Smart Scale" as clean companion cards below or alongside it.

- [x] **Step 2: Enhance "From your shelf" Beans Section**
  - Add horizontal scrolling or expanded cards showing available beans with roast freshness pill badges (e.g. "Peak Flavor · 12 days off roast", "Degassing", "Resting").
  - Add remaining grams bar to give immediate pantry context.

- [x] **Step 3: Polish Recent Brews & Empty States**
  - Add subtle empty state illustration/warm iconography with clear call-to-action button.
  - Align date/time display with compact native labels.

- [x] **Step 4: Verify build**
  Run `npm run build`.

---

## Task 5: Active Brew Flow (`BrewFlowPage.tsx`) Rapid-Pour Guidance

**Files:**
- Modify: `src/pages/BrewFlowPage.tsx:17-33`
- Modify: `src/pages/BrewFlowPage.tsx:280-450`

**Impact Analysis:**
- Critical for single-handed use while pouring boiling water.
- Provides immediate visual color zones (in-target tolerance vs under/over-pour).

- [x] **Step 1: Add Pour Tolerance Visual Feedback**
  - When live scale weight is within ±2g of current step target, transition status ring/pill to emerald green (`bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30`).
  - When pour exceeds step target by >5g, show warm amber caution highlight.

- [x] **Step 2: Polish Live Water Progress & Step Counter**
  - Ensure all step countdowns and pour weights use tabular numbers.
  - Add smooth CSS transitions to the water progress bar.

- [x] **Step 3: Refactor Stop/Abort Modal into Bottom Action Sheet**
  - Present abort brew confirmation as a bottom action sheet with clear "Discard Brew" (red destructive) and "Cancel" buttons.

- [x] **Step 4: Verify build**
  Run `npm run build`.

---

## Task 6: Brewing Equipment & Methods (`BrewMethodsPage.tsx`)

**Files:**
- Modify: `src/pages/BrewMethodsPage.tsx:143-260`

**Impact Analysis:**
- Streamlines equipment browsing and selection.
- Eliminates endless scrolling in edit mode with sticky category chips.

- [x] **Step 1: Add Sticky Category Filter Chips**
  - Add horizontal chip selector (*All*, *Pour Over*, *Espresso*, *Immersion*, *Vacuum/Cold*) beneath the search bar.
  - Smooth filtering without deep nested scrolling.

- [x] **Step 2: Polish Equipment Cards & Selection Badges**
  - Apply squircle continuous corners (`rounded-2xl`) and refined borders.
  - Add animated checkmark badge in top-right corner when selected in Edit mode.

- [x] **Step 3: Verify build**
  Run `npm run build`.

---

## Task 7: Pantry (`PantryPage.tsx`) & Journal (`JournalPage.tsx`) Polish

**Files:**
- Modify: `src/pages/PantryPage.tsx:80-220`
- Modify: `src/pages/JournalPage.tsx:70-180`
- Modify: `src/components/SegmentedControl.tsx`

**Impact Analysis:**
- Brings iOS/Android sliding segment control to tab switching.
- Adds visual stock level bars to pantry items.
- Adds compact metric chips to journal cards.

- [x] **Step 1: Upgrade `SegmentedControl.tsx` with smooth animated sliding indicator**
  - Add active pill background with smooth spring sliding animation across tabs.

- [x] **Step 2: Add visual stock bar to Pantry items**
  - Thin 3px progress bar under bean cards colored green (>100g), amber (30-100g), or red (<30g).

- [x] **Step 3: Enhance Journal Brew Cards with compact native metric chips**
  - Display ratio, brew time, and grams as clean tabular chips (`1:16`, `15g → 240g`, `2:35`).
  - Warm golden star rating icons and styled flavor tag chips.

- [x] **Step 4: Run end-to-end build & lint verification**
  Run `npm run build` and verify all routes compile cleanly.

