import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    initPourOverState,
    updatePourOverState,
    shouldAutoStartPourOver,
    shouldAutoPausePourOver,
    initEspressoState,
    updateEspressoState,
} from './scaleModes.ts';

test('updatePourOverState does NOT start timer on static weight or without pour', () => {
    // 1. Initialized with un-tared mug (e.g. 180g)
    let state = initPourOverState(180.0);
    assert.equal(state.phase, 'idle');

    // Static weight sitting still -> must NOT start timer!
    const action1 = updatePourOverState(state, {
        weight: 180.0,
        flowRate: 0.0,
        timerSeconds: 0,
        isTimerRunning: false,
    });
    state = action1.nextState;
    assert.equal(action1.triggerStartTimer, false);
    assert.equal(state.phase, 'idle');

    // 2. Scale is tared to 0.0g -> transitions to armed!
    const action2 = updatePourOverState(state, {
        weight: 0.0,
        flowRate: 0.0,
        timerSeconds: 0,
        isTimerRunning: false,
    });
    state = action2.nextState;
    assert.equal(action2.triggerStartTimer, false);
    assert.equal(state.phase, 'armed');

    // 3. Jitter / noise at 0.1g without flow -> must NOT start timer!
    const action3 = updatePourOverState(state, {
        weight: 0.1,
        flowRate: 0.0,
        timerSeconds: 0,
        isTimerRunning: false,
    });
    state = action3.nextState;
    assert.equal(action3.triggerStartTimer, false);
    assert.equal(state.phase, 'armed');

    // 4. Hot water pours! Weight jumps to 1.5g with flowRate = 2.0 g/s
    const action4 = updatePourOverState(state, {
        weight: 1.5,
        flowRate: 2.0,
        timerSeconds: 0,
        isTimerRunning: false,
    });
    state = action4.nextState;
    assert.equal(action4.triggerStartTimer, true);
    assert.equal(state.phase, 'brewing');

    // 5. Brewer lifted off scale (weight drops from 300g to 0.1g)
    state.peakWeight = 300.0;
    const action5 = updatePourOverState(state, {
        weight: 0.1,
        flowRate: 0.0,
        timerSeconds: 45,
        isTimerRunning: true,
    });
    assert.equal(action5.triggerPauseTimer, true);
    assert.equal(action5.nextState.phase, 'paused');
});

test('shouldAutoStartPourOver triggers only when weight delta >= 0.5g and timer is at 00:00 not running', () => {
    assert.equal(shouldAutoStartPourOver(0.2, 0, false), false);
    assert.equal(shouldAutoStartPourOver(0.5, 0, false), true);
    assert.equal(shouldAutoStartPourOver(12.5, 0, false), true);
    // Already running or non-zero timer should not re-trigger auto start
    assert.equal(shouldAutoStartPourOver(15.0, 5, true), false);
    assert.equal(shouldAutoStartPourOver(15.0, 5, false), false);
});

test('shouldAutoPausePourOver triggers when brewer is lifted after significant brewing', () => {
    // Normal brewing with stable or rising weight
    assert.equal(shouldAutoPausePourOver(150, 150, 45, true), false);
    // Brewer lifted (weight drops from 250g to 0.1g)
    assert.equal(shouldAutoPausePourOver(0.1, 250, 45, true), true);
    assert.equal(shouldAutoPausePourOver(-5, 200, 30, true), true);
    // Short timer (< 3s) shouldn't false trigger
    assert.equal(shouldAutoPausePourOver(0.1, 5, 2, true), false);
});

test('updateEspressoState manages cup auto-tare, extraction start, and extraction finish', () => {
    let state = initEspressoState();
    assert.equal(state.phase, 'idle');

    // 1. Placing empty cup (e.g. 110g) at t=1000ms
    const action1 = updateEspressoState(state, {
        weight: 110.0,
        flowRate: 0,
        nowMs: 1000,
        timerSeconds: 0,
        isTimerRunning: false,
    });
    state = action1.nextState;
    assert.equal(action1.triggerTare, false);
    assert.equal(state.phase, 'cup_detected');

    // 2. Cup remains stable at t=2300ms (> 1200ms of stability)
    const action2 = updateEspressoState(state, {
        weight: 110.0,
        flowRate: 0,
        nowMs: 2300,
        timerSeconds: 0,
        isTimerRunning: false,
    });
    state = action2.nextState;
    assert.equal(action2.triggerTare, true); // Auto-tare triggered!
    assert.equal(state.phase, 'ready_to_extract');

    // 3. First espresso drops hit the cup (weight increases by >= 0.5g)
    const action3 = updateEspressoState(state, {
        weight: 1.2,
        flowRate: 1.5,
        nowMs: 5000,
        timerSeconds: 0,
        isTimerRunning: false,
    });
    state = action3.nextState;
    assert.equal(action3.triggerStartTimer, true); // Auto-start timer!
    assert.equal(state.phase, 'extracting');

    // 4. Extraction ends (flow rate drops to 0 while timer > 5s and weight > 10g)
    // t=30000ms, flow rate 0
    state = updateEspressoState(state, {
        weight: 36.0,
        flowRate: 0.0,
        nowMs: 30000,
        timerSeconds: 25,
        isTimerRunning: true,
    }).nextState;

    // after 2000ms of no flow (t=32100ms)
    const action4 = updateEspressoState(state, {
        weight: 36.2,
        flowRate: 0.0,
        nowMs: 32100,
        timerSeconds: 27,
        isTimerRunning: true,
    });
    assert.equal(action4.triggerPauseTimer, true); // Auto-pause timer when shot finishes!
    assert.equal(action4.nextState.phase, 'finished');
});
