/**
 * Timemore Black Mirror BLE Protocol Encoder & Decoder
 * Supporting: Timemore DOT (TES017) and Black Mirror series.
 * Specification: Open Scale Protocol v1.0.3
 */

export const TIMEMORE_HEADER = 0xA55A;

// Opcodes
export const OPCODE_NOTIFY = 0x01;
export const OPCODE_READ = 0x02;
export const OPCODE_WRITE = 0x03;

// Commands
export const CMD_WEIGHT_FLOW_STREAM = 0x01;
export const CMD_TIMER = 0x02;
export const CMD_BATTERY = 0x05;
export const CMD_WEIGHT_UNIT = 0x06;
export const CMD_POWER_OFF = 0x0B;
export const CMD_DEVICE_NAME = 0x0C;
export const CMD_TARE = 0x0D;
export const CMD_FIRMWARE_VERSION = 0x10;

export interface WeightStreamData {
    type: 'weight_stream';
    weight: number; // in grams (0.1g precision)
    flowRate: number; // in g/s (0.1 g/s precision)
    timer: number; // in seconds
    isOverload: boolean;
}

export interface BatteryData {
    type: 'battery';
    bars: number;
    percentage: number;
}

export interface AckData {
    type: 'ack';
    cmd: number;
    success: boolean;
}

export type TimemorePacket = WeightStreamData | BatteryData | AckData;

/**
 * Calculates CRC-16/IBM (Polynomial 0x8005, Init 0xFFFF)
 * Reflected / MODBUS variant
 */
export function calculateCrc16(bytes: Uint8Array): number {
    let crc = 0xFFFF;
    for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i];
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x0001) !== 0) {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc = crc >> 1;
            }
        }
    }
    return crc & 0xFFFF;
}

/**
 * Build a binary frame ready for BLE downlink write
 */
export function buildFrame(opcode: number, cmd: number, payload: Uint8Array = new Uint8Array(0)): Uint8Array {
    const length = payload.length;
    // Total: Header(2) + Opcode(1) + Cmd(1) + Length(2) + Payload(n) + CRC(2)
    const frameLength = 6 + length + 2;
    const buffer = new Uint8Array(frameLength);
    const view = new DataView(buffer.buffer);

    view.setUint16(0, TIMEMORE_HEADER, false); // Big-Endian
    view.setUint8(2, opcode);
    view.setUint8(3, cmd);
    view.setUint16(4, length, false); // Big-Endian

    if (length > 0) {
        buffer.set(payload, 6);
    }

    // CRC covers everything before CRC field (first 6 + length bytes)
    const crc = calculateCrc16(buffer.subarray(0, 6 + length));
    view.setUint16(6 + length, crc, false); // Big-Endian

    return buffer;
}

/**
 * Build Tare Command (0x0D)
 */
export function buildTareCommand(): Uint8Array {
    return buildFrame(OPCODE_WRITE, CMD_TARE);
}

/**
 * Build Timer Command (0x02)
 */
export function buildTimerCommand(action: 'start' | 'pause' | 'reset'): Uint8Array {
    const actionByte = action === 'start' ? 0x01 : action === 'pause' ? 0x02 : 0x03;
    return buildFrame(OPCODE_WRITE, CMD_TIMER, new Uint8Array([actionByte]));
}

/**
 * Build Battery Query Command (0x05)
 */
export function buildBatteryQueryCommand(): Uint8Array {
    return buildFrame(OPCODE_READ, CMD_BATTERY);
}

/**
 * Parse a raw BLE incoming packet
 */
export function parseTimemorePacket(view: DataView): TimemorePacket | null {
    if (view.byteLength < 8) return null;

    // Check Header 0xA55A
    const header = view.getUint16(0, false);
    if (header !== TIMEMORE_HEADER) return null;

    const opcode = view.getUint8(2);
    const cmd = view.getUint8(3);
    const length = view.getUint16(4, false);

    // Validate overall length: header(2) + op(1) + cmd(1) + len(2) + payload(length) + crc(2)
    const expectedTotal = 6 + length + 2;
    if (view.byteLength < expectedTotal) return null;

    // Decode payloads based on cmd
    if (cmd === CMD_WEIGHT_FLOW_STREAM) {
        if (length < 9) return null;
        // Weight: 4-byte Int32 BE (divide by 10 for grams)
        const rawWeight = view.getInt32(6, false);
        const weight = Math.round(rawWeight) / 10;

        // Flow rate: 2-byte Int16 BE (unit 100 mg/s = 0.1 g/s)
        const rawFlow = view.getInt16(10, false);
        const flowRate = Math.round(rawFlow) / 10;

        // Timer: 2-byte UInt16 BE (seconds)
        const timer = view.getUint16(12, false);

        // Overload flag: 1-byte UInt8
        const overloadByte = view.getUint8(14);
        const isOverload = overloadByte === 1;

        return {
            type: 'weight_stream',
            weight,
            flowRate,
            timer,
            isOverload
        };
    }

    if (cmd === CMD_BATTERY) {
        if (length < 2) return null;
        const bars = view.getUint8(6);
        const percentage = view.getUint8(7);
        return {
            type: 'battery',
            bars,
            percentage
        };
    }

    if (opcode === OPCODE_WRITE && length >= 1) {
        const success = view.getUint8(6) === 0x01;
        return {
            type: 'ack',
            cmd,
            success
        };
    }

    return null;
}

