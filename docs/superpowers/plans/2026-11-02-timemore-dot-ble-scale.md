# Timemore Dot BLE Smart Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Timemore Dot (TES017) BLE smart scale into Coffee Flow v3, providing real-time weight & flow rate, dynamic ratio tracking, dual curve chart visualization, and a dedicated scale preparation card, while strictly preserving the existing Manual Timer mode as-is.

**Architecture:** A clean three-tier architecture: (1) pure protocol encoder/decoder with CRC-16, (2) an abstract BLE adapter layer bridging Capacitor BLE on Android with Web Bluetooth fallback in browser dev, and (3) a reactive Zustand store feeding the UI components (`ScaleConnectPill`, `ScalePairingModal`, `BrewCurveChart`, `RecipePreparationPage`, and `BrewFlowPage`).

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, Web Bluetooth API / `@capacitor-community/bluetooth-le`, SVG graphics.

**Spec:** [docs/superpowers/specs/2026-11-02-timemore-dot-ble-scale-design.md](file:///Users/ruangguru/Documents/Bungkuss/coffee-flow-v3/docs/superpowers/specs/2026-11-02-timemore-dot-ble-scale-design.md)

## Global Constraints

- **Manual Mode Fidelity:** When `brewMode === 'manual'`, the brew flow and preparation page must behave 100% identically to the existing code without any scale UI intrusion or overhead.
- **Hardware Protocol:** Custom GATT service `0xFFF0` (Notify `0xFFF1`, Write `0xFFF2`) with binary frame format `0xA55A` + Opcode + Cmd + Length + Payload + CRC-16/IBM (`0x8005`, init `0xFFFF`).
- **Data Resolution:** Weight in grams with 0.1g resolution (scale integer / 10), flow rate in g/s (scale integer / 10).
- **Graceful Degradation:** If Bluetooth disconnects mid-brew, the application must immediately fall back to the manual timer progress without crashing or aborting the brew.

## Review Focus

1. **Negative Weights:** Scales report negative weights if tared with an item removed. Protocol parser must handle signed Int32 correctly.
2. **Packet Fragmentation:** BLE notifications can occasionally arrive fragmented; packet parser must validate header `0xA55A`, payload length, and CRC-16 before parsing.
3. **High-Frequency State Updates:** Scale streams at 10Hz (100ms). The curve recording must be throttled (e.g. 500ms or 1s intervals) to prevent excessive memory usage while maintaining a smooth 60fps weight display.
4. **Android Permissions:** Android requires Bluetooth Scan/Connect permissions at runtime; the adapter must handle permission denial gracefully without freezing.
5. **Mode Isolation:** Switching between Manual and Smart Scale modes must not leave zombie BLE subscriptions running in the background.

---

### Task 1: Protocol Encoder & Decoder (`timemoreProtocol.ts`)

**Files:**
- Create: `src/features/scale/protocol/timemoreProtocol.ts`
- Test: `src/features/scale/protocol/timemoreProtocol.test.ts`

- [ ] **Step 1.1**: Write failing unit tests for CRC-16/IBM, frame encoding (Tare, Timer, Battery), and packet decoding (Opcode `0x01` weight/flow stream, Opcode `0x05` battery).
- [ ] **Step 1.2**: Run test to verify failure: `npx vitest run src/features/scale/protocol/timemoreProtocol.test.ts` (or node runner).
- [ ] **Step 1.3**: Implement CRC-16/IBM polynomial `0x8005`, initial value `0xFFFF`.
- [ ] **Step 1.4**: Implement `parseTimemorePacket(dataView: DataView)` parsing weight (Int32 / 10), flow rate (Int16 / 10), timer (UInt16), and overload (UInt8).
- [ ] **Step 1.5**: Implement command builders: `buildTareCommand()`, `buildTimerCommand(action)`, `buildBatteryQueryCommand()`.
- [ ] **Step 1.6**: Run tests and confirm all pass.
- [ ] **Step 1.7**: Commit: `git commit -m "feat(scale): implement Timemore Dot BLE binary protocol parser and encoder"`

---

### Task 2: BLE Adapter & State Store (`useScaleStore.ts`)

**Files:**
- Create: `src/features/scale/infrastructure/bleAdapter.ts`
- Create: `src/features/scale/state/useScaleStore.ts`

- [ ] **Step 2.1**: Define `IBleScaleAdapter` interface (`isAvailable`, `requestPermissions`, `startScan`, `stopScan`, `connect`, `disconnect`, `send`).
- [ ] **Step 2.2**: Implement `WebBluetoothAdapter` targeting Service `0xFFF0`, Notify `0xFFF1`, and Write `0xFFF2`.
- [ ] **Step 2.3**: Implement `CapacitorBleAdapter` fallback skeleton bridging to native BLE.
- [ ] **Step 2.4**: Implement Zustand store `useScaleStore` tracking `connectionState`, `device`, `currentWeight`, `flowRate`, `batteryPercent`, `isOverload`, `curveData`, `tare()`, and `recordCurvePoint(second)`.
- [ ] **Step 2.5**: Wire incoming notify packets to `useScaleStore` through `parseTimemorePacket`.
- [ ] **Step 2.6**: Commit: `git commit -m "feat(scale): implement BLE adapter layer and useScaleStore"`

---

### Task 3: Dual Curve Chart Component (`BrewCurveChart.tsx`)

**Files:**
- Create: `src/components/BrewCurveChart.tsx`

- [ ] **Step 3.1**: Build a pure SVG line chart component accepting `points: Array<{ time: number; weight: number; flowRate: number }>`, `currentTime?: number`, and `targetWeight?: number`.
- [ ] **Step 3.2**: Render dual Y-axes: Left (Water in grams, blue curve `#3b82f6`) and Right (Flow rate in g/s, green curve `#10b981`).
- [ ] **Step 3.3**: Add toggle chips `[ Water ]` and `[ Flow ]` to show/hide lines.
- [ ] **Step 3.4**: Add animated vertical time cursor during active brewing.
- [ ] **Step 3.5**: Verify layout and responsiveness on mobile viewports.
- [ ] **Step 3.6**: Commit: `git commit -m "feat(scale): create BrewCurveChart SVG component"`

---

### Task 4: Scale Pairing Modal & Connect Pill

**Files:**
- Create: `src/components/ScaleConnectPill.tsx`
- Create: `src/components/ScalePairingModal.tsx`

- [ ] **Step 4.1**: Build `ScaleConnectPill` supporting disconnected (`Connect Scale`), connecting (`Connecting...`), and connected (`Timemore Dot • 85% 🔋`) states.
- [ ] **Step 4.2**: Build `ScalePairingModal` with scan animation, discovered devices list filtered for Timemore scales, and connect action.
- [ ] **Step 4.3**: Add quick control sheet for connected state (Tare button, battery meter, Disconnect button).
- [ ] **Step 4.4**: Commit: `git commit -m "feat(scale): add ScaleConnectPill and ScalePairingModal components"`

---

### Task 5: Preparation Page Integration (`RecipePreparationPage.tsx`)

**Files:**
- Modify: `src/pages/RecipePreparationPage.tsx`
- Modify: `src/state/useBrewStore.ts`

- [ ] **Step 5.1**: Add `brewMode: 'manual' | 'smart-scale'` to `useBrewStore`.
- [ ] **Step 5.2**: Add Brew Mode Selector (Segmented Cards) above checklist:
  - "Manual Timer (As-Is)" vs "Smart Scale (Timemore Dot)".
- [ ] **Step 5.3**: Render Scale Readiness Card when Smart Scale is selected:
  - Disconnected: Dripper icon + "No scale detected" + "Connect Now" button.
  - Connected: "Timemore Dot • 100% 🔋", live weight (`0.0g`), and `[ Tare ]` button.
- [ ] **Step 5.4**: Pass selected `brewMode` when navigating to `startBrew()`.
- [ ] **Step 5.5**: Commit: `git commit -m "feat(brew): add Brew Mode selector and scale readiness card to preparation page"`

---

### Task 6: Brew Flow Dual-Mode & Smart Scale Experience (`BrewFlowPage.tsx`)

**Files:**
- Modify: `src/pages/BrewFlowPage.tsx`

- [ ] **Step 6.1**: Check `brewMode`: if `'manual'`, render 100% as-is without any modifications to existing logic.
- [ ] **Step 6.2**: If `brewMode === 'smart-scale'`:
  - Add `ScaleConnectPill` in `BrewHeader`.
  - Replace theoretical water calculation with `scaleStore.currentWeight`.
  - Add Live Flow Rate badge (e.g. `🌊 3.2 g/s`).
  - Add Live Dynamic Ratio Slider (`Ratio 1:X` vs `Target 1:Y`).
  - Add `[ ⟲ Tare ]` button right beside weight display.
  - Render collapsible `BrewCurveChart` under active phase.
- [ ] **Step 6.3**: Implement Smart Auto-Sync: automatically fire `scaleStore.tare()` when brew starts.
- [ ] **Step 6.4**: Implement graceful disconnection listener: if scale disconnects mid-brew, toast notification and fall back to manual timer progress seamlessly.
- [ ] **Step 6.5**: On brew complete (`isCompleted`), render final `BrewCurveChart` in result view and record curve data in brew log.
- [ ] **Step 6.6**: Commit: `git commit -m "feat(brew): integrate Smart Scale live experience into BrewFlowPage"`

---

### Task 7: Build & End-to-End Verification

- [ ] **Step 7.1**: Run `npm run build` to verify TypeScript compile and bundling.
- [ ] **Step 7.2**: Verify Manual Mode behaves exactly as before.
- [ ] **Step 7.3**: Test Smart Scale Mode with simulated and live BLE connection.
- [ ] **Step 7.4**: Final commit and summary documentation.

