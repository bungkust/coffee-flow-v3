import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
    calculateCrc16,
    buildTareCommand,
    parseTimemorePacket,
} from '../features/scale/protocol/timemoreProtocol.ts';
import {
    initPourOverState,
    updatePourOverState,
    initEspressoState,
    updateEspressoState,
} from '../features/scale/domain/scaleModes.ts';
import {
    parseRatio,
    calculateCoffeeDose,
    formatDuration,
    formatWeight,
    formatVolume,
    getCurrentTargetWeight,
    getPreviousTargetWeight,
    getStepDuration,
} from '../shared/utils/brewMath.ts';
import {
    formatBeanTags,
    buildBlendTags,
    parseBeanTags,
    parseQuantity,
} from '../features/pantry/domain/beanOptions.ts';

// Helper benchmark runner
function benchmark(name: string, iterations: number, fn: (i: number) => void): { opsPerSec: number; totalMs: number; avgUs: number } {
    // Warmup
    for (let i = 0; i < Math.min(1000, iterations / 10); i++) {
        fn(i);
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn(i);
    }
    const end = performance.now();
    const totalMs = end - start;
    const opsPerSec = Math.round((iterations / (totalMs / 1000)));
    const avgUs = (totalMs * 1000) / iterations;

    console.log(`  ⚡ [${name}]: ${iterations.toLocaleString()} ops in ${totalMs.toFixed(2)}ms | ${(opsPerSec).toLocaleString()} ops/sec | ${avgUs.toFixed(3)} μs/op`);
    return { opsPerSec, totalMs, avgUs };
}

test('PERFORMANCE: BLE Protocol & Packet Processing', () => {
    // 1. CRC-16 Benchmark
    const sampleData = new Uint8Array([0xA5, 0x5A, 0x03, 0x0D, 0x00, 0x00]);
    const crcResult = benchmark('CRC-16 Calculation', 100_000, () => {
        calculateCrc16(sampleData);
    });
    // Target: at least 500k ops/sec
    assert.ok(crcResult.opsPerSec > 500_000, 'CRC-16 must exceed 500k ops/sec');

    // 2. buildTareCommand Benchmark
    const tareResult = benchmark('Tare Command Generation', 50_000, () => {
        buildTareCommand();
    });
    assert.ok(tareResult.opsPerSec > 100_000, 'Tare command generation must exceed 100k ops/sec');

    // 3. parseTimemorePacket Benchmark (50k streaming weight packets)
    const rawBuffer = new ArrayBuffer(17);
    const view = new DataView(rawBuffer);
    view.setUint16(0, 0xA55A);
    view.setUint8(2, 0x02);
    view.setUint8(3, 0x01); // CMD_WEIGHT_FLOW_STREAM
    view.setUint16(4, 9);
    view.setInt32(6, 1250); // 125.0g
    view.setInt16(10, 32);  // 3.2 g/s
    view.setUint16(12, 45); // 45 seconds
    view.setUint8(14, 0);   // not overload
    view.setUint16(15, 0x1234);

    const parseResult = benchmark('Timemore Packet Parsing', 100_000, () => {
        parseTimemorePacket(view);
    });
    // Target: at least 1,000,000 ops/sec (instantaneous parsing in memory)
    assert.ok(parseResult.opsPerSec > 500_000, 'Packet parsing must exceed 500k ops/sec');
});

test('PERFORMANCE: Scale Brew State Machines (High frequency 10Hz-20Hz streaming)', () => {
    // Simulate Pour-Over State Machine transitions
    let state = initPourOverState(0);
    const pourOverResult = benchmark('Pour-Over Mode Update', 50_000, (i) => {
        const weight = 0.5 + (i % 250);
        const flowRate = i % 2 === 0 ? 3.0 : 0.5;
        const result = updatePourOverState(state, {
            weight,
            flowRate,
            timerSeconds: i,
            isTimerRunning: true,
        });
        state = result.nextState;
    });
    // 50,000 updates = 5,000 seconds (83 minutes) of continuous live streaming
    assert.ok(pourOverResult.totalMs < 100, '50k state machine steps must run in <100ms');

    // Simulate Espresso State Machine transitions
    let espState = initEspressoState();
    const espressoResult = benchmark('Espresso Mode Update', 50_000, (i) => {
        const weight = i < 500 ? 120 : 120 + (i % 36);
        const flowRate = i < 500 ? 0 : 2.0;
        const result = updateEspressoState(espState, {
            weight,
            flowRate,
            now: i * 100,
        });
        espState = result.nextState;
    });
    assert.ok(espressoResult.totalMs < 100, '50k espresso state steps must run in <100ms');
});

test('PERFORMANCE: Brew Calculations, Ratio, & Scaling', () => {
    // 1. parseRatio and calculateCoffeeDose
    const calcResult = benchmark('calculateCoffeeDose & parseRatio', 100_000, (i) => {
        const water = 150 + (i % 500);
        const ratio = i % 2 === 0 ? '1:15' : '1:16.7';
        calculateCoffeeDose(water, ratio);
    });
    assert.ok(calcResult.opsPerSec > 200_000, 'Dose calculation must exceed 200k ops/sec');

    // 2. formatDuration & formatWeight
    const fmtResult = benchmark('formatDuration & formatWeight', 100_000, (i) => {
        formatDuration(i % 3600);
        formatWeight(i % 1000, 'metric');
        formatVolume(i % 1000, 'metric');
    });
    assert.ok(fmtResult.opsPerSec > 100_000, 'Formatting functions must exceed 100k ops/sec');

    // 3. Step duration and target weights
    const mockSteps = [
        { id: '1', recipe_id: 'r1', step_order: 1, label: 'Bloom', duration_seconds: 45, target_weight: 50, created_at: '', updated_at: '' },
        { id: '2', recipe_id: 'r1', step_order: 2, label: 'Pour 1', duration_seconds: 30, target_weight: 150, created_at: '', updated_at: '' },
        { id: '3', recipe_id: 'r1', step_order: 3, label: 'Pour 2', duration_seconds: 45, target_weight: 250, created_at: '', updated_at: '' },
    ];

    const stepResult = benchmark('Step Target & Duration Traversal', 100_000, (i) => {
        const stepIdx = i % 3;
        getCurrentTargetWeight(mockSteps, stepIdx);
        getPreviousTargetWeight(mockSteps, stepIdx);
        getStepDuration(mockSteps[stepIdx]);
    });
    assert.ok(stepResult.opsPerSec > 500_000, 'Step traversal must exceed 500k ops/sec');
});

test('PERFORMANCE: SVG Polyline & Coordinate Interpolation', () => {
    // Simulate generating polyline coordinates for 180 curve points (3-minute pour)
    const curveData = Array.from({ length: 180 }, (_, i) => ({
        time: i,
        weight: (i / 180) * 250,
        flowRate: 2.5,
    }));
    const totalDuration = 180;
    const maxWeight = 250;

    const polylineResult = benchmark('SVG Polyline (180 data points)', 5_000, () => {
        curveData.map((c) => {
            const x = ((c.time / totalDuration) * 300).toFixed(1);
            const y = (105 - (c.weight / maxWeight) * 100).toFixed(1);
            return `${x},${y}`;
        }).join(' ');
    });
    // 5,000 full curve redraws (900,000 points mapped & joined)
    assert.ok(polylineResult.opsPerSec > 5_000, '180-point polyline string generation must exceed 5,000 redraws/sec');
});

test('PERFORMANCE: Bean Metadata & Tag Processing', () => {
    const rawTags = [
        'species:Arabica',
        'origin:Temanggung, Central Java',
        'variety:Kartika',
        'process:Anaerobic Natural',
        'roast:medium',
        'sweet:High',
        'acid:Bright',
        'Floral',
        'Jasmine',
    ];

    const beanResult = benchmark('Bean Tags & Blend Processing', 50_000, (i) => {
        formatBeanTags({
            species: 'Arabica',
            origin: 'Temanggung, Central Java',
            variety: 'Kartika',
            process: 'Anaerobic Natural',
            roastLevel: 'medium',
            sweet: 'High',
            acid: 'Bright',
            body: 'Medium',
            bitter: 'Low',
        });
        buildBlendTags([
            { type: 'Arabica', origin: 'Temanggung', percentage: '70', variety: 'Typica', process: 'Natural' },
            { type: 'Robusta', origin: 'Temanggung', percentage: '30', variety: 'BP', process: 'Washed' },
        ]);
        parseBeanTags(rawTags);
        parseQuantity('250.5g');
    });
    assert.ok(beanResult.opsPerSec > 20_000, 'Tag processing must exceed 20k ops/sec');
});
