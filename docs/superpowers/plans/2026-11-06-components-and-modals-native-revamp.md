# Components, Popups & Modals Native Mobile Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate all UI components, inputs, floating actions, popups, and bottom sheets in CoffeeFlow to high-end native iOS/Android fidelity, eliminating legacy desktop sharp corners (2px rounded-sm), broken dark-mode hardcoded colors (`bg-white`), and safe-area home indicator overlaps.

**Architecture:**
1. Upgrade input & form controls (`Input.tsx`, `Dropdown.tsx`) from legacy 2px radius (`rounded-sm`) to continuous 16px squircles (`rounded-2xl`) with refined focus states.
2. Fix floating action bars (`SaveBar.tsx`, `SpeedDialFab.tsx`, `Toast.tsx`) with dynamic safe-area insets and dark-mode MD3 tokens.
3. Polish all bottom sheets and popups (`BrewWizardSheet.tsx`, `RecipeShareModal.tsx`, `SmartImportModal.tsx`, `PantryItemLogs.tsx`, `Card.tsx`) with drag handles, spring animations, and dark-mode compatibility.

**Tech Stack:** React 19, Tailwind CSS 3, TypeScript, Material Design 3 semantic tokens, Apple HIG / Appllama standards.

---

## Global Constraints

- Must never break existing props contracts or state interfaces.
- Every modified component must look stunning in BOTH Light Mode and Dark Mode.
- No hardcoded `bg-white` or `text-gray-800`; always use `--md-sys-color-*` or Tailwind semantic tokens (`bg-md-surface-container`, `text-md-on-surface`).
- Tap targets must be at least 44x44pt (Apple HIG / WCAG 2.2).
- Sticky bottom action elements must include `pb-[max(env(safe-area-inset-bottom),1.25rem)]`.

---

## Review Focus

1. **Dark Mode Inversion Check:** Ensure modals, speed dial buttons, and input fields do not display blinding white backgrounds when `.dark` is active.
2. **iOS Home Indicator Bar Clearance:** Verify that sticky action bars (`SaveBar`) do not allow the system gesture bar to overlap buttons.
3. **Corner Radius Uniformity:** Ensure all form fields and cards share the same modern 12-16px squircle radius rather than mixed 2px/8px corners.
4. **Tap Target Reachability:** Verify close/back buttons inside modals have adequate padding (at least 40-44px tap area).
5. **Drag Handle Affordance:** Every bottom sheet must feature a centered grab bar indicating swipeability.

---

## Task 1: Form & Input Controls (`Input.tsx`, `Dropdown.tsx`, `Card.tsx`)

**Files:**
- Modify: `src/components/Input.tsx:38-50`
- Modify: `src/components/Dropdown.tsx:66-100`
- Modify: `src/components/Card.tsx:18-29`

**Impact Analysis:**
- Eliminates 2px sharp desktop corners across all edit pages (`PantryEditPage`, `RecipeEditPage`, `DrinkEditPage`, `PantryAddFormPage`, `SettingsPage`).
- Softens card containers throughout the app to modern 16px squircles.

- [x] **Step 1: Upgrade `Input.tsx` corner radius & borders**
  Replace `rounded-sm` with `rounded-2xl` (or `rounded-xl`), smooth border `border border-md-outline-variant/30`, and subtle primary focus ring.

- [x] **Step 2: Upgrade `Dropdown.tsx` button and popup menu**
  Replace `rounded-sm` and `rounded-xs` with `rounded-2xl` on the trigger button and `rounded-2xl` on the dropdown menu list container.

- [x] **Step 3: Upgrade `Card.tsx` corner radius**
  Replace `rounded-lg` (8px) with `rounded-2xl` (16px squircle) and subtle border styling.

- [x] **Step 4: Verify build**
  Run `npm run build`.

---

## Task 2: Floating Action Controls (`SaveBar.tsx`, `SpeedDialFab.tsx`, `Toast.tsx`)

**Files:**
- Modify: `src/components/SaveBar.tsx:25-36`
- Modify: `src/components/SpeedDialFab.tsx:30-68`
- Modify: `src/components/Toast.tsx:9-26`

**Impact Analysis:**
- Prevents iOS home indicator from overlapping sticky save buttons on iPhone / gesture Android.
- Fixes dark-mode flashing on SpeedDialFab items.
- Modernizes Toast notifications from sharp boxes to floating capsule pills.

- [x] **Step 1: Fix `SaveBar.tsx` safe-area bottom padding**
  Update default padding from `p-5` to `px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),1.25rem)]` with `bg-md-surface/90 backdrop-blur-xl border-t border-md-outline-variant/15`.

- [x] **Step 2: Fix `SpeedDialFab.tsx` dark mode & floating position**
  - Replace `bg-white text-gray-800` with `bg-md-surface-container-high text-md-on-surface border border-md-outline-variant/25 shadow-md-2`.
  - Replace `border-white` with `border-md-surface`.
  - Adjust bottom positioning to respect `calc(env(safe-area-inset-bottom) + 6.5rem)`.

- [x] **Step 3: Transform `Toast.tsx` into a floating capsule pill**
  Replace `rounded-xs` with `rounded-full shadow-lg backdrop-blur-md px-5 py-3 border border-md-outline-variant/20`.

- [x] **Step 4: Verify build**
  Run `npm run build`.

---

## Task 3: Bottom Sheets & Modals Polish (`BrewWizardSheet.tsx`, `RecipeShareModal.tsx`)

**Files:**
- Modify: `src/components/BrewWizardSheet.tsx:97-120`
- Modify: `src/components/RecipeShareModal.tsx:85-110`
- Modify: `src/components/RecipeShareModal.tsx:170-198`

**Impact Analysis:**
- Standardizes mobile bottom sheet presentation with grab handle, `rounded-t-[32px]`, and safe-area insets.
- Increases tap targets for navigation buttons to 44px.

- [x] **Step 1: Upgrade `BrewWizardSheet.tsx`**
  - Add mobile grab handle: `<div className="w-12 h-1.5 rounded-full bg-md-outline-variant/40 mx-auto mt-3 mb-1 sm:hidden" />`.
  - Update top radius to `rounded-t-[32px] sm:rounded-[32px]`.
  - Enlarge back/close button tap target to `size-10` with `active:scale-95`.
  - Add `pb-[max(env(safe-area-inset-bottom),1.5rem)]` to content container.

- [x] **Step 2: Upgrade `RecipeShareModal.tsx`**
  - Add mobile grab handle at the top of the sheet.
  - Update top radius to `rounded-t-[32px] sm:rounded-[28px]`.
  - Add `pb-[max(env(safe-area-inset-bottom),1.25rem)]` to action footer.

- [x] **Step 3: Verify build**
  Run `npm run build`.

---

## Task 4: Dark Mode & Data Fidelity in Modals (`SmartImportModal.tsx`, `PantryItemLogs.tsx`)

**Files:**
- Modify: `src/components/SmartImportModal.tsx:526-550`
- Modify: `src/components/PantryItemLogs.tsx:45-78`
- Modify: `src/components/PantryItemLogs.tsx:100-140`

**Impact Analysis:**
- Eliminates blinding white modal background in `SmartImportModal` when using dark mode.
- Adds dark mode contrast to `PantryItemLogs` action badges and tabular numerals to quantity diffs.

- [x] **Step 1: Fix `SmartImportModal.tsx` dark mode & bottom safe-area**
  - Replace `bg-white` with `bg-md-surface-container-high text-md-on-surface border border-md-outline-variant/25`.
  - Add drag handle and safe-area bottom padding.

- [x] **Step 2: Polish `PantryItemLogs.tsx` badges and tabular numerals**
  - Add dark-mode token classes (`dark:bg-amber-950/40 dark:text-amber-300`, etc.) to action badges.
  - Ensure quantity diffs use `tabular-nums font-mono`.

- [x] **Step 3: Verify build & lint**
  Run `npm run build` and confirm all files compile with 0 errors.
