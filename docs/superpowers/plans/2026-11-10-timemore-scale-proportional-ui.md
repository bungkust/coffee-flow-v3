# Timemore Scale Features & Proportional UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the `/scale` page into a proportional, barista-grade Timemore Black Mirror digital scale deck featuring 3 core brewing modes (Manual, Pour-Over Ⓐ Auto-Timer, Espresso ☕ Auto-Tare & Timer), real-time 3-metric display (Timer, Flow Rate, Weight), and ergonomic tactile controls (Row 1: Start/Pause + Reset, Row 2: Standalone Full-Width Tare).

**Architecture:** 
- State management and mode logic implemented directly in `src/pages/ScalePage.tsx` using reactive subscriptions to `useScaleStore` (weight, flow rate, battery, connection state).
- Mode state machine handling:
  - `manual`: Pure user-driven timing and taring.
  - `pour-over`: Auto-starts on water flow (≥ 0.5g), auto-pauses on brewer lift-off.
  - `espresso`: Auto-tares cup stability (> 10g stable for 1.2s), auto-starts on first drip (≥ 0.5g), auto-pauses when flow ceases (< 0.2g/s for 2s).
- Sound/Haptic feedback helper using Web Audio API oscillator beep + `navigator.vibrate`.
- Mobile layout following `antislop-layoutmobile` with a high-contrast matte LED deck and minimum 44px touch targets.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Material Symbols Icons, Web Audio API, Capacitor Core.

**Spec:** In-chat user specification matching Timemore Black Mirror (Basic 2, Basic 3, Nano) displays.

## Global Constraints
- Must maintain 100% compatibility with Timemore Dot BLE protocol adapter and mock demo mode.
- Must preserve `useWakeLock(true)` so the screen never sleeps while brewing.
- Minimum 44x44px touch targets on all interactive controls.
- Zero horizontal overflow across all mobile viewports (`360px` to tablet).
- No generic AI slop: clean coffee roast palette, dark matte scale deck, restrained high-contrast typography.

## Review Focus
- Cup stability threshold in Espresso mode must not false-trigger tare while pouring water.
- Auto-start must only trigger once per brew batch until reset or tare is clicked.
- Flow rate display must be cleanly positioned between Timer and Weight without cramped wrapping on narrow 360px screens.
- Start/Pause and Reset buttons must remain on a single row, leaving Tare as a standalone full-width button.
- Sound beep must degrade gracefully when Web Audio is muted or unsupported in browser/webview.

---

### Task 1: Mode State Machine & Sound Feedback Helpers

**Files:**
- Modify: `src/pages/ScalePage.tsx`
- Create test / verification: `src/features/scale/protocol/scaleModes.test.ts`

- [ ] Define `ScaleBrewMode = 'manual' | 'pour-over' | 'espresso'`.
- [ ] Add sound beep helper using Web Audio API (`playScaleBeep()`) and integrate with `navigator.vibrate`.
- [ ] Implement espresso mode state tracking (`cup_detected`, `extracting`, `finished`) and auto-tare/auto-start thresholds.
- [ ] Implement pour-over auto-start and lift-off detection.
- [ ] Write unit test for mode helper state transitions using Node test runner (`node --test`).

---

### Task 2: Build Proportional Timemore Matte LED Deck UI

**Files:**
- Modify: `src/pages/ScalePage.tsx`

- [ ] Replace the fragmented weight box and tiny companion row with a cohesive **Timemore Black Mirror LED Deck** (`rounded-[32px] bg-stone-900 border border-stone-800 text-stone-100 p-6 sm:p-8`).
- [ ] Top deck bar:
  - Battery percent & icon (`🔋 100%`).
  - Mode selector pills: `[ Manual ] [ Pour-Over Ⓐ ] [ Espresso ☕ ]`.
  - Sound/Haptic toggle button (`🔊` / `🔇`).
- [ ] Main 3-metric display (proportional and balanced across columns):
  - **Left (Timer):** `00:00` (large tabular mono, `text-3xl sm:text-4xl font-bold`).
  - **Center (Flow Rate):** `0.0 g/s` (with dynamic droplet icon & colored indicator).
  - **Right (Weight):** `0.0 g` (large tabular mono, `text-3xl sm:text-4xl font-bold`).
- [ ] Bottom deck status guide: informative 1-line label explaining what the current mode is waiting for (e.g. *"Waiting for pour (≥ 0.5g)..."* or *"Place cup to auto-tare"*).

---

### Task 3: Refactor Action Buttons (Row 1: Timer Controls, Row 2: Tare Standalone)

**Files:**
- Modify: `src/pages/ScalePage.tsx`

- [ ] Structure bottom actions into two distinct ergonomic rows:
  - **Row 1:** Timer controls grid:
    - Primary button: `[ ⏱️ Start / Pause / Resume ]` (responsive width, minimum 56px height, prominent states).
    - Secondary button: `[ ↺ Reset ]` (minimum 56px height, active when timer > 0 or running).
  - **Row 2:** Standalone full-width Tare button:
    - Full-width `[ ⏻ Tare Scale (0.0 g) ]` (h-14/h-16, bold coffee roast color `bg-primary text-on-primary`, clear haptic buzz).
- [ ] Ensure full keyboard/touch accessibility and active press feedback.

---

### Task 4: Verification & Mobile Layout Audit

- [ ] Run `npm run build` (`tsc -b && vite build`) to ensure 0 TypeScript or bundler errors.
- [ ] Run `node --test` to ensure existing and new protocol/mode tests pass.
- [ ] Verify responsive layout on mobile viewport sizes (`360px`, `390px`, `412px`, `768px`) for overflow or clipping.

