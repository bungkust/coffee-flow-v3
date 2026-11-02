import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Icon } from '../components/Icons';
import { useBrewStore } from '../state/useBrewStore';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { brewService, settingsService } from '../core/services';
import { sendNotification } from '../shared/utils/notify';
import { useWakeLock } from '../shared/hooks/useWakeLock';
import type { Recipe } from '../shared/domain/entities';
import { useBackHandler, useSafeBack } from '../shared/utils/backNavigation';
import { formatDuration, formatWeight, formatVolume, formatStepSeconds, formatMethodName, getStepDuration, getCurrentTargetWeight, getPreviousTargetWeight, getPourAmount, getTotalTargetWeight, getWaterProgressPercent, getStepIntervalInfo, getValveStates, type UnitSystem } from '../shared/utils/brewMath';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { BrewCurveChart } from '../components/BrewCurveChart';

const BrewHeader = ({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) => (
    <header className="shrink-0 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
        <div className="flex items-center gap-3">
            <button
                onClick={onBack}
                className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer shrink-0"
                aria-label="Go back"
            >
                <Icon name="arrow_back" className="text-2xl" />
            </button>
            <div className="flex flex-col min-w-0 flex-1">
                <span className="typescale-label-small font-bold text-md-on-surface-variant/70 uppercase tracking-wider">{formatMethodName(recipe.method_id)}</span>
                <h1 className="typescale-headline-small font-bold text-md-on-surface line-clamp-1">{recipe.name}</h1>
            </div>
        </div>
    </header>
);

export const BrewFlowPage = () => {
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const { activeRecipe, engineState, brewMode, stopBrew, pauseBrew, resumeBrew, hydrateBrew, selectedBeanId, selectedFilterId, coffeeConsumed } = useBrewStore();
    const { connectionState, currentWeight, flowRate, curveData, tare, recordCurvePoint, isMock, connectMock, setMockWeight } = useScaleStore();

    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    const [feedbackEnabled, setFeedbackEnabled] = useState(true);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
    const [showLiveChart, setShowLiveChart] = useState(false);
    const hasHydratedRef = useRef(false);
    const hasAutoTaredRef = useRef(false);
    const stopTarget = useRef<'back' | 'home'>('home');
    const hasAutoLoggedRef = useRef(false);
    const targetReachedInStepRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastBeepRef = useRef<{ stepIndex: number; second: number } | null>(null);

    const isSmartScale = brewMode === 'smart-scale';
    const isScaleActive = isSmartScale && (connectionState === 'connected' || (!Capacitor.isNativePlatform() && isMock));

    // In web or disconnected preview, auto-activate demo scale only when NOT on native mobile APK
    useEffect(() => {
        if (!Capacitor.isNativePlatform() && isSmartScale && connectionState !== 'connected') {
            connectMock();
        }
    }, [isSmartScale, connectionState, connectMock]);

    const openStopConfirm = (target: 'back' | 'home') => {
        stopTarget.current = target;
        setIsStopModalOpen(true);
    };

    // Intercept hardware / web back button to prompt stop confirmation
    useBackHandler(!isStopModalOpen, () => openStopConfirm('back'));

    useEffect(() => {
        settingsService.getAppUnit().then(setUnitSystem);
    }, []);

    // Helper to get or resume audio context
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

    // Helper to play shaped audio tone
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

    // 1. Loud crisp preparatory pip for 5s countdown (5, 4, 3, 2 seconds)
    const playCountdownPip = useCallback((second: number) => {
        if (!feedbackEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;
        try {
            const freq = 659.25 + (5 - second) * 45; // E5 ascending toward ~800Hz
            playAudioTone(ctx, freq, 0, 0.1, 0.35);
            if ('vibrate' in navigator) navigator.vibrate(60);
        } catch (error) {
            console.warn('Countdown pip failed', error);
        }
    }, [feedbackEnabled, getAudioContext, playAudioTone]);

    // 2. High double chime for step transition (1s / 0s moving to next step)
    const playStepTransitionChime = useCallback(() => {
        if (!feedbackEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;
        try {
            playAudioTone(ctx, 880, 0, 0.12, 0.45);      // A5
            playAudioTone(ctx, 1174.66, 0.1, 0.3, 0.5); // D6
            if ('vibrate' in navigator) navigator.vibrate([80, 50, 140]);
        } catch (error) {
            console.warn('Transition chime failed', error);
        }
    }, [feedbackEnabled, getAudioContext, playAudioTone]);

    // 3. Ascending chord chime when scale target weight is reached
    const playTargetReachedChime = useCallback(() => {
        if (!feedbackEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;
        try {
            playAudioTone(ctx, 523.25, 0, 0.12, 0.35);   // C5
            playAudioTone(ctx, 659.25, 0.09, 0.14, 0.4);  // E5
            playAudioTone(ctx, 783.99, 0.18, 0.35, 0.45); // G5
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 150]);
        } catch {
            // Audio context failed
        }
    }, [feedbackEnabled, getAudioContext, playAudioTone]);

    // 4. Brew completed celebratory fanfare
    const playBrewCompleteChime = useCallback(() => {
        if (!feedbackEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;
        try {
            playAudioTone(ctx, 587.33, 0, 0.14, 0.4);     // D5
            playAudioTone(ctx, 739.99, 0.11, 0.14, 0.42); // F#5
            playAudioTone(ctx, 880, 0.22, 0.16, 0.45);    // A5
            playAudioTone(ctx, 1174.66, 0.35, 0.45, 0.5); // D6
            if ('vibrate' in navigator) navigator.vibrate([150, 100, 250]);
        } catch {
            // Audio context failed
        }
    }, [feedbackEnabled, getAudioContext, playAudioTone]);

    useEffect(() => {
        if (hasHydratedRef.current) return;
        hasHydratedRef.current = true;

        if (!activeRecipe) {
            const restored = hydrateBrew();
            if (!restored) navigate('/brew-methods');
        }
    }, [activeRecipe, hydrateBrew, navigate]);

    useEffect(() => {
        settingsService.getTimerFeedbackEnabled()
            .then(setFeedbackEnabled)
            .catch(() => setFeedbackEnabled(true));
    }, []);

    // Keep the screen awake for the whole brew flow (running, paused or done)
    useWakeLock(true);

    // Persist the brew as soon as it finishes, so leaving via "Back to Homepage" still journals it.
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

    const recipeName = activeRecipe?.name;

    // 5-second countdown beeps before next step, and transition chime
    useEffect(() => {
        if (!engineState || !engineState.isRunning || engineState.isCompleted) return;

        const rem = engineState.remainingTime;
        const stepIdx = engineState.currentStepIndex;

        // Prevent duplicate pips on sub-second re-renders
        if (lastBeepRef.current?.stepIndex === stepIdx && lastBeepRef.current?.second === rem) {
            return;
        }

        if (rem >= 2 && rem <= 5) {
            lastBeepRef.current = { stepIndex: stepIdx, second: rem };
            playCountdownPip(rem);
        } else if (rem === 1) {
            lastBeepRef.current = { stepIndex: stepIdx, second: rem };
            playStepTransitionChime();
        } else if (rem === 0) {
            lastBeepRef.current = { stepIndex: stepIdx, second: rem };
            playStepTransitionChime();
        }
    }, [engineState?.remainingTime, engineState?.currentStepIndex, engineState?.isRunning, engineState?.isCompleted, playCountdownPip, playStepTransitionChime]);

    // Brew completed sound and notification
    useEffect(() => {
        if (engineState?.isCompleted) {
            playBrewCompleteChime();
            void sendNotification('Brew Complete', `${recipeName ?? 'Brew'} is ready to serve`);
        }
    }, [engineState?.isCompleted, playBrewCompleteChime, recipeName]);

    let totalElapsed = 0;
    let currentStepEnd = 0;
    if (activeRecipe && engineState) {
        for (let i = 0; i <= engineState.currentStepIndex; i++) {
            const step = activeRecipe.steps[i];
            if (step) {
                currentStepEnd += getStepDuration(step);
                if (i < engineState.currentStepIndex) totalElapsed += step.duration_seconds;
            }
        }
        totalElapsed += (engineState.totalTime - engineState.remainingTime);
    }

    const stepTarget = (activeRecipe && engineState)
        ? getCurrentTargetWeight(activeRecipe.steps, engineState.currentStepIndex)
        : 0;

    // Auto-Tare scale once when smart scale brew starts running
    useEffect(() => {
        if (!activeRecipe || !engineState) return;
        if (isScaleActive && engineState.isRunning && !hasAutoTaredRef.current) {
            hasAutoTaredRef.current = true;
            tare();
        }
    }, [isScaleActive, engineState, tare, activeRecipe]);

    // Record curve points periodically while running in smart scale mode
    useEffect(() => {
        if (!activeRecipe || !engineState) return;
        if (isSmartScale && engineState.isRunning) {
            recordCurvePoint(totalElapsed);
        }
    }, [isSmartScale, engineState, totalElapsed, recordCurvePoint, activeRecipe]);

    // Simulated pouring when running in Demo/Mock mode (e.g. web preview only)
    useEffect(() => {
        if (Capacitor.isNativePlatform()) return;
        if (!activeRecipe || !engineState) return;
        if (!isSmartScale || !isMock || !engineState.isRunning) return;

        const currentTarget = getCurrentTargetWeight(activeRecipe.steps, engineState.currentStepIndex);
        const previousTarget = getPreviousTargetWeight(activeRecipe.steps, engineState.currentStepIndex);
        const pourAmount = currentTarget - previousTarget;

        if (pourAmount > 0 && currentTarget > 0) {
            const pourProgress = Math.min(1, engineState.progress * 1.5);
            const simulatedWeight = previousTarget + (pourAmount * pourProgress);
            const isFinishedPouring = pourProgress >= 1;
            const simulatedFlow = isFinishedPouring ? 0 : 3.4;
            setMockWeight(simulatedWeight, simulatedFlow);
        } else {
            setMockWeight(currentTarget > 0 ? currentTarget : previousTarget, 0);
        }
    }, [isSmartScale, isMock, engineState, activeRecipe, setMockWeight]);

    // Audio chime when step target weight is reached
    useEffect(() => {
        if (!activeRecipe || !engineState || !isScaleActive) return;
        const currentIdx = engineState.currentStepIndex;

        if (stepTarget > 0 && currentWeight >= (stepTarget - 2) && targetReachedInStepRef.current !== currentIdx) {
            targetReachedInStepRef.current = currentIdx;
            playTargetReachedChime();
        }
    }, [engineState, currentWeight, isScaleActive, stepTarget, playTargetReachedChime, activeRecipe]);

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

    const valveStates = getValveStates(activeRecipe.steps);
    const currentValve = valveStates[engineState.currentStepIndex] ?? null;

    // The scale reads only the water poured (any ice already sits in the server), so the gauge
    // tracks the final pour target rather than the recipe total, which may include the ice.
    const totalWaterRecipe = getTotalTargetWeight(activeRecipe.steps) || activeRecipe.total_water || 0;
    const iceWeight = Math.max(0, Math.round((activeRecipe.total_water || 0) - totalWaterRecipe));
    const pouredBefore = getPreviousTargetWeight(activeRecipe.steps, engineState.currentStepIndex);
    const currentTargetWeight = Math.round(pouredBefore + (stepTarget - pouredBefore) * engineState.progress);
    const pourAmount = getPourAmount(activeRecipe.steps, engineState.currentStepIndex);
    const progressPercent = getWaterProgressPercent(currentTargetWeight, totalWaterRecipe);

    // Smart scale dynamic values
    const effectiveWaterWeight = isScaleActive ? currentWeight : currentTargetWeight;
    const effectiveProgressPercent = isScaleActive
        ? Math.min(100, Math.max(0, (currentWeight / (totalWaterRecipe || 1)) * 100))
        : progressPercent;

    // Timer countdown proximity (5s before next step)
    const isTimerNear = engineState.isRunning && engineState.remainingTime > 0 && engineState.remainingTime <= 5;
    const isTimerEnded = engineState.isRunning && engineState.remainingTime === 0;

    const timerColorClass = isTimerNear
        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent animate-pulse'
        : isTimerEnded
        ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent'
        : 'text-md-on-surface';

    // Proximity to current step target for color states and audio chime
    const isTargetReached = stepTarget > 0 && currentWeight >= (stepTarget - 2);
    const isTargetNear = stepTarget > 0 && !isTargetReached && currentWeight >= (stepTarget - 8);
    const isRestingPhase = isTargetReached && engineState.remainingTime > 3;

    const waterColorClass = isTargetReached
        ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent scale-[1.04]'
        : isTargetNear
        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent animate-pulse scale-[1.02]'
        : 'text-md-primary';

    const stepTitle = currentStep.target_weight && pourAmount > 0
        ? `Pour +${formatWeight(pourAmount, unitSystem)}`
        : currentStep.label;
    const rawInstruction = currentStep.instruction || '';
    const stepInstruction = rawInstruction.replace(/^Target:\s*[\d.]+[a-zA-Z]*\s*on scale\s*[—–-]\s*/i, '').trim();
    const intervalInfo = getStepIntervalInfo(currentStep);

    if (engineState.isCompleted) {
        return (
            <div className="flex flex-col h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
                {/* Header for Done state */}
                <BrewHeader recipe={activeRecipe} onBack={() => openStopConfirm('back')} />

                <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto scrollbar-hide">
                    {/* Done Card */}
                    <div className="shrink-0 flex flex-col justify-center items-center mb-6 relative">
                        <div className="w-full bg-md-surface-container-low rounded-3xl p-6 border border-md-outline-variant/30 shadow-md-2 flex flex-col items-center justify-center text-center relative overflow-hidden space-y-3">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-md-primary"></div>

                            <div className="size-20 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center mb-2 shadow-inner">
                                <Icon name="emoji_events" className="text-4xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                            </div>

                            <h2 className="typescale-headline-large font-extrabold text-md-on-surface">Done!</h2>
                            <h3 className="typescale-title-large font-bold text-md-on-surface">Enjoy your coffee</h3>
                            <p className="typescale-body-medium text-md-on-surface-variant max-w-[240px]">
                                Great job! Your brew is complete and ready to serve.
                            </p>

                            {/* Final Water Progress */}
                            <div className="w-full pt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="typescale-label-medium font-bold text-md-on-surface-variant">Total Water</span>
                                    <span className="typescale-title-medium font-bold text-md-primary tabular-nums">
                                        {formatVolume(isScaleActive ? currentWeight : totalWaterRecipe, unitSystem)} <span className="typescale-body-small text-md-on-surface-variant/70 font-normal">/ {formatVolume(totalWaterRecipe, unitSystem)}</span>
                                    </span>
                                </div>
                                <div className="w-full bg-md-surface-container-high rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-md-primary h-3 rounded-full"
                                        style={{ width: '100%' }}
                                    ></div>
                                </div>
                            </div>

                            {/* Extraction Curve Chart in Done State */}
                            {isSmartScale && curveData.length > 0 && (
                                <div className="w-full pt-3 text-left">
                                    <BrewCurveChart
                                        points={curveData}
                                        maxDurationSeconds={totalElapsed}
                                        targetWater={totalWaterRecipe}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Previous Steps section */}
                    <div className="mb-6">
                        <h3 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider mb-2.5 ml-1">Previous Steps</h3>
                        <div className="flex items-center gap-4 p-4 rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low shadow-md-1">
                            <div className="size-10 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center shrink-0">
                                <Icon name="check" className="text-xl font-bold" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="typescale-title-small font-bold text-md-on-surface line-clamp-1">{activeRecipe.steps[activeRecipe.steps.length - 1].label}</h4>
                                <p className="typescale-body-small text-md-on-surface-variant">Completed at {formatDuration(totalElapsed)}</p>
                            </div>
                            <span className="typescale-label-medium font-bold text-md-primary shrink-0">
                                Done
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bottom Controls for Done State */}
                <div className="sticky bottom-0 left-0 right-0 p-5 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 z-20 flex flex-col gap-3">
                    <Button
                        variant="filled"
                        size="lg"
                        onClick={() => navigate('/brew-log')}
                        className="w-full"
                    >
                        <Icon name="assignment" style={{ fontVariationSettings: "'FILL' 1" }} />
                        <span>Finish & Log Brew</span>
                    </Button>
                    <button
                        onClick={() => {
                            stopBrew();
                            navigate('/home');
                        }}
                        className="w-full py-2.5 text-md-on-surface-variant font-bold hover:text-md-on-surface transition-colors cursor-pointer typescale-label-large"
                    >
                        Back to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Header */}
            <BrewHeader recipe={activeRecipe} onBack={() => openStopConfirm('back')} />

            <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto scrollbar-hide">
                {/* Active Phase Card */}
                <div className="shrink-0 flex flex-col justify-center items-center mb-6 relative">
                    <div className="w-full bg-md-surface-container-low rounded-3xl p-6 border border-md-outline-variant/30 shadow-md-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-md-primary"></div>
                        <div className="mb-2 flex items-center gap-2 flex-wrap justify-center">
                            {currentValve && (
                                <span className={`inline-flex items-center gap-1 px-3.5 py-1 rounded-full typescale-label-medium font-bold border ${currentValve === 'open' ? 'bg-md-primary text-md-on-primary border-md-primary' : 'bg-md-secondary-container text-md-on-secondary-container border-md-outline-variant/20'}`}>
                                    <Icon name={currentValve === 'open' ? 'lock_open' : 'lock'} className="text-sm" />
                                    Switch {currentValve === 'open' ? 'Open' : 'Closed'}
                                </span>
                            )}
                            <span className="inline-flex items-center px-3.5 py-1 rounded-full typescale-label-medium font-bold bg-md-secondary-container text-md-on-secondary-container border border-md-outline-variant/20">
                                Phase {engineState.currentStepIndex + 1} of {activeRecipe.steps.length}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full typescale-label-small font-bold border transition-all ${
                                isTimerNear
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse'
                                    : 'bg-md-surface-container-high text-md-on-surface-variant border-md-outline-variant/30'
                            }`}>
                                <Icon name="schedule" className={`text-xs ${isTimerNear ? 'text-amber-600' : 'text-md-primary'}`} />
                                {isTimerNear ? `${engineState.remainingTime}s to next step` : `Until ${formatDuration(currentStepEnd)}`}
                            </span>
                            {intervalInfo.pourSeconds > 0 && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full typescale-label-small font-bold bg-md-surface-container-high text-md-secondary border border-md-outline-variant/30">
                                    <Icon name="hourglass_empty" className="text-xs" />
                                    Pour ~{intervalInfo.pourSeconds}s{intervalInfo.restSeconds > 0 ? ` • Rest ~${intervalInfo.restSeconds}s` : ''}
                                </span>
                            )}
                        </div>

                        {/* HERO SECTION: Smart Scale vs Manual Timer */}
                        {isSmartScale ? (
                            <div className="w-full py-1 flex flex-col items-center">
                                {/* 1. BIG TIMER */}
                                <div className="flex flex-col items-center mb-1">
                                    <span className={`typescale-label-small font-bold uppercase tracking-widest mb-0.5 transition-colors ${
                                        isTimerNear ? 'text-amber-600 dark:text-amber-400 font-extrabold animate-pulse' : 'text-md-on-surface-variant/70'
                                    }`}>
                                        Time {isTimerNear ? `(${engineState.remainingTime}s)` : ''}
                                    </span>
                                    <div className={`typescale-display-medium text-6xl font-black leading-none tracking-tight tabular-nums font-mono transition-all duration-300 ${timerColorClass}`}>
                                        {formatDuration(totalElapsed)}
                                    </div>
                                </div>

                                {/* 2. BIG WATER WEIGHT */}
                                <div className="flex flex-col items-center my-1.5">
                                    <span className={`typescale-label-small font-bold uppercase tracking-widest mb-0.5 transition-colors ${
                                        isTargetReached
                                            ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                            : isTargetNear
                                            ? 'text-amber-600 dark:text-amber-400 font-extrabold animate-pulse'
                                            : 'text-md-on-surface-variant/70'
                                    }`}>
                                        Water (g) {isTargetReached ? '• Target Reached' : isTargetNear ? '• Almost There' : ''}
                                    </span>
                                    <div className={`typescale-display-large text-7xl font-black leading-none tracking-tight tabular-nums transition-all duration-300 ${waterColorClass}`}>
                                        {effectiveWaterWeight.toFixed(1)}
                                    </div>
                                </div>

                                {/* 3. FLOW RATE PILL (cleanly under water, matching Timemore) */}
                                <div className="my-1">
                                    {isScaleActive ? (
                                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full typescale-label-medium font-bold bg-md-surface-container-high text-md-on-surface border border-md-outline-variant/30 tabular-nums shadow-sm font-mono">
                                            <Icon name="water_drop" className="text-sm text-md-primary" />
                                            <span>{flowRate.toFixed(1)} g/s</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-md-surface-container-high text-md-on-surface-variant border border-md-outline-variant/30">
                                            <Icon name="warning" className="text-xs text-md-primary" />
                                            <span>Scale Disconnected</span>
                                        </span>
                                    )}
                                </div>

                                {/* 4. Resting or Target Instruction */}
                                {isRestingPhase ? (
                                    <div className="w-full flex flex-col items-center gap-1.5 my-2.5">
                                        <div className="w-full py-2.5 px-4 rounded-2xl bg-md-primary-container text-md-on-primary-container border border-md-primary/20 flex items-center justify-center gap-2 animate-fade-in shadow-sm">
                                            <Icon name="local_cafe" className="text-lg text-md-primary animate-pulse" />
                                            <span className="typescale-label-medium font-bold">
                                                Target reached! Resting for {formatStepSeconds(engineState.remainingTime)}
                                            </span>
                                        </div>
                                        {stepInstruction && stepInstruction !== stepTitle && (
                                            <p className="typescale-body-small text-md-on-surface-variant max-w-[320px] text-center leading-relaxed">
                                                {stepInstruction}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full flex flex-col items-center gap-1.5 my-2">
                                        <h2 className="typescale-title-large font-bold text-md-on-surface text-center">
                                            {stepTitle}
                                        </h2>

                                        {/* Badges: Target, Live Remaining Water, Valve */}
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            {typeof currentStep.target_weight === 'number' && currentStep.target_weight > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full typescale-label-small font-bold bg-md-surface-container-high text-md-on-surface border border-md-outline-variant/30 tabular-nums shadow-xs">
                                                    <Icon name="flag" className="text-xs text-md-primary" />
                                                    <span>Target: {formatWeight(currentStep.target_weight, unitSystem)}</span>
                                                </span>
                                            )}
                                            {isScaleActive && stepTarget > 0 && !isTargetReached && (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full typescale-label-small font-bold border tabular-nums shadow-xs transition-all ${
                                                    isTargetNear
                                                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse'
                                                        : 'bg-md-primary-container text-md-on-primary-container border border-md-primary/20'
                                                }`}>
                                                    <Icon name="water_drop" className={`text-xs ${isTargetNear ? 'text-amber-600' : 'text-md-primary'}`} />
                                                    <span>Remaining: {Math.max(0, stepTarget - currentWeight).toFixed(1)}g</span>
                                                </span>
                                            )}
                                            {currentValve && (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full typescale-label-small font-bold shadow-xs ${
                                                    currentValve === 'open'
                                                        ? 'bg-md-primary text-md-on-primary'
                                                        : 'bg-md-secondary-container text-md-on-secondary-container'
                                                }`}>
                                                    <Icon name={currentValve === 'open' ? 'lock_open' : 'lock'} className="text-xs" />
                                                    <span>Switch {currentValve === 'open' ? 'Open' : 'Closed'}</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Instruction text in clear dedicated card */}
                                        {stepInstruction && stepInstruction !== stepTitle && (
                                            <div className="mt-1 px-3.5 py-2 rounded-xl bg-md-surface-container/60 border border-md-outline-variant/15 max-w-[340px] text-center">
                                                <p className="typescale-body-small text-md-on-surface-variant leading-relaxed">
                                                    {stepInstruction}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 5. Water Progress */}
                                <div className="w-full mt-2">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="typescale-label-medium font-bold text-md-on-surface-variant">Total Water</span>
                                        <span className="typescale-title-medium font-bold text-md-primary tabular-nums">
                                            {formatWeight(effectiveWaterWeight, unitSystem)} <span className="typescale-body-small text-md-on-surface-variant/70 font-normal">/ {formatVolume(totalWaterRecipe, unitSystem)}</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-md-surface-container-high rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-md-primary h-3 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${effectiveProgressPercent}%` }}
                                        ></div>
                                    </div>
                                    {iceWeight > 0 && (
                                        <p className="typescale-body-small text-md-on-surface-variant mt-2 flex items-center gap-1.5 justify-center">
                                            <Icon name="ac_unit" className="text-sm text-md-primary" />
                                            Ice {formatWeight(iceWeight, unitSystem)} already in the server — pour from 0
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={`typescale-display-large text-7xl font-extrabold leading-none tracking-tight tabular-nums mb-4 mt-2 transition-all duration-300 ${timerColorClass}`}>
                                    {formatDuration(totalElapsed)}
                                </div>
                                <div className="w-full flex flex-col items-center gap-1.5 mb-5">
                                    <h2 className="typescale-title-large font-bold text-md-on-surface text-center">
                                        {stepTitle}
                                    </h2>

                                    {/* Badges: Target, Valve */}
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        {typeof currentStep.target_weight === 'number' && currentStep.target_weight > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full typescale-label-small font-bold bg-md-surface-container-high text-md-on-surface border border-md-outline-variant/30 tabular-nums">
                                                <Icon name="flag" className="text-xs text-md-primary" />
                                                <span>Target: {formatWeight(currentStep.target_weight, unitSystem)}</span>
                                            </span>
                                        )}
                                        {currentValve && (
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full typescale-label-small font-bold ${
                                                currentValve === 'open'
                                                    ? 'bg-md-primary text-md-on-primary'
                                                    : 'bg-md-secondary-container text-md-on-secondary-container'
                                            }`}>
                                                <Icon name={currentValve === 'open' ? 'lock_open' : 'lock'} className="text-xs" />
                                                <span>Switch {currentValve === 'open' ? 'Open' : 'Closed'}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Instruction text */}
                                    {stepInstruction && stepInstruction !== stepTitle && (
                                        <div className="mt-1 px-3.5 py-2 rounded-xl bg-md-surface-container/60 border border-md-outline-variant/15 max-w-[340px] text-center">
                                            <p className="typescale-body-small text-md-on-surface-variant leading-relaxed">
                                                {stepInstruction}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Water Progress */}
                                <div className="w-full">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="typescale-label-medium font-bold text-md-on-surface-variant">Total Water</span>
                                        <span className="typescale-title-medium font-bold text-md-primary tabular-nums">
                                            {formatWeight(currentTargetWeight, unitSystem)} <span className="typescale-body-small text-md-on-surface-variant/70 font-normal">/ {formatVolume(totalWaterRecipe, unitSystem)}</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-md-surface-container-high rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-md-primary h-3 rounded-full transition-[width] duration-1000 ease-linear"
                                            style={{ width: `${progressPercent}%` }}
                                        ></div>
                                    </div>
                                    {iceWeight > 0 && (
                                        <p className="typescale-body-small text-md-on-surface-variant mt-2 flex items-center gap-1.5 justify-center">
                                            <Icon name="ac_unit" className="text-sm text-md-primary" />
                                            Ice {formatWeight(iceWeight, unitSystem)} already in the server — pour from 0
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Collapsible Live Extraction Curve in Smart Scale Mode */}
                        {isSmartScale && (
                            <div className="w-full mt-3 pt-2.5 border-t border-md-outline-variant/20">
                                <button
                                    type="button"
                                    onClick={() => setShowLiveChart(!showLiveChart)}
                                    className="flex items-center justify-between w-full typescale-label-small font-bold text-md-on-surface-variant hover:text-md-on-surface transition-colors cursor-pointer px-1"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Icon name="show_chart" className="text-sm text-md-primary" />
                                        <span>Live Extraction Curve</span>
                                    </span>
                                    <Icon name={showLiveChart ? 'expand_less' : 'expand_more'} className="text-base" />
                                </button>
                                {showLiveChart && (
                                    <BrewCurveChart
                                        points={curveData}
                                        currentTime={totalElapsed}
                                        maxDurationSeconds={currentStepEnd}
                                        targetWater={totalWaterRecipe}
                                        className="mt-2.5 text-left"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Next Up - All Remaining Steps */}
                {engineState.currentStepIndex < activeRecipe.steps.length - 1 && (
                    <div className="mb-6">
                        <h3 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider mb-2.5 ml-1">Next Up</h3>
                        <div className="space-y-2.5">
                            {activeRecipe.steps.slice(engineState.currentStepIndex + 1).map((step, idx) => {
                                const valve = valveStates[engineState.currentStepIndex + idx + 1];
                                return (
                                    <div key={step.id || idx} className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-md-outline-variant/20 bg-md-surface-container-low/70 opacity-70">
                                        <div className="size-8 rounded-full bg-md-surface-container-highest border border-md-outline-variant/20 flex items-center justify-center text-md-on-surface-variant typescale-label-medium font-bold shrink-0">
                                            {engineState.currentStepIndex + idx + 2}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="typescale-title-small font-bold text-md-on-surface line-clamp-1">
                                                {typeof step.target_weight === 'number' && step.target_weight > 0
                                                    ? `Pour +${formatWeight(getPourAmount(activeRecipe.steps, engineState.currentStepIndex + idx + 1), unitSystem)}`
                                                    : step.label}
                                            </h4>
                                            <p className="typescale-body-small text-md-on-surface-variant line-clamp-3">
                                                {typeof step.target_weight === 'number' && step.target_weight > 0
                                                    ? `Target: ${formatWeight(step.target_weight, unitSystem)}`
                                                    : step.instruction || step.label}
                                            </p>
                                        </div>
                                        {valve && (
                                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full typescale-label-small font-bold shrink-0 ${valve === 'open' ? 'bg-md-primary text-md-on-primary' : 'bg-md-secondary-container text-md-on-secondary-container'}`}>
                                                <Icon name={valve === 'open' ? 'lock_open' : 'lock'} className="text-[13px]" />
                                                Switch {valve === 'open' ? 'Open' : 'Closed'}
                                            </span>
                                        )}
                                        <span className="typescale-label-medium font-semibold text-md-on-surface-variant tabular-nums shrink-0">
                                            {formatStepSeconds(step.duration_seconds)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="sticky bottom-0 left-0 right-0 p-5 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 z-20">
                <div className="flex w-full gap-3">
                    {totalElapsed === 0 && !engineState.isRunning ? (
                        <Button
                            variant="filled"
                            size="lg"
                            onClick={resumeBrew}
                            className="w-full"
                        >
                            <Icon name="play_arrow" style={{ fontVariationSettings: "'FILL' 1" }} />
                            <span>Start Brew</span>
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => openStopConfirm('home')}
                                className="flex-1 bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest border border-md-outline-variant/30"
                            >
                                <Icon name="stop" style={{ fontVariationSettings: "'FILL' 1" }} />
                                <span>Stop</span>
                            </Button>
                            <Button
                                variant="filled"
                                size="lg"
                                onClick={engineState.isRunning ? pauseBrew : resumeBrew}
                                className="flex-1"
                            >
                                <Icon name={engineState.isRunning ? "pause" : "play_arrow"} style={{ fontVariationSettings: "'FILL' 1" }} />
                                <span>{engineState.isRunning ? 'Pause' : 'Resume'}</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

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
