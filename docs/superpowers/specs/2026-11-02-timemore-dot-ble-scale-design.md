# Specification: Timemore Dot BLE Smart Scale Integration

**Status:** Draft / Proposed  
**Date:** 2026-11-02  
**Target:** Timemore Black Mirror Scale family (DOT TES017)  
**Protocol Reference:** [Timemore Open Scale Protocol v1.0.3](https://raw.githubusercontent.com/TIMEMORE-COFFEE/open-scale-protocol/main/Timemore%20Black%20Mirror%20SCALE%20BLE%20Protocol.md)

---

## 1. Background & User Intent

The user owns a **Timemore Dot (TES017)** Bluetooth smart coffee scale and wants to integrate it with the `coffee-flow-v3` application specifically for the brewing workflow.

The user explicitly requires **two distinct modes**:
1. **Manual Timer Mode (As-Is)**: 100% identical to the existing app flow — theoretical target weight estimation calculated from timer progress, no scale UI or BLE overhead.
2. **Smart Scale Mode (Timemore BLE)**: Live weight streaming (0.1g resolution), real-time flow rate (`g/s`), quick Tare button, auto-zero on brew start, and responsive target progress driven by actual poured water.

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
+-----------------------------------------------------------+
|                      UI Layer                             |
|  - RecipePreparationPage (Mode Selector: Manual vs Scale) |
|  - BrewFlowPage (Dual Render: As-Is vs Live Scale Mode)   |
|  - ScaleConnectPill & ScalePairingModal                   |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|                   State Management                        |
|  - useScaleStore (Zustand: weight, flow, battery, status) |
|  - useBrewStore (activeMode: 'manual' | 'smart-scale')   |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|             BLE Adapter Layer (Abstraction)               |
|  - IBleScaleAdapter                                       |
|     ├── CapacitorBleAdapter (Android Native APK)          |
|     └── WebBluetoothAdapter (Chrome / Dev Preview)        |
+-----------------------------------------------------------+
                             |
                             v
+-----------------------------------------------------------+
|              Timemore Protocol Parser                     |
|  - CRC-16 Calculator                                      |
|  - Frame Serializer (Tare, Timer, Battery commands)       |
|  - Packet Deserializer (0x01 stream, 0x05 battery)        |
+-----------------------------------------------------------+
```

### 3.1 Module Breakdown

1. **`src/features/scale/protocol/timemoreProtocol.ts`**:
   - Pure TypeScript functions for CRC-16 computation, packet decoding, and command frame generation.
   - 100% decoupled from browser or hardware APIs for easy unit testing.
2. **`src/features/scale/infrastructure/bleAdapter.ts`**:
   - Common interface `IBleScaleAdapter`:
     ```ts
     export interface BleDevice {
       id: string;
       name: string;
       rssi?: number;
     }
     export interface IBleScaleAdapter {
       isAvailable(): Promise<boolean>;
       requestPermissions(): Promise<boolean>;
       startScan(onDiscovered: (device: BleDevice) => void): Promise<void>;
       stopScan(): Promise<void>;
       connect(deviceId: string, onData: (data: DataView) => void, onDisconnect: () => void): Promise<void>;
       disconnect(): Promise<void>;
       send(data: Uint8Array): Promise<void>;
     }
     ```
   - Automatically selects `CapacitorBleAdapter` when running under Capacitor (`@capacitor/core` `Capacitor.isNativePlatform()`), otherwise falls back to `WebBluetoothAdapter`.
3. **`src/features/scale/state/useScaleStore.ts`**:
   - Zustand store tracking:
     - `connectionState`: `'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error'`
     - `device`: `{ id: string, name: string } | null`
     - `currentWeight`: `number` (grams)
     - `flowRate`: `number` (g/s)
     - `batteryPercent`: `number` (0–100%)
     - `isOverload`: `boolean`
     - `tare()`: sends command `0x0D`
     - `connect()`, `disconnect()`, `scan()`

---

## 4. User Experience & Screen-by-Screen Flow

### 4.1 Preparation Page (`RecipePreparationPage.tsx`)
A new segmented control / card is added: **Brew Mode Selection**:
- **Option 1: Manual Timer (As-Is)**
  - Subtitle: "Standard timer with theoretical pour estimation"
  - Behaves exactly as current code.
- **Option 2: Smart Scale (Timemore Dot)**
  - Subtitle: "Real-time weight & flow rate via Bluetooth"
  - Shows scale connection pill:
    - If disconnected: Button `Connect Scale` (opens `ScalePairingModal`).
    - If connected: Green badge `Connected: Timemore Dot (85% 🔋)`.

### 4.2 Brew Flow Page (`BrewFlowPage.tsx`)

#### Case A: If `brewMode === 'manual'`
- **100% As-Is**.
- No scale indicators, no Tare buttons, no BLE calls.
- Total Water and step targets display theoretical calculated amounts based on timer progress.

#### Case B: If `brewMode === 'smart-scale'`
- **Header**: Displays `ScaleConnectPill`:
  - When connected: `[ ⚖️ Timemore Dot • 85% 🔋 ]`. Clicking opens a quick sheet (Battery, Signal, Tare, Disconnect).
- **Active Phase Card**:
  - **Live Weight**: Large typography displaying real-time scale reading with 1 decimal place (e.g. `124.8 g` / `Target: 150.0 g`).
  - **Flow Rate Badge**: Prominently displayed (e.g. `🌊 3.2 g/s`). Color coded:
    - Green for smooth pour (~2.5–4.5 g/s).
    - Amber/Muted when resting or outside optimal range.
  - **Quick Tare Button**: One-tap `[ ⟲ Tare ]` button right beside weight.
  - **Live Progress Gauge**: Bar fills up proportional to actual grams poured against step/recipe targets.
- **Smart Auto-Sync**:
  - When user presses "Start" or "Resume", the app sends a Tare (`0x0D`) command to the scale so it zeros automatically for the first pour.

### 4.3 Error Handling & Fallback
- If BLE connection drops mid-brew:
  - App displays a toast alert: *"Scale disconnected. Switched to manual timer mode."*
  - Seamlessly falls back to theoretical timer-based water estimation without aborting the brew.
  - User can tap `Reconnect` to re-establish BLE stream.

---

## 5. Verification Plan
1. **Unit Tests (`timemoreProtocol.test.ts`)**:
   - Verify CRC-16 computation with known test vectors from protocol specification.
   - Verify packet parsing for Opcode `0x01` (positive weights, negative weights, zero, decimal conversion).
   - Verify frame generation for Tare (`0x0D`), Timer (`0x02`), Battery (`0x05`).
2. **Component & Integration Testing**:
   - Verify `RecipePreparationPage` toggle switches between Manual and Smart Scale modes.
   - Verify `BrewFlowPage` renders existing As-Is view in Manual mode.
   - Verify `BrewFlowPage` renders Live Weight, Flow Rate, and Tare in Smart Scale mode.
   - Verify simulated BLE data updates the UI reactively at 100ms intervals.
