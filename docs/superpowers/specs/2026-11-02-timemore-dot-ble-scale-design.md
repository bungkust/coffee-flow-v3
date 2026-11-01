# Specification: Timemore Dot BLE Smart Scale Integration

**Status:** Approved / Validated  
**Date:** 2026-11-02  
**Target:** Timemore Black Mirror Scale family (DOT TES017)  
**Protocol Reference:** [Timemore Open Scale Protocol v1.0.3](https://raw.githubusercontent.com/TIMEMORE-COFFEE/open-scale-protocol/main/Timemore%20Black%20Mirror%20SCALE%20BLE%20Protocol.md)

---

## 1. Background & User Intent

The user owns a **Timemore Dot (TES017)** Bluetooth smart coffee scale and wants to integrate it with the `coffee-flow-v3` application specifically for the brewing workflow.

The user explicitly requires **two distinct modes**:
1. **Manual Timer Mode (As-Is)**: 100% identical to the existing app flow — theoretical target weight estimation calculated from timer progress, no scale UI or BLE overhead.
2. **Smart Scale Mode (Timemore BLE)**: Live weight streaming (0.1g resolution), real-time flow rate (`g/s`), live dynamic ratio tracker, dual curve chart (water & flow rate), dedicated Tare button, auto-zero on brew start, and responsive target progress driven by actual poured water.

---

## 2. Reverse-Engineered Timemore BLE Protocol Specifications

### 2.1 Transport & GATT Services
- **Transport**: Bluetooth Low Energy (BLE) GATT UART pass-through.
- **Service UUID**: `0xFFF0` (Custom Scale Service).
  - Also advertises standard `0x180A` (Device Information: Model `TES017`, Mfr `TIMEMORE`).
- **Characteristics**:
  - **Uplink (Notify)**: `0xFFF1` — Scale streams data to app (100ms interval).
  - **Downlink (Write without response)**: `0xFFF2` — App sends commands to scale.

### 2.2 Binary Frame Format
Every frame has the structure:
```
[Header: 2B (0xA55A)] [Opcode: 1B] [Cmd: 1B] [Length: 2B (BE)] [Payload: n B] [CRC16: 2B (BE)]
```
- **Header**: Fixed `0xA55A`.
- **Opcodes**:
  - `0x01`: Notify (Scale $\rightarrow$ App)
  - `0x02`: Read (App $\rightarrow$ Scale query, Scale $\rightarrow$ App response)
  - `0x03`: Write (App $\rightarrow$ Scale command, Scale $\rightarrow$ App ack)
- **CRC-16/IBM**: Polynomial `0x8005`, initial value `0xFFFF`. Covers all preceding bytes (Header, Opcode, Cmd, Length, Payload).
- **Endianness**: Big-endian (MSB first) for all multi-byte fields.

### 2.3 Commands & Payloads
1. **Weight, Flow Rate, Timer Stream (`Cmd 0x01`, Opcode `0x01`)**:
   - Pushed every 100ms.
   - Payload Length: `0x0009` (9 bytes).
   - `Weight`: 4 bytes Int32 (Signed). Multiplied by 10 (resolution 0.1g). e.g., `245` = `24.5g`.
   - `Flow rate`: 2 bytes Int16. Unit: 100 mg/s (0.1 g/s). e.g., `32` = `3.2 g/s`.
   - `Timer`: 2 bytes UInt16 (0–3599 seconds).
   - `Overload`: 1 byte UInt8 (`1` = overloaded, `0` = normal).
2. **Tare (`Cmd 0x0D`, Opcode `0x03`)**:
   - Payload Length: `0x0000`. Sets scale to zero.
3. **Battery Info (`Cmd 0x05`)**:
   - `Bars`: 1 byte UInt8 (battery bar segment count).
   - `Percentage`: 1 byte UInt8 (0–100%).
4. **Timer Control (`Cmd 0x02`, Opcode `0x03`)**:
   - Data `0x01` (Start), `0x02` (Pause), `0x03` (Reset).

---

## 3. Architecture & System Design

```
+-------------------------------------------------------------------------+
|                               UI Layer                                  |
|  - RecipePreparationPage (Mode Switcher + Scale Readiness Card)         |
|  - BrewFlowPage:                                                        |
|      * Mode A: Manual (100% As-Is)                                      |
|      * Mode B: Smart Scale (Live Weight, Flow Badge, Ratio, Dual Chart) |
|  - BrewCurveChart (SVG dual line chart for Live & Brew Log)             |
|  - ScalePairingModal & ScaleConnectPill                                 |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           State Management                              |
|  - useScaleStore (Zustand: weight, flow, battery, chartPoints, tare)   |
|  - useBrewStore (brewMode: 'manual' | 'smart-scale')                    |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                     BLE Adapter Layer (Abstraction)                     |
|  - IBleScaleAdapter                                                     |
|     ├── CapacitorBleAdapter (Android Native APK)                        |
|     └── WebBluetoothAdapter (Chrome / Dev Preview)                      |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      Timemore Protocol Parser                           |
|  - CRC-16 Calculator                                                    |
|  - Frame Serializer (Tare, Timer, Battery commands)                     |
|  - Packet Deserializer (0x01 stream, 0x05 battery)                      |
+-------------------------------------------------------------------------+
```

### 3.1 Module Breakdown

1. **`src/features/scale/protocol/timemoreProtocol.ts`**:
   - Pure TypeScript functions for CRC-16 computation, packet decoding, and command frame generation.
   - 100% decoupled from browser or hardware APIs for easy unit testing.
2. **`src/features/scale/infrastructure/bleAdapter.ts`**:
   - Common interface `IBleScaleAdapter` with auto-selection between Capacitor BLE (native Android) and Web Bluetooth (desktop/browser dev).
3. **`src/features/scale/state/useScaleStore.ts`**:
   - Reactive Zustand store tracking:
     - `connectionState`: `'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error'`
     - `device`: `{ id: string, name: string } | null`
     - `currentWeight`: `number` (grams)
     - `flowRate`: `number` (g/s)
     - `batteryPercent`: `number` (0–100%)
     - `isOverload`: `boolean`
     - `curveData`: `Array<{ time: number; weight: number; flowRate: number }>`
     - `tare()`: sends command `0x0D`
     - `recordCurvePoint(time)`: throttled point recorder for dual curve graph
4. **`src/components/BrewCurveChart.tsx`**:
   - Clean, lightweight SVG-based dual-line chart:
     - Water Weight curve (Left Y axis in grams, Primary/Blue line)
     - Flow Rate curve (Right Y axis in g/s, Secondary/Green line)
     - Live vertical time indicator during active brew
     - Reusable in `BrewLogPage` / `JournalDetailPage` for post-brew analysis.

---

## 4. Screen-by-Screen User Experience

### 4.1 Preparation Page (`RecipePreparationPage.tsx`)
A new section **Brew Mode Selection**:
- **Segmented / Card Switcher**:
  1. **Manual Timer (As-Is)**:
     - Subtitle: "Standard timer with theoretical pour estimation"
  2. **Smart Scale (Timemore Dot)**:
     - Subtitle: "Real-time weight & flow rate via Bluetooth"
- When **Smart Scale** is selected:
  - **State A (Disconnected)**: Shows dripper illustration + "No scale detected. Ensure your Timemore is on and nearby." + [ Connect Now ] button.
  - **State B (Connected)**: Shows `TIMEMORE_Dot • 100% 🔋`, live weight (`0.0 g`), and a dedicated **[ Tare ]** button so the user can zero out the rinsed server and grounds before clicking "Start Brew".

### 4.2 Brew Flow Page (`BrewFlowPage.tsx`)

#### Mode 1: Manual Timer (`brewMode === 'manual'`)
- **100% Unchanged (As-Is)**: Existing flow, timer-based theoretical progress and weights. No scale pills or Tare controls.

#### Mode 2: Smart Scale (`brewMode === 'smart-scale'`)
- **Header**:
  - `ScaleConnectPill`: `[ ⚖️ Timemore Dot • 85% 🔋 ]` with quick modal for Tare, battery info, and disconnect.
- **Active Card**:
  - **Big Live Weight**: e.g., `34.1 g` (0.1g resolution).
  - **Live Flow Rate Badge**: e.g., `🌊 3.2 g/s`.
  - **Dynamic Ratio Tracker**:
    - Current ratio calculated against recipe coffee dose: e.g. `Ratio 1:2.3` ... [slider] ... `Target 1:16.0`.
  - **Live Dual Curve Chart (Collapsible / Preview)**:
    - Displays the live water curve and flow rate curve updating in real time.
  - **Dedicated Tare Button**:
    - High-contrast `[ ⟲ Tare ]` button right on the card for quick re-zeroing.
- **Done State (`Brewing Result`)**:
  - Displays the completed **Dual Curve Chart** alongside final brew stats (Time, Dose, Total Water, Ratio, Flow Rate).
  - Saves the curve series JSON to `brew_logs.flow_profile` in SQLite.

---

## 5. Verification & Testing Strategy
1. **Unit Tests (`timemoreProtocol.test.ts`)**:
   - Verify CRC-16 calculation with known packet test vectors.
   - Verify parsing of 0x01 streaming packet (signed weights, flow rate, timer, overload).
   - Verify command byte builders (`tare`, `timer`, `battery`).
2. **Component & Interactive Testing**:
   - Test mode switching in `RecipePreparationPage`.
   - Test manual mode is completely untouched.
   - Test mock scale data stream to verify real-time chart, ratio slider, and weight updates.
   - Test Tare command firing.
   - Test graceful fallback if scale disconnects mid-brew.
