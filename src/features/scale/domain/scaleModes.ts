/**
 * Scale Brew Modes & Automated Logic (inspired by Timemore Black Mirror)
 */

export type ScaleBrewMode = 'manual' | 'pour-over' | 'espresso';

export interface EspressoState {
    phase: 'idle' | 'cup_detected' | 'ready_to_extract' | 'extracting' | 'finished';
    stableWeightSince: number | null;
    lastWeight: number;
    cupWeight: number | null;
    noFlowSince: number | null;
    peakWeight: number;
}

export function initEspressoState(): EspressoState {
    return {
        phase: 'idle',
        stableWeightSince: null,
        lastWeight: 0,
        cupWeight: null,
        noFlowSince: null,
        peakWeight: 0,
    };
}

export interface PourOverState {
    phase: 'idle' | 'armed' | 'brewing' | 'paused';
    baselineWeight: number;
    lastWeight: number;
    peakWeight: number;
    consecutiveIncreaseCount: number;
}

export function initPourOverState(currentWeight = 0): PourOverState {
    const isNearZero = Math.abs(currentWeight) <= 0.3;
    return {
        phase: isNearZero ? 'armed' : 'idle',
        baselineWeight: isNearZero ? 0 : currentWeight,
        lastWeight: currentWeight,
        peakWeight: Math.max(0, currentWeight),
        consecutiveIncreaseCount: 0,
    };
}

export interface PourOverUpdateInput {
    weight: number;
    flowRate: number;
    timerSeconds: number;
    isTimerRunning: boolean;
}

export interface PourOverActionResult {
    nextState: PourOverState;
    triggerStartTimer: boolean;
    triggerPauseTimer: boolean;
}

/**
 * State machine for Timemore Pour-Over Auto-Timer Mode (Ⓐ):
 * 1. idle -> scale has un-tared weight (> 0.3g) -> waits for user to tare or settle at 0.0g.
 * 2. armed -> scale tared at baseline -> waits for positive weight delta (>= 0.5g) with flow/active increase.
 * 3. brewing -> water pouring -> timer running.
 * 4. paused -> dripper/brewer lifted (>80% weight drop) -> auto-pauses timer.
 */
export function updatePourOverState(
    current: PourOverState,
    input: PourOverUpdateInput
): PourOverActionResult {
    const { weight, flowRate, timerSeconds, isTimerRunning } = input;
    const next: PourOverState = { ...current };
    let triggerStartTimer = false;
    let triggerPauseTimer = false;

    // Track peak weight during brew
    if (weight > next.peakWeight) {
        next.peakWeight = weight;
    }

    switch (next.phase) {
        case 'idle': {
            // Once scale is tared or near zero, arm it!
            if (Math.abs(weight) <= 0.3) {
                next.phase = 'armed';
                next.baselineWeight = 0;
                next.lastWeight = weight;
                next.consecutiveIncreaseCount = 0;
            }
            break;
        }

        case 'armed': {
            // If weight dropped significantly (e.g. removed server before tare), re-idle
            if (weight < next.baselineWeight - 5.0) {
                next.phase = 'idle';
                next.baselineWeight = weight;
                break;
            }

            const delta = weight - next.baselineWeight;

            // Check if weight is actively increasing (water actively pouring)
            if (weight > next.lastWeight + 0.1) {
                next.consecutiveIncreaseCount += 1;
            } else if (weight <= next.lastWeight) {
                next.consecutiveIncreaseCount = Math.max(0, next.consecutiveIncreaseCount - 1);
            }

            // Trigger pour detection:
            // 1. Delta from armed baseline must be at least 0.5g
            // 2. AND active pour signal: flow rate >= 0.2 OR sustained consecutive weight increase OR delta >= 1.0g
            const hasActiveFlow = flowRate >= 0.2 || next.consecutiveIncreaseCount >= 2 || delta >= 1.0;

            if (delta >= 0.5 && hasActiveFlow && timerSeconds === 0 && !isTimerRunning) {
                next.phase = 'brewing';
                triggerStartTimer = true;
            }
            break;
        }

        case 'brewing': {
            // Auto-pause if brewer/dripper lifted (after timer running for >= 3s and brewed >= 20g)
            if (isTimerRunning && timerSeconds >= 3 && next.peakWeight >= 20) {
                const isLifted = weight <= 2.0 || weight < next.peakWeight * 0.15;
                if (isLifted) {
                    next.phase = 'paused';
                    triggerPauseTimer = true;
                }
            }
            break;
        }

        case 'paused': {
            // Stays paused until reset or tare
            break;
        }
    }

    next.lastWeight = weight;
    return {
        nextState: next,
        triggerStartTimer,
        triggerPauseTimer,
    };
}

/**
 * Pour-Over Auto-Start helper (backward-compatible):
 * Requires armed delta >= 0.5g, timer at 00:00, and not running.
 */
export function shouldAutoStartPourOver(
    weightDelta: number,
    timerSeconds: number,
    isTimerRunning: boolean
): boolean {
    return weightDelta >= 0.5 && timerSeconds === 0 && !isTimerRunning;
}

/**
 * Pour-Over Auto-Pause condition:
 * When timer is running (> 3s), if weight plummets because the dripper/brewer was lifted.
 */
export function shouldAutoPausePourOver(
    currentWeight: number,
    peakWeight: number,
    timerSeconds: number,
    isTimerRunning: boolean
): boolean {
    if (!isTimerRunning || timerSeconds < 3 || peakWeight < 20) {
        return false;
    }
    // Brewer lifted: weight drops below 2g or loses > 85% of peak brewed weight
    return currentWeight <= 2.0 || currentWeight < peakWeight * 0.15;
}

export interface EspressoUpdateInput {
    weight: number;
    flowRate: number;
    nowMs: number;
    timerSeconds: number;
    isTimerRunning: boolean;
}

export interface EspressoActionResult {
    nextState: EspressoState;
    triggerTare: boolean;
    triggerStartTimer: boolean;
    triggerPauseTimer: boolean;
}

/**
 * State machine for Timemore Espresso Mode:
 * 1. idle -> cup placed (> 10g) -> waits 1.2s stability -> auto-tare -> ready_to_extract
 * 2. ready_to_extract -> first drops arrive (weight >= 0.5g) -> auto-start timer -> extracting
 * 3. extracting -> flow ceases (< 0.2g/s) for 2s while timer > 5s -> auto-pause timer -> finished
 */
export function updateEspressoState(
    current: EspressoState,
    input: EspressoUpdateInput
): EspressoActionResult {
    const { weight, flowRate, nowMs, timerSeconds, isTimerRunning } = input;
    const next: EspressoState = { ...current };
    let triggerTare = false;
    let triggerStartTimer = false;
    let triggerPauseTimer = false;

    // Track peak weight
    if (weight > next.peakWeight) {
        next.peakWeight = weight;
    }

    switch (next.phase) {
        case 'idle': {
            // Cup detected on scale (usually > 10g)
            if (weight >= 10.0) {
                next.phase = 'cup_detected';
                next.stableWeightSince = nowMs;
                next.lastWeight = weight;
            }
            break;
        }

        case 'cup_detected': {
            // If cup removed before taring
            if (weight < 5.0) {
                next.phase = 'idle';
                next.stableWeightSince = null;
                break;
            }

            // Check stability (weight variation <= 0.3g)
            const isStable = Math.abs(weight - next.lastWeight) <= 0.3;
            if (!isStable) {
                next.stableWeightSince = nowMs;
                next.lastWeight = weight;
            } else if (next.stableWeightSince && nowMs - next.stableWeightSince >= 1200) {
                // Cup has been steady for 1.2 seconds -> Auto Tare!
                next.phase = 'ready_to_extract';
                next.cupWeight = weight;
                next.stableWeightSince = null;
                triggerTare = true;
            }
            break;
        }

        case 'ready_to_extract': {
            // After tare, wait for espresso drops (>= 0.5g)
            if (weight >= 0.5 && timerSeconds === 0 && !isTimerRunning) {
                next.phase = 'extracting';
                next.noFlowSince = null;
                triggerStartTimer = true;
            }
            break;
        }

        case 'extracting': {
            // Check for extraction finish: timer > 5s, weight >= 10g, flow rate < 0.2 g/s
            if (timerSeconds >= 5 && weight >= 10.0 && flowRate < 0.2) {
                if (!next.noFlowSince) {
                    next.noFlowSince = nowMs;
                } else if (nowMs - next.noFlowSince >= 1800) {
                    // Flow stopped for ~1.8-2 seconds -> Shot finished!
                    next.phase = 'finished';
                    triggerPauseTimer = true;
                }
            } else {
                next.noFlowSince = null;
            }
            break;
        }

        case 'finished': {
            // Stays finished until user resets or tares
            break;
        }
    }

    return {
        nextState: next,
        triggerTare,
        triggerStartTimer,
        triggerPauseTimer,
    };
}

/**
 * Web Audio API Beep Helper (Safe in Browser, Webview, and Node.js environments)
 */
let audioCtx: AudioContext | null = null;

export function playScaleBeep(frequency = 1046.5, durationMs = 90): void {
    if (typeof window === 'undefined') return;

    try {
        const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new AudioContextClass();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

        // Smooth volume envelope to prevent clicking
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + durationMs / 1000);
    } catch {
        // Silently ignore if audio context is blocked or unavailable
    }
}

