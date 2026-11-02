import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateCrc16,
    parseTimemorePacket,
    buildTareCommand,
    buildBatteryQueryCommand,
    TIMEMORE_HEADER,
} from './timemoreProtocol.ts';

test('CRC-16 calculation produces consistent 16-bit integer', () => {
    const data = new Uint8Array([0xA5, 0x5A, 0x03, 0x0D, 0x00, 0x00]);
    const crc = calculateCrc16(data);
    assert.equal(typeof crc, 'number');
    assert.ok(crc >= 0 && crc <= 0xFFFF);
});

test('buildTareCommand generates valid 0xA55A frame with Cmd 0x0D and 0 payload length', () => {
    const frame = buildTareCommand();
    assert.equal(frame.length, 8); // Header(2) + Op(1) + Cmd(1) + Len(2) + CRC(2)
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
    assert.equal(view.getUint16(0, false), TIMEMORE_HEADER);
    assert.equal(view.getUint8(2), 0x03); // Write Opcode
    assert.equal(view.getUint8(3), 0x0D); // Tare Cmd
    assert.equal(view.getUint16(4, false), 0x0000); // 0 payload length
});

test('buildBatteryQueryCommand generates valid query frame', () => {
    const frame = buildBatteryQueryCommand();
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
    assert.equal(view.getUint8(2), 0x02); // Read Opcode
    assert.equal(view.getUint8(3), 0x05); // Battery Cmd
    assert.equal(view.getUint16(4, false), 0x0000); // 0 length
});

test('parseTimemorePacket correctly decodes weight, flow rate, timer from streaming packet 0x01', () => {
    // Construct packet:
    // Header: 0xA55A (2B)
    // Opcode: 0x01 (1B)
    // Cmd: 0x01 (1B)
    // Length: 0x0009 (2B)
    // Weight: 341 (34.1g) -> 4 bytes Int32 BE
    // Flow rate: 32 (3.2 g/s) -> 2 bytes Int16 BE
    // Timer: 14 (14 sec) -> 2 bytes UInt16 BE
    // Overload: 0 -> 1 byte UInt8
    // CRC: 2 bytes
    const buf = new Uint8Array(17);
    const view = new DataView(buf.buffer);
    view.setUint16(0, TIMEMORE_HEADER, false);
    view.setUint8(2, 0x01); // Notify
    view.setUint8(3, 0x01); // Weight/Flow stream
    view.setUint16(4, 9, false); // Length 9
    view.setInt32(6, 341, false); // Weight = 34.1g
    view.setInt16(10, 32, false); // Flow = 3.2 g/s
    view.setUint16(12, 14, false); // Timer = 14s
    view.setUint8(14, 0); // Overload = 0
    const crc = calculateCrc16(buf.subarray(0, 15));
    view.setUint16(15, crc, false);

    const result = parseTimemorePacket(view);
    assert.ok(result);
    assert.equal(result?.type, 'weight_stream');
    if (result?.type === 'weight_stream') {
        assert.equal(result.weight, 34.1);
        assert.equal(result.flowRate, 3.2);
        assert.equal(result.timer, 14);
        assert.equal(result.isOverload, false);
    }
});

test('parseTimemorePacket handles negative weight', () => {
    const buf = new Uint8Array(17);
    const view = new DataView(buf.buffer);
    view.setUint16(0, TIMEMORE_HEADER, false);
    view.setUint8(2, 0x01);
    view.setUint8(3, 0x01);
    view.setUint16(4, 9, false);
    view.setInt32(6, -55, false); // -5.5g
    view.setInt16(10, 0, false);
    view.setUint16(12, 0, false);
    view.setUint8(14, 0);
    const crc = calculateCrc16(buf.subarray(0, 15));
    view.setUint16(15, crc, false);

    const result = parseTimemorePacket(view);
    assert.ok(result);
    if (result?.type === 'weight_stream') {
        assert.equal(result.weight, -5.5);
    }
});

test('parseTimemorePacket decodes battery notification Cmd 0x05', () => {
    const buf = new Uint8Array(10);
    const view = new DataView(buf.buffer);
    view.setUint16(0, TIMEMORE_HEADER, false);
    view.setUint8(2, 0x01); // Notify
    view.setUint8(3, 0x05); // Battery Cmd
    view.setUint16(4, 2, false); // Length 2
    view.setUint8(6, 4); // 4 bars
    view.setUint8(7, 85); // 85%
    const crc = calculateCrc16(buf.subarray(0, 8));
    view.setUint16(8, crc, false);

    const result = parseTimemorePacket(view);
    assert.ok(result);
    assert.equal(result?.type, 'battery');
    if (result?.type === 'battery') {
        assert.equal(result.bars, 4);
        assert.equal(result.percentage, 85);
    }
});

test('parseTimemorePacket returns null for invalid header or truncated packet', () => {
    const invalidBuf = new Uint8Array([0x12, 0x34, 0x01]);
    const view = new DataView(invalidBuf.buffer);
    assert.equal(parseTimemorePacket(view), null);
});

