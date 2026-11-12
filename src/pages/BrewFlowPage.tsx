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
import { formatDuration, formatWeight, formatVolume, formatStepSeconds, formatMethodName, getStepDuration, getCurrentTargetWeight, getPreviousTargetWeight, getTotalTargetWeight, getWaterProgressPercent, getStepIntervalInfo, getValveStates, getBrewArchetype, formatStepActionTitle, type UnitSystem } from '../shared/utils/brewMath';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { BrewCurveChart } from '../components/BrewCurveChart';

const BrewHeader = ({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) => (
    <header className="shrink-0 bg-md-surface/90 backdrop-blur-xl pt-[max(env(safe-area-inset-top),1.25rem)] pb-3 px-5 border-b border-md-outline-variant/15">
        <div className="flex items-center gap-3">
            <button
                onClick={onBack}
                className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest active:scale-95 transition-all cursor-pointer shrink-0"
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

const WaterProgressBar = ({
    title,
    currentLabel,
    totalLabel,
    percent,
    barHeightClass = 'h-2.5',
    transitionClass = '',
}: {
    title: string;
    currentLabel: string;
    totalLabel: string;
    percent: number;
    barHeightClass?: string;
    transitionClass?: string;
}) => (
    <div className="w-full">
        <div className="flex justify-between items-end mb-1.5">
            <span className="typescale-label-medium font-bold text-md-on-surface-variant">{title}</span>
            <span className="typescale-title-small font-bold text-md-primary tabular-nums">
                {currentLabel}{' '}
                <span className="typescale-body-small text-md-on-surface-variant font-normal">/ {totalLabel}</span>
            </span>
        </div>
        <div className={`w-full bg-md-surface-container-high rounded-full ${barHeightClass} overflow-hidden`}>
            <div
                className={`bg-md-primary ${barHeightClass} rounded-full ${transitionClass}`}
                style={{ width: `${percent}%` }}
            />
        </div>
    </div>
);

export const BrewFlowPage = () => {
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const { activeRecipe, engineState, brewMode, stopBrew, pauseBrew, resumeBrew, skipStep, hydrateBrew, selectedBeanId, selectedFilterId, coffeeConsumed } = useBrewStore();
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

    const archetype = getBrewArchetype(activeRecipe.method_id);
    const isYieldMode = archetype === 'espresso';
    const hasStepTarget = typeof currentStep.target_weight === 'number' && currentStep.target_weight > 0;
    const showWeightTelemetry = isSmartScale && (archetype === 'pour_over' || hasStepTarget);
    const showWaterProgress = totalWaterRecipe > 0 && (archetype === 'pour_over' || archetype === 'immersion_press' || hasStepTarget);
    const showExtractionCurve = isSmartScale && (archetype === 'pour_over' || archetype === 'espresso');
    const waterMetricTitle = isYieldMode ? 'Shot Yield' : 'Total Water';
    const stepTitle = formatStepActionTitle(activeRecipe.steps, engineState.currentStepIndex, archetype, unitSystem);
    const rawInstruction = currentStep.instruction || '';
    const stepInstruction = rawInstruction.replace(/^Target:\s*[\d.]+[a-zA-Z]*\s*on scale\s*[—–-]\s*/i, '').trim();
    const intervalInfo = getStepIntervalInfo(currentStep);
    const isLastStep = engineState.currentStepIndex >= activeRecipe.steps.length - 1;

    if (engineState.isCompleted) {
        return (
            <div className="flex flex-col h-dvh max-w-md mx-auto bg-md-surface text-md-on-surface font-sans overflow-x-hidden">
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

                            {/* Final Water / Yield Progress */}
                            {totalWaterRecipe > 0 && (
                                <div className="w-full pt-2">
                                    <WaterProgressBar
                                        title={waterMetricTitle}
                                        currentLabel={formatVolume(isScaleActive ? currentWeight : totalWaterRecipe, unitSystem)}
                                        totalLabel={formatVolume(totalWaterRecipe, unitSystem)}
                                        percent={100}
                                        barHeightClass="h-3"
                                    />
                                </div>
                            )}

                            {/* Extraction Curve Chart in Done State */}
                            {showExtractionCurve && curveData.length > 0 && (
                                <div className="w-full pt-3 text-left">
                                    <BrewCurveChart
                                        points={curveData}
                                        maxDurationSeconds={totalElapsed}
                                        targetWater={totalWaterRecipe}
                                        waterLabel={isYieldMode ? 'Yield (g)' : 'Water (g)'}
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
                <div className="sticky bottom-0 left-0 right-0 px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 z-20 flex flex-col gap-2">
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
                        type="button"
                        onClick={() => {
                            stopBrew();
                            navigate('/home');
                        }}
                        className="w-full min-h-[44px] py-2.5 text-md-on-surface-variant font-bold hover:text-md-on-surface transition-colors cursor-pointer typescale-label-large"
                    >
                        Back to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-dvh max-w-md mx-auto bg-md-surface text-md-on-surface font-sans overflow-x-hidden">
            {/* Header */}
            <BrewHeader recipe={activeRecipe} onBack={() => openStopConfirm('back')} />

            <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {/* Active Step Card */}
                <div className="shrink-0 flex flex-col justify-center items-center mb-6 relative">
                    <div className="w-full bg-md-surface-container-low rounded-3xl p-5 border border-md-outline-variant/30 shadow-md-2 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-md-primary"></div>

                        {/* 1. Top Step Header (standalone) */}
                        <div className="pb-3 border-b border-md-outline-variant/20 flex justify-center">
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full typescale-title-medium font-bold tabular-nums bg-md-secondary-container text-md-on-secondary-container">
                                Step {engineState.currentStepIndex + 1} of {activeRecipe.steps.length}
                            </span>
                        </div>

                        {/* 2. Live Telemetry */}
                        <div className={showWeightTelemetry ? 'grid grid-cols-2 divide-x divide-md-outline-variant/20 py-4 text-center' : 'py-4 flex flex-col items-center text-center'}>
                            <div className="flex flex-col items-center justify-center px-2 min-w-0">
                                <span className={`typescale-label-small font-bold uppercase tracking-widest mb-1.5 transition-colors ${
                                    isTimerNear ? 'text-amber-600 dark:text-amber-400 font-extrabold animate-pulse' : 'text-md-on-surface-variant'
                                }`}>
                                    Time (s)
                                </span>
                                <div className={`${showWeightTelemetry ? 'text-4xl sm:text-5xl' : 'typescale-display-large text-6xl'} font-black leading-none tracking-tight tabular-nums font-mono transition-all duration-300 ${timerColorClass}`}>
                                    {formatDuration(totalElapsed)}
                                </div>
                                <span className={`typescale-label-small font-semibold tabular-nums mt-1.5 ${
                                    isTimerNear ? 'text-amber-600 dark:text-amber-400' : 'text-md-on-surface-variant'
                                }`}>
                                    {isTimerNear ? `${engineState.remainingTime}s to next` : `Until ${formatDuration(currentStepEnd)}`}
                                </span>
                            </div>

                            {showWeightTelemetry && (
                                <div className="flex flex-col items-center justify-center px-2 min-w-0">
                                    <span className={`typescale-label-small font-bold uppercase tracking-widest mb-1.5 transition-colors ${
                                        isTargetReached
                                            ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                            : isTargetNear
                                            ? 'text-amber-600 dark:text-amber-400 font-extrabold animate-pulse'
                                            : 'text-md-on-surface-variant'
                                    }`}>
                                        {isYieldMode ? 'Yield (g)' : 'Water (g)'}
                                    </span>
                                    <div className={`text-4xl sm:text-5xl font-black leading-none tracking-tight tabular-nums font-mono transition-all duration-300 ${waterColorClass}`}>
                                        {effectiveWaterWeight.toFixed(1)}
                                    </div>
                                    <span className="inline-flex items-center gap-1 typescale-label-small font-semibold text-md-on-surface-variant tabular-nums font-mono mt-1.5">
                                        {isScaleActive ? (
                                            <>
                                                <Icon name="water_drop" className="text-xs text-md-primary" />
                                                <span>{flowRate.toFixed(1)} g/s</span>
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="warning" className="text-xs text-md-primary" />
                                                <span>Scale off</span>
                                            </>
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 3. Context Tags directly below Telemetry */}
                        {(currentValve || intervalInfo.pourSeconds > 0) && (
                            <div className="flex items-center justify-center gap-2 flex-wrap pb-3.5">
                                {currentValve && (
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full typescale-label-small font-bold ${
                                        currentValve === 'open'
                                            ? 'bg-md-primary text-md-on-primary'
                                            : 'bg-md-secondary-container text-md-on-secondary-container'
                                    }`}>
                                        <Icon name={currentValve === 'open' ? 'lock_open' : 'lock'} className="text-xs" />
                                        <span>Switch {currentValve === 'open' ? 'Open' : 'Closed'}</span>
                                    </span>
                                )}
                                {intervalInfo.pourSeconds > 0 && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full typescale-label-small font-semibold tabular-nums bg-md-surface-container-high text-md-on-surface-variant">
                                        <Icon name="hourglass_empty" className="text-xs text-md-primary" />
                                        Pour ~{intervalInfo.pourSeconds}s{intervalInfo.restSeconds > 0 ? ` · Rest ~${intervalInfo.restSeconds}s` : ''}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* 4. Water / Yield Progress */}
                        {showWaterProgress && (
                            <div className="w-full">
                                <WaterProgressBar
                                    title={waterMetricTitle}
                                    currentLabel={formatWeight(isSmartScale ? effectiveWaterWeight : currentTargetWeight, unitSystem)}
                                    totalLabel={formatVolume(totalWaterRecipe, unitSystem)}
                                    percent={isSmartScale ? effectiveProgressPercent : progressPercent}
                                    transitionClass={isSmartScale ? 'transition-all duration-300 ease-out' : 'transition-[width] duration-1000 ease-linear'}
                                />
                                {iceWeight > 0 && !isYieldMode && (
                                    <p className="typescale-body-small text-md-on-surface-variant mt-2 flex items-center gap-1.5 justify-center">
                                        <Icon name="ac_unit" className="text-sm text-md-primary" />
                                        Ice {formatWeight(iceWeight, unitSystem)} already in the server, pour from 0
                                    </p>
                                )}
                            </div>
                        )}

                        {/* 5. Current Action & Instruction */}
                        <div className={`w-full text-center space-y-2.5 ${showWaterProgress || currentValve || intervalInfo.pourSeconds > 0 ? 'mt-4 pt-3.5 border-t border-md-outline-variant/20' : 'pt-2 border-t border-md-outline-variant/20'}`}>
                            {showWeightTelemetry && isRestingPhase ? (
                                <div className="w-full py-2.5 px-3.5 rounded-2xl bg-md-primary-container text-md-on-primary-container flex items-center justify-center gap-2">
                                    <Icon name="local_cafe" className="text-lg text-md-primary animate-pulse shrink-0" />
                                    <span className="typescale-label-medium font-bold tabular-nums">
                                        Target reached! Resting for {formatStepSeconds(engineState.remainingTime)}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <h2 className="text-[28px] sm:text-3xl font-extrabold text-md-on-surface leading-tight tracking-tight tabular-nums">
                                        {stepTitle}
                                    </h2>
                                    {(hasStepTarget || (isSmartScale && isScaleActive && stepTarget > 0 && !isTargetReached)) && (
                                        <div className="flex items-center justify-center gap-3 flex-wrap">
                                            {hasStepTarget && (
                                                <span className="text-[15px] font-bold text-md-on-surface-variant tabular-nums">
                                                    Target {formatWeight(currentStep.target_weight!, unitSystem)}
                                                </span>
                                            )}
                                            {hasStepTarget && isSmartScale && isScaleActive && stepTarget > 0 && !isTargetReached && (
                                                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[15px] font-bold tabular-nums ${
                                                    isTargetNear
                                                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse'
                                                        : 'bg-md-primary-container text-md-on-primary-container'
                                                }`}>
                                                    <Icon name="water_drop" className="text-base text-md-primary" />
                                                    <span>{Math.max(0, stepTarget - currentWeight).toFixed(1)}g left</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {stepInstruction && stepInstruction !== stepTitle && (
                                <p className="typescale-body-small text-md-on-surface-variant leading-relaxed max-w-[340px] mx-auto">
                                    {stepInstruction}
                                </p>
                            )}
                        </div>

                        {/* Collapsible Live Extraction Curve (Pour-Over & Espresso in Smart Scale Mode) */}
                        {showExtractionCurve && (
                            <div className="w-full mt-3 pt-2.5 border-t border-md-outline-variant/20">
                                <button
                                    type="button"
                                    onClick={() => setShowLiveChart(!showLiveChart)}
                                    aria-expanded={showLiveChart}
                                    className="flex items-center justify-between w-full min-h-[44px] py-2 typescale-label-small font-bold text-md-on-surface-variant hover:text-md-on-surface transition-colors cursor-pointer px-1 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-md-primary"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Icon name="show_chart" className="text-sm text-md-primary" />
                                        <span>Live Extraction Curve</span>
                                    </span>
                                    <Icon name={showLiveChart ? 'expand_less' : 'expand_more'} className="text-base" />
                                </button>
                                {showLiveChart && (
                                    <BrewCurveChart
                                        embedded
                                        points={curveData}
                                        currentTime={totalElapsed}
                                        maxDurationSeconds={currentStepEnd}
                                        targetWater={totalWaterRecipe}
                                        waterLabel={isYieldMode ? 'Yield (g)' : 'Water (g)'}
                                        className="mt-1.5 text-left"
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
                                const absoluteIdx = engineState.currentStepIndex + idx + 1;
                                const valve = valveStates[absoluteIdx];
                                const nextHasTarget = typeof step.target_weight === 'number' && step.target_weight > 0;
                                return (
                                    <div key={step.id || idx} className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-md-outline-variant/20 bg-md-surface-container-low/70 opacity-75">
                                        <div className="size-8 rounded-full bg-md-surface-container-highest border border-md-outline-variant/20 flex items-center justify-center text-md-on-surface-variant typescale-label-medium font-bold tabular-nums shrink-0">
                                            {absoluteIdx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="typescale-title-small font-bold text-md-on-surface line-clamp-1">
                                                {formatStepActionTitle(activeRecipe.steps, absoluteIdx, archetype, unitSystem)}
                                            </h4>
                                            <p className="typescale-body-small text-md-on-surface-variant line-clamp-2">
                                                {nextHasTarget
                                                    ? `Target: ${formatWeight(step.target_weight!, unitSystem)}`
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
            <div className="sticky bottom-0 left-0 right-0 px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 z-20">
                <div className="flex w-full gap-2.5">
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
                                className="flex-1 px-3 text-sm bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest border border-md-outline-variant/30"
                            >
                                <Icon name="stop" style={{ fontVariationSettings: "'FILL' 1" }} />
                                <span>Stop</span>
                            </Button>
                            <Button
                                variant="filled"
                                size="lg"
                                onClick={engineState.isRunning ? pauseBrew : resumeBrew}
                                className="flex-1 px-3 text-sm"
                            >
                                <Icon name={engineState.isRunning ? "pause" : "play_arrow"} style={{ fontVariationSettings: "'FILL' 1" }} />
                                <span>{engineState.isRunning ? 'Pause' : 'Resume'}</span>
                            </Button>
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={skipStep}
                                className="flex-1 px-3 text-sm"
                                aria-label={isLastStep ? 'Finish brew' : 'Advance to next step'}
                            >
                                <span>{isLastStep ? 'Finish' : 'Next'}</span>
                                <Icon name={isLastStep ? 'check' : 'skip_next'} />
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
