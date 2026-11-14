import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useBrewStore } from '../state/useBrewStore';
import { Modal } from '../components/Modal';
import { brewService, settingsService } from '../core/services';
import { sendNotification } from '../shared/utils/notify';
import { useWakeLock } from '../shared/hooks/useWakeLock';
import { useBackHandler, useSafeBack } from '../shared/utils/backNavigation';
import {
    formatDuration,
    formatMethodName,
    getStepDuration,
    getCurrentTargetWeight,
    getPreviousTargetWeight,
    getTotalTargetWeight,
    calculateCoffeeDose,
    getValveStates,
    getBrewArchetype,
    formatStepActionTitle,
    type UnitSystem,
} from '../shared/utils/brewMath';
import { useScaleStore } from '../features/scale/state/useScaleStore';

const CIRCLE_CIRCUMFERENCE = 653.5;

export const BrewFlowPage = () => {
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const {
        activeRecipe,
        engineState,
        brewMode,
        stopBrew,
        pauseBrew,
        resumeBrew,
        skipStep,
        hydrateBrew,
        selectedBeanId,
        selectedFilterId,
        coffeeConsumed,
    } = useBrewStore();

    const {
        connectionState,
        currentWeight,
        flowRate,
        curveData,
        tare,
        recordCurvePoint,
        isMock,
        connectMock,
        setMockWeight,
    } = useScaleStore();

    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    const [feedbackEnabled, setFeedbackEnabled] = useState(true);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

    const hasHydratedRef = useRef(false);
    const hasAutoTaredRef = useRef(false);
    const stopTarget = useRef<'back' | 'home'>('home');
    const hasAutoLoggedRef = useRef(false);
    const targetReachedInStepRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastBeepRef = useRef<{ stepIndex: number; second: number } | null>(null);

    const isSmartScale = brewMode === 'smart-scale';
    const isScaleActive = isSmartScale && (connectionState === 'connected' || (!Capacitor.isNativePlatform() && isMock));

    // In web preview or non-native, auto-activate mock scale for smart scale mode
    useEffect(() => {
        if (!Capacitor.isNativePlatform() && isSmartScale && connectionState !== 'connected') {
            connectMock();
        }
    }, [isSmartScale, connectionState, connectMock]);

    const openStopConfirm = (target: 'back' | 'home') => {
        stopTarget.current = target;
        setIsStopModalOpen(true);
    };

    useBackHandler(!isStopModalOpen, () => openStopConfirm('back'));

    useEffect(() => {
        settingsService.getAppUnit().then(setUnitSystem);
        settingsService.getTimerFeedbackEnabled()
            .then(setFeedbackEnabled)
            .catch(() => setFeedbackEnabled(true));
    }, []);

    // Audio context helper
    const getAudioContext = useCallback(() => {
        try {
            const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
            const AudioContextCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
            if (!AudioContextCtor) return null;
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new AudioContextCtor();
            }
            if (audioContextRef.current.state === 'suspended') {
                void audioContextRef.current.resume();
            }
            return audioContextRef.current;
        } catch {
            return null;
        }
    }, []);

    const playAudioTone = useCallback((ctx: AudioContext, freq: number, start: number, dur: number, gainVal: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(gainVal, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
    }, []);

    const playFeedback = useCallback((tones: { freq: number; start: number; dur: number; gain: number }[], vibrate?: number | number[]) => {
        if (!feedbackEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;
        try {
            tones.forEach(t => playAudioTone(ctx, t.freq, t.start, t.dur, t.gain));
            if (vibrate && 'vibrate' in navigator) navigator.vibrate(vibrate);
        } catch {
            // Audio context failed
        }
    }, [feedbackEnabled, getAudioContext, playAudioTone]);

    // Hydration check
    useEffect(() => {
        if (hasHydratedRef.current) return;
        hasHydratedRef.current = true;

        if (!activeRecipe) {
            const restored = hydrateBrew();
            if (!restored) navigate('/brew-methods');
        }
    }, [activeRecipe, hydrateBrew, navigate]);

    // WakeLock keeps display on
    useWakeLock(true);

    // Auto-log completed brew to database
    useEffect(() => {
        if (!engineState?.isCompleted || !activeRecipe || hasAutoLoggedRef.current) return;
        hasAutoLoggedRef.current = true;
        brewService.logBrew(
            activeRecipe.id,
            undefined,
            undefined,
            undefined,
            [],
            selectedBeanId || undefined,
            selectedFilterId || undefined,
            coffeeConsumed || undefined
        ).then((id) => sessionStorage.setItem('coffee_flow_last_logged_id', id)).catch(console.error);
    }, [engineState?.isCompleted, activeRecipe, selectedBeanId, selectedFilterId, coffeeConsumed]);

    // Countdown sounds
    useEffect(() => {
        if (!engineState || !engineState.isRunning || engineState.isCompleted) return;

        const rem = engineState.remainingTime;
        const stepIdx = engineState.currentStepIndex;

        if (lastBeepRef.current?.stepIndex === stepIdx && lastBeepRef.current?.second === rem) {
            return;
        }

        if (rem >= 2 && rem <= 5) {
            lastBeepRef.current = { stepIndex: stepIdx, second: rem };
            playFeedback([{ freq: 659.25 + (5 - rem) * 45, start: 0, dur: 0.1, gain: 0.35 }], 60);
        } else if (rem === 1 || rem === 0) {
            lastBeepRef.current = { stepIndex: stepIdx, second: rem };
            playFeedback([{ freq: 880, start: 0, dur: 0.12, gain: 0.45 }, { freq: 1174.66, start: 0.1, dur: 0.3, gain: 0.5 }], [80, 50, 140]);
        }
    }, [engineState?.remainingTime, engineState?.currentStepIndex, engineState?.isRunning, engineState?.isCompleted, playFeedback]);

    // Completed fanfare & notification
    const recipeName = activeRecipe?.name;
    useEffect(() => {
        if (engineState?.isCompleted) {
            playFeedback([
                { freq: 587.33, start: 0, dur: 0.14, gain: 0.4 },
                { freq: 739.99, start: 0.11, dur: 0.14, gain: 0.42 },
                { freq: 880, start: 0.22, dur: 0.16, gain: 0.45 },
                { freq: 1174.66, start: 0.35, dur: 0.45, gain: 0.5 },
            ], [150, 100, 250]);
            void sendNotification('Brew Complete', `${recipeName ?? 'Brew'} is ready to serve`);
        }
    }, [engineState?.isCompleted, playFeedback, recipeName]);

    // Calculate total elapsed time
    let totalElapsed = 0;
    if (activeRecipe && engineState) {
        for (let i = 0; i < engineState.currentStepIndex; i++) {
            const step = activeRecipe.steps[i];
            if (step) totalElapsed += getStepDuration(step);
        }
        const currentStep = activeRecipe.steps[engineState.currentStepIndex];
        const curDur = currentStep ? getStepDuration(currentStep) : 0;
        totalElapsed += Math.max(0, curDur - engineState.remainingTime);
    }

    const stepTarget = (activeRecipe && engineState)
        ? getCurrentTargetWeight(activeRecipe.steps, engineState.currentStepIndex)
        : 0;

    // Auto-Tare on smart scale start
    useEffect(() => {
        if (!activeRecipe || !engineState) return;
        if (isScaleActive && engineState.isRunning && !hasAutoTaredRef.current) {
            hasAutoTaredRef.current = true;
            tare();
        }
    }, [isScaleActive, engineState, tare, activeRecipe]);

    // Record curve data point
    useEffect(() => {
        if (!activeRecipe || !engineState) return;
        if (engineState.isRunning) {
            recordCurvePoint(totalElapsed);
        }
    }, [engineState, totalElapsed, recordCurvePoint, activeRecipe]);

    // Simulated pouring when running in Demo/Mock mode (e.g. web preview)
    useEffect(() => {
        if (Capacitor.isNativePlatform()) return;
        if (!activeRecipe || !engineState) return;
        if (!isSmartScale || !isMock || !engineState.isRunning) return;

        const currentTarget = getCurrentTargetWeight(activeRecipe.steps, engineState.currentStepIndex);
        const previousTarget = getPreviousTargetWeight(activeRecipe.steps, engineState.currentStepIndex);
        const pourAmount = currentTarget - previousTarget;

        if (pourAmount > 0 && currentTarget > 0) {
            const pourProgress = Math.min(1, engineState.progress * 1.4);
            const simulatedWeight = previousTarget + (pourAmount * pourProgress);
            const isFinishedPouring = pourProgress >= 1;
            const simulatedFlow = isFinishedPouring ? 0 : 3.4;
            setMockWeight(simulatedWeight, simulatedFlow);
        } else {
            setMockWeight(currentTarget > 0 ? currentTarget : previousTarget, 0);
        }
    }, [isSmartScale, isMock, engineState, activeRecipe, setMockWeight]);

    // Audio chime on target reached
    useEffect(() => {
        if (!activeRecipe || !engineState || !isScaleActive) return;
        const currentIdx = engineState.currentStepIndex;

        if (stepTarget > 0 && currentWeight >= (stepTarget - 1.5) && targetReachedInStepRef.current !== currentIdx) {
            targetReachedInStepRef.current = currentIdx;
            playFeedback([
                { freq: 523.25, start: 0, dur: 0.12, gain: 0.35 },
                { freq: 659.25, start: 0.09, dur: 0.14, gain: 0.4 },
                { freq: 783.99, start: 0.18, dur: 0.35, gain: 0.45 },
            ], [100, 50, 150]);
        }
    }, [engineState, currentWeight, isScaleActive, stepTarget, playFeedback, activeRecipe]);

    // Total recipe duration across all steps
    const totalRecipeDuration = useMemo(() => {
        if (!activeRecipe) return 1;
        return activeRecipe.steps.reduce((sum, s) => sum + getStepDuration(s), 0) || 1;
    }, [activeRecipe]);

    const totalWaterRecipe = useMemo(() => {
        if (!activeRecipe) return 0;
        return getTotalTargetWeight(activeRecipe.steps) || activeRecipe.total_water || 0;
    }, [activeRecipe]);

    const maxChartWeight = Math.max(totalWaterRecipe, 1);

    // Target extraction curve polyline
    const targetCurvePoints = useMemo(() => {
        if (!activeRecipe) return '0,105';
        let cum = 0;
        const pts: [number, number][] = [[0, 0]];
        activeRecipe.steps.forEach((s) => {
            cum += getStepDuration(s);
            pts.push([cum, s.target_weight || 0]);
        });
        return pts.map(([time, wt]) => {
            const x = ((time / totalRecipeDuration) * 300).toFixed(1);
            const y = (105 - (wt / maxChartWeight) * 100).toFixed(1);
            return `${x},${y}`;
        }).join(' ');
    }, [activeRecipe, totalRecipeDuration, maxChartWeight]);

    // Actual extraction curve polyline
    const actualCurvePoints = useMemo(() => {
        if (curveData.length === 0) return '0,105';

        return curveData.map((c) => {
            const x = ((c.time / totalRecipeDuration) * 300).toFixed(1);
            const y = (105 - (c.weight / maxChartWeight) * 100).toFixed(1);
            return `${x},${y}`;
        }).join(' ');
    }, [curveData, totalRecipeDuration, maxChartWeight]);

    const confirmStop = () => {
        stopBrew();
        if (stopTarget.current === 'back') {
            safeBack(activeRecipe ? `/recipes/${activeRecipe.id}` : '/recipes');
        } else {
            navigate('/brew-methods');
        }
    };

    if (!activeRecipe || !engineState) return null;

    const currentStep = activeRecipe.steps[engineState.currentStepIndex];
    if (!currentStep) return null;

    const archetype = getBrewArchetype(activeRecipe.method_id);
    const valveStates = getValveStates(activeRecipe.steps);
    const hasAnyValve = valveStates.some(v => v !== null);
    const currentValve = valveStates[engineState.currentStepIndex] ?? null;

    const iceWeight = Math.max(0, Math.round((activeRecipe.total_water || 0) - totalWaterRecipe));
    const previousTarget = getPreviousTargetWeight(activeRecipe.steps, engineState.currentStepIndex);
    const stepAdd = Math.max(0, stepTarget - previousTarget);

    // Dynamic water weight
    const effectiveWaterWeight = isScaleActive
        ? currentWeight
        : (stepAdd > 0 ? previousTarget + stepAdd * engineState.progress : previousTarget);

    const isLastStep = engineState.currentStepIndex >= activeRecipe.steps.length - 1;
    const isCompleted = engineState.isCompleted;

    // Next step preview
    const nextStepIdx = engineState.currentStepIndex + 1;
    const nextStep = activeRecipe.steps[nextStepIdx];
    const nextValve = valveStates[nextStepIdx];

    // Hint for valve transition within 10s
    const valveHint = (engineState.isRunning && nextValve && currentValve && nextValve !== currentValve && engineState.remainingTime <= 10)
        ? `Switch to ${nextValve === 'open' ? 'OPEN' : 'CLOSED'} in ${Math.ceil(engineState.remainingTime)}s`
        : '';

    // Step title and instruction
    const stepTitle = isCompleted
        ? 'Brew finished'
        : formatStepActionTitle(activeRecipe.steps, engineState.currentStepIndex, archetype, unitSystem);

    const rawInstruction = currentStep.instruction || '';
    const stepInstruction = isCompleted
        ? 'Swirl, pour over fresh ice and enjoy.'
        : rawInstruction.replace(/^Target:\s*[\d.]+[a-zA-Z]*\s*on scale\s*[—–-]\s*/i, '').trim();

    // Calculations for the Circular Gauge and Big Center Display
    const leftToPour = Math.max(0, stepTarget - effectiveWaterWeight);
    const isTargetReached = stepAdd > 0 && effectiveWaterWeight >= (stepTarget - 0.5);
    const isTargetNear = stepAdd > 0 && !isTargetReached && leftToPour < 8 && engineState.isRunning;

    let bigVal = '0.0';
    let bigUnit = 'g';
    let capText = 'left to pour';
    let bannerText = '';
    let ringClass = 'bf-ringwrap';
    let progressRatio = 0;

    const currentStepDuration = getStepDuration(currentStep) || 1;
    const currentStepElapsed = Math.max(0, currentStepDuration - engineState.remainingTime);

    if (isCompleted) {
        bigVal = '✓';
        bigUnit = '';
        capText = 'Saved to brew journal';
        ringClass = 'bf-ringwrap hit';
        progressRatio = 1;
    } else if (stepAdd > 0) {
        progressRatio = Math.min(1, Math.max(0, (effectiveWaterWeight - previousTarget) / stepAdd));
        if (engineState.isRunning && (isTargetReached || leftToPour <= 0.2)) {
            ringClass = 'bf-ringwrap hit';
            bigVal = '0.0';
            bigUnit = 'g';
            capText = 'on target';
            if (engineState.remainingTime > 0) {
                bannerText = `Target reached! Resting for ${Math.ceil(engineState.remainingTime)}s`;
            }
        } else if (isTargetNear) {
            ringClass = 'bf-ringwrap near';
            bigVal = leftToPour.toFixed(1);
            bigUnit = 'g';
            capText = 'slow down';
        } else {
            bigVal = leftToPour.toFixed(1);
            bigUnit = 'g';
            capText = 'left to pour';
        }
    } else {
        // No pour addition: bloom rest, steep, drawdown
        progressRatio = engineState.isRunning ? Math.min(1, currentStepElapsed / currentStepDuration) : 0;
        bigVal = `${Math.ceil(engineState.remainingTime)}`;
        bigUnit = 's';
        capText = 'no pouring, just wait';
    }

    const ringDashOffset = CIRCLE_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progressRatio)));

    return (
        <div className="bf-app">
            {/* Top Bar */}
            <div className="bf-top">
                <button
                    onClick={() => openStopConfirm('back')}
                    aria-label="Back"
                    type="button"
                >
                    ←
                </button>
                <div className="min-w-0 flex-1">
                    <small>{formatMethodName(activeRecipe.method_id)}</small>
                    <h1 className="truncate">{activeRecipe.name}</h1>
                </div>
                <div className={`bf-conn ${isScaleActive ? '' : 'off'}`}>
                    <i></i>
                    <span>
                        {isScaleActive
                            ? (isMock ? 'Demo Scale' : 'Scale')
                            : (isSmartScale ? 'Connecting' : 'Timer')}
                    </span>
                </div>
            </div>

            <main className="bf-main">
                {/* Progress Segments */}
                <div className="bf-seg" id="seg">
                    {activeRecipe.steps.map((step, idx) => {
                        const isDone = isCompleted || idx < engineState.currentStepIndex;
                        const isCurrent = !isCompleted && idx === engineState.currentStepIndex;
                        const stepDur = getStepDuration(step) || 1;
                        const stepElapsed = Math.max(0, stepDur - engineState.remainingTime);
                        const fillPercent = isDone
                            ? 100
                            : (isCurrent && engineState.isRunning ? Math.min(100, (stepElapsed / stepDur) * 100) : 0);

                        return (
                            <i key={step.id || idx} className={isDone ? 'done' : ''}>
                                <b style={{ width: `${fillPercent}%` }} />
                            </i>
                        );
                    })}
                </div>

                {/* Hero Card */}
                <div className="bf-card" id="card">
                    <div className="bf-lbl" id="stepLbl">
                        {isCompleted ? 'Complete' : `Step ${engineState.currentStepIndex + 1} of ${activeRecipe.steps.length}`}
                    </div>
                    <div className="bf-title" id="title">{stepTitle}</div>
                    <p className="bf-desc" id="desc">{stepInstruction}</p>

                    {/* Valve indicator for switch / immersion brewers */}
                    {hasAnyValve && (
                        <>
                            <div className="bf-valve" aria-live="polite">
                                <span id="vc" className={currentValve === 'closed' ? 'on' : ''}>Switch Closed</span>
                                <span id="vo" className={currentValve === 'open' ? 'on' : ''}>Switch Open</span>
                            </div>
                            <div className="bf-vhint" id="vhint">{valveHint}</div>
                        </>
                    )}

                    {/* Circular Ring Gauge */}
                    <div className={ringClass} id="ringwrap">
                        <svg viewBox="0 0 236 236">
                            <circle className="tr" cx="118" cy="118" r="104" />
                            <circle
                                className="pg"
                                id="pg"
                                cx="118"
                                cy="118"
                                r="104"
                                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                                strokeDashoffset={ringDashOffset}
                            />
                        </svg>
                        <div className="bf-centre">
                            <div className="bf-big" id="big">
                                {bigVal}
                                {bigUnit && <small>{bigUnit}</small>}
                            </div>
                            <div className="bf-cap" id="cap">{capText}</div>
                        </div>
                    </div>

                    <div className="bf-banner" id="banner">{bannerText}</div>

                    {/* Stats Row */}
                    <div className="bf-stats">
                        <div>
                            <span className="bf-lbl">Weight</span>
                            <b id="wt">{effectiveWaterWeight.toFixed(1)}g</b>
                        </div>
                        <div>
                            <span className="bf-lbl">Flow</span>
                            <b id="fl">{flowRate.toFixed(1)} g/s</b>
                        </div>
                        <div>
                            <span className="bf-lbl">Time</span>
                            <b id="tm">{formatDuration(totalElapsed)}</b>
                        </div>
                    </div>

                    {/* Total Water Progress */}
                    <div className="bf-total">
                        <div className="bf-row">
                            <span>Total water</span>
                            <span id="tot">
                                {Math.round(effectiveWaterWeight)} / {Math.round(totalWaterRecipe)} ml
                            </span>
                        </div>
                        <div className="bar">
                            <b
                                id="totbar"
                                style={{
                                    width: `${Math.min(100, Math.max(0, (effectiveWaterWeight / (totalWaterRecipe || 1)) * 100))}%`,
                                }}
                            />
                        </div>
                        {iceWeight > 0 ? (
                            <div>❄ Ice {iceWeight}g already in the server, pour from 0</div>
                        ) : (
                            <div>
                                {activeRecipe.ratio
                                    ? `Ratio ${activeRecipe.ratio} · ${calculateCoffeeDose(activeRecipe.total_water, activeRecipe.ratio)}g coffee`
                                    : ''}
                            </div>
                        )}
                    </div>
                </div>

                {/* Next Up Card */}
                <div className="bf-next">
                    <div>
                        <span className="bf-lbl">{isCompleted || isLastStep ? 'Status' : 'Next up'}</span>
                        <strong id="nx">
                            {isCompleted
                                ? 'All done'
                                : isLastStep
                                ? 'Finish brew'
                                : formatStepActionTitle(activeRecipe.steps, nextStepIdx, archetype, unitSystem)}
                        </strong>
                    </div>
                    <span className="bf-pill" id="nxp">
                        {isCompleted
                            ? 'Logged'
                            : isLastStep
                            ? 'Last step'
                            : `${nextValve ? `Switch ${nextValve === 'open' ? 'Open' : 'Closed'} · ` : ''}${nextStep?.duration_seconds || 0}s`}
                    </span>
                </div>

                {/* Details Accordion: Live Extraction Curve */}
                <details className="bf-details">
                    <summary>Live extraction curve</summary>
                    <svg className="bf-curve" viewBox="0 0 300 110" role="img" aria-label="Extraction curve">
                        <polyline
                            id="tgt"
                            fill="none"
                            stroke="var(--bf-mute)"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            points={targetCurvePoints}
                        />
                        <polyline
                            id="act"
                            fill="none"
                            stroke="var(--bf-brand)"
                            strokeWidth="2.5"
                            points={actualCurvePoints}
                        />
                    </svg>
                </details>

                {/* Details Accordion: All Steps */}
                <details className="bf-details">
                    <summary>All steps</summary>
                    <ol id="all">
                        {activeRecipe.steps.map((s, k) => {
                            const v = valveStates[k];
                            const isCur = k === engineState.currentStepIndex && !isCompleted;
                            return (
                                <li key={s.id || k} className={isCur ? 'cur' : ''} data-k={k}>
                                    <span>{k + 1}</span>
                                    <span>{formatStepActionTitle(activeRecipe.steps, k, archetype, unitSystem)}</span>
                                    <em>
                                        {v ? `Switch ${v === 'open' ? 'Open' : 'Closed'} · ` : ''}
                                        {s.duration_seconds}s
                                    </em>
                                </li>
                            );
                        })}
                    </ol>
                </details>

                {isMock && !Capacitor.isNativePlatform() && (
                    <p className="demo">Mockup mode: simulated scale running in browser</p>
                )}
            </main>

            {/* Sticky Bottom Actions */}
            <footer className="bf-footer">
                {isCompleted ? (
                    <>
                        <button
                            type="button"
                            className="bf-btn alt"
                            id="stop"
                            onClick={() => {
                                stopBrew();
                                navigate('/home');
                            }}
                        >
                            Home
                        </button>
                        <button
                            type="button"
                            className="bf-btn"
                            id="go"
                            onClick={() => navigate('/brew-log')}
                        >
                            Finish & Log Brew
                        </button>
                    </>
                ) : totalElapsed === 0 && !engineState.isRunning ? (
                    <button
                        type="button"
                        className="bf-btn"
                        id="go"
                        onClick={resumeBrew}
                    >
                        Start Brew
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            className="bf-btn alt"
                            id="stop"
                            onClick={() => openStopConfirm('home')}
                        >
                            Stop
                        </button>
                        <button
                            type="button"
                            className="bf-btn"
                            id="go"
                            onClick={engineState.isRunning ? pauseBrew : resumeBrew}
                        >
                            {engineState.isRunning ? 'Pause' : 'Resume'}
                        </button>
                        <button
                            type="button"
                            className="bf-btn alt"
                            onClick={skipStep}
                        >
                            {isLastStep ? 'Finish' : 'Next'}
                        </button>
                    </>
                )}
            </footer>

            {/* Stop Confirmation Modal */}
            <Modal
                isOpen={isStopModalOpen}
                onClose={() => setIsStopModalOpen(false)}
                onConfirm={confirmStop}
                title="Stop Brewing?"
                message="Are you sure you want to stop this brew session? All progress will be lost."
                confirmText="Stop Brew"
                cancelText="Keep Brewing"
                type="warning"
            />
        </div>
    );
};
