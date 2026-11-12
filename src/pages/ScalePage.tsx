import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { ScalePairingModal } from '../components/ScalePairingModal';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { useWakeLock } from '../shared/hooks/useWakeLock';
import { useSafeBack } from '../shared/utils/backNavigation';
import {
    type ScaleBrewMode,
    type EspressoState,
    type PourOverState,
    initEspressoState,
    updateEspressoState,
    initPourOverState,
    updatePourOverState,
    playScaleBeep,
} from '../features/scale/domain/scaleModes';

const formatTimemoreTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const ScalePage = () => {
    const safeBack = useSafeBack();

    // On native APK, auto-open pairing modal if disconnected on initial mount
    const [isPairingModalOpen, setIsPairingModalOpen] = useState(
        () => Capacitor.isNativePlatform() && useScaleStore.getState().connectionState !== 'connected'
    );

    // Brewing Modes: 'manual' | 'pour-over' | 'espresso' - Default to 'manual' on start
    const [brewMode, setBrewMode] = useState<ScaleBrewMode>('manual');
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    // Timer & Flow State
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Auto-detection tracking refs
    const hasAutoStartedRef = useRef(false);
    const peakWeightRef = useRef(0);
    const pourOverStateRef = useRef<PourOverState>(initPourOverState());
    const [pourOverPhase, setPourOverPhase] = useState<PourOverState['phase']>('armed');
    const espressoStateRef = useRef<EspressoState>(initEspressoState());
    const [espressoPhase, setEspressoPhase] = useState<EspressoState['phase']>('idle');

    // Refs to avoid stale closures in store subscription
    const brewModeRef = useRef(brewMode);
    const isTimerRunningRef = useRef(isTimerRunning);
    const timerSecondsRef = useRef(timerSeconds);
    const isSoundEnabledRef = useRef(isSoundEnabled);

    useEffect(() => {
        brewModeRef.current = brewMode;
        isTimerRunningRef.current = isTimerRunning;
        timerSecondsRef.current = timerSeconds;
        isSoundEnabledRef.current = isSoundEnabled;
    }, [brewMode, isTimerRunning, timerSeconds, isSoundEnabled]);

    const {
        connectionState,
        device,
        batteryPercent,
        currentWeight,
        flowRate,
        isOverload,
        tare,
        disconnect,
        isMock,
    } = useScaleStore();

    useWakeLock(true);

    const isConnected = connectionState === 'connected';

    const triggerSoundAndHaptic = (freq = 1046.5, pattern: number[] = [25]) => {
        navigator.vibrate?.(pattern);
        if (isSoundEnabledRef.current) {
            playScaleBeep(freq);
        }
    };

    // On native APK, prompt pairing modal if scale disconnects
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        const unsub = useScaleStore.subscribe((state, prevState) => {
            if (state.connectionState !== 'connected' && prevState.connectionState === 'connected') {
                setIsPairingModalOpen(true);
            }
        });
        return unsub;
    }, []);

    const handleClosePairingModal = () => {
        setIsPairingModalOpen(false);
        if (Capacitor.isNativePlatform() && useScaleStore.getState().connectionState !== 'connected') {
            safeBack('/brew-methods');
        }
    };

    // Stopwatch Effect
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = window.setInterval(() => {
                setTimerSeconds((prev) => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning]);

    // Track peak weight during brewing
    useEffect(() => {
        if (currentWeight > peakWeightRef.current) {
            peakWeightRef.current = currentWeight;
        }
    }, [currentWeight]);

    // Reactive automated mode listener (Pour-Over Auto-Start & Espresso Auto-Tare)
    useEffect(() => {
        const unsub = useScaleStore.subscribe((state) => {
            const mode = brewModeRef.current;
            const now = Date.now();
            const weight = state.currentWeight;
            const currentFlow = state.flowRate;
            const timerSecs = timerSecondsRef.current;
            const running = isTimerRunningRef.current;

            // 1. POUR-OVER AUTO MODE (A)
            if (mode === 'pour-over') {
                const action = updatePourOverState(pourOverStateRef.current, {
                    weight,
                    flowRate: currentFlow,
                    timerSeconds: timerSecs,
                    isTimerRunning: running,
                });

                pourOverStateRef.current = action.nextState;
                setPourOverPhase(action.nextState.phase);

                if (action.triggerStartTimer && !hasAutoStartedRef.current) {
                    hasAutoStartedRef.current = true;
                    setIsTimerRunning(true);
                    triggerSoundAndHaptic(1318.5, [25, 40, 25]); // High beep
                }

                if (action.triggerPauseTimer && running) {
                    setIsTimerRunning(false);
                    triggerSoundAndHaptic(880, [40]);
                }
            }

            // 2. ESPRESSO AUTO MODE (ESP)
            if (mode === 'espresso') {
                const action = updateEspressoState(espressoStateRef.current, {
                    weight,
                    flowRate: currentFlow,
                    nowMs: now,
                    timerSeconds: timerSecs,
                    isTimerRunning: running,
                });

                espressoStateRef.current = action.nextState;
                setEspressoPhase(action.nextState.phase);

                if (action.triggerTare) {
                    tare();
                    triggerSoundAndHaptic(1046.5, [35]);
                }

                if (action.triggerStartTimer && !hasAutoStartedRef.current) {
                    hasAutoStartedRef.current = true;
                    setIsTimerRunning(true);
                    triggerSoundAndHaptic(1567.9, [25, 30, 25]);
                }

                if (action.triggerPauseTimer && running) {
                    setIsTimerRunning(false);
                    triggerSoundAndHaptic(987.7, [50, 50]);
                }
            }
        });

        return unsub;
    }, [tare]);

    const handleToggleTimer = () => {
        triggerSoundAndHaptic(isTimerRunning ? 880 : 1174.6);
        setIsTimerRunning((prev) => !prev);
    };

    const handleResetTimer = () => {
        triggerSoundAndHaptic(784, [30]);
        setIsTimerRunning(false);
        setTimerSeconds(0);
        hasAutoStartedRef.current = false;
        peakWeightRef.current = 0;
        pourOverStateRef.current = initPourOverState(currentWeight);
        setPourOverPhase(pourOverStateRef.current.phase);
        espressoStateRef.current = initEspressoState();
        setEspressoPhase('idle');
    };

    const handleTare = () => {
        triggerSoundAndHaptic(1046.5, [30]);
        tare();
        hasAutoStartedRef.current = false;
        peakWeightRef.current = 0;
        // On tare, scale resets to 0.0g -> arm pour over mode!
        pourOverStateRef.current = initPourOverState(0);
        setPourOverPhase('armed');
        espressoStateRef.current = initEspressoState();
        setEspressoPhase('idle');
    };

    const handleSelectMode = (newMode: ScaleBrewMode) => {
        triggerSoundAndHaptic(987.7);
        setBrewMode(newMode);
        hasAutoStartedRef.current = false;
        pourOverStateRef.current = initPourOverState(currentWeight);
        setPourOverPhase(pourOverStateRef.current.phase);
        espressoStateRef.current = initEspressoState();
        setEspressoPhase('idle');
    };

    const isPouring = flowRate > 0.2;

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-[max(env(safe-area-inset-bottom),1rem)] select-none">
            {/* Header: Title & Scale Connectivity */}
            <PageHeader
                title="Smart Scale"
                subtitle={isConnected ? (device?.name || 'Scale Connected') : 'Precision Digital Scale'}
                onBack={() => safeBack('/brew-methods')}
                action={
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <button
                                onClick={disconnect}
                                title="Tap to disconnect scale"
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-md-surface-container-low border border-md-outline-variant/30 text-xs text-md-on-surface hover:bg-md-surface-container transition-all cursor-pointer shadow-xs"
                            >
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-semibold truncate max-w-[100px]">
                                    {device?.name || (isMock ? 'Demo Scale' : 'Connected')}
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsPairingModalOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-md-primary text-md-on-primary text-xs font-semibold hover:bg-md-primary/90 active:scale-95 transition-all cursor-pointer shadow-xs"
                            >
                                <Icon name="bluetooth" className="text-sm" />
                                <span>Pair Scale</span>
                            </button>
                        )}
                    </div>
                }
            />

            {/* Overload Alert Banner */}
            {isOverload && (
                <div className="mx-5 mt-2 px-4 py-2 rounded-2xl bg-md-error/15 border border-md-error/30 text-md-error text-xs font-semibold flex items-center justify-center gap-1.5 animate-bounce">
                    <Icon name="warning" className="text-sm" />
                    Scale overload warning! Maximum weight exceeded.
                </div>
            )}

            {/* Main Content Area: Coffee Roast Palette Design System */}
            <main className="flex-1 px-4 py-2 flex flex-col justify-between max-w-md mx-auto w-full gap-2 sm:gap-3">
                {/* 1. COMPACT MODE SELECTOR BAR (High Contrast & Airy Spacing) */}
                <div className="w-full bg-md-surface-container-low p-1 rounded-xl border border-md-outline-variant/25 shadow-xs">
                    <div className="grid grid-cols-3 gap-1">
                        <button
                            type="button"
                            onClick={() => handleSelectMode('manual')}
                            className={`h-9 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                                brewMode === 'manual'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container'
                            }`}
                        >
                            <Icon name="tune" className="text-sm shrink-0" />
                            <span>Manual</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSelectMode('pour-over')}
                            className={`h-9 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                                brewMode === 'pour-over'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container'
                            }`}
                        >
                            <Icon name="water_drop" className="text-sm shrink-0" />
                            <span>Pour Over</span>
                            <span className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                                brewMode === 'pour-over' ? 'bg-white/20 text-white' : 'bg-md-surface-container-highest text-md-on-surface-variant'
                            }`}>Ⓐ</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSelectMode('espresso')}
                            className={`h-9 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                                brewMode === 'espresso'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container'
                            }`}
                        >
                            <Icon name="local_cafe" className="text-sm shrink-0" />
                            <span>Espresso</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                                brewMode === 'espresso' ? 'bg-white/20 text-white' : 'bg-md-surface-container-highest text-md-on-surface-variant'
                            }`}>ESP</span>
                        </button>
                    </div>
                </div>

                {/* 2. SCALE DECK CARD (Hardware Scale Deck Proportion: max-h controlled, centered) */}
                <div className="relative w-full my-auto rounded-3xl bg-md-surface-container-lowest dark:bg-md-surface-container-low border border-md-outline-variant/30 shadow-md-1 p-4 sm:p-5 flex flex-col justify-between overflow-hidden transition-all flex-1 min-h-[300px] max-h-[390px] sm:max-h-[420px]">
                    {/* Ambient Glow behind digital numbers */}
                    <div
                        className="absolute inset-0 rounded-3xl blur-3xl pointer-events-none transition-opacity duration-500 bg-primary"
                        style={{ opacity: isPouring ? 0.08 : 0.03 }}
                    />

                    {/* TOP STATUS BAR (Battery, Mode Badge, Sound Toggle) */}
                    <div className="relative z-10 flex items-center justify-between pb-2.5 border-b border-md-outline-variant/20">
                        {/* Battery Level Indicator */}
                        <div className="flex items-center gap-1 text-md-on-surface-variant text-xs">
                            <Icon name="battery_full" className="text-sm text-primary" />
                            <span className="font-mono tabular-nums font-medium">
                                {batteryPercent !== undefined ? `${batteryPercent}%` : '100%'}
                            </span>
                        </div>

                        {/* Mode Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-mono font-bold tracking-wider uppercase text-primary">
                            {brewMode === 'manual' && (
                                <span className="flex items-center gap-1 text-md-on-surface-variant">
                                    <span className="size-1.5 rounded-full bg-md-outline" />
                                    <span>MANUAL</span>
                                </span>
                            )}
                            {brewMode === 'pour-over' && (
                                <span className="flex items-center gap-1 text-primary">
                                    <span className={`size-1.5 rounded-full bg-primary ${isTimerRunning ? 'animate-ping' : ''}`} />
                                    <span>AUTO-TIMER</span>
                                    <span className="font-extrabold text-xs">Ⓐ</span>
                                </span>
                            )}
                            {brewMode === 'espresso' && (
                                <span className="flex items-center gap-1 text-primary">
                                    <span className={`size-1.5 rounded-full bg-primary ${espressoPhase === 'extracting' ? 'animate-ping' : ''}`} />
                                    <span>AUTO-ESPRESSO</span>
                                    <span className="font-extrabold text-[10px]">ESP</span>
                                </span>
                            )}
                        </div>

                        {/* Sound / Buzzer Toggle */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsSoundEnabled((prev) => !prev);
                                triggerSoundAndHaptic(1046.5);
                            }}
                            title={isSoundEnabled ? 'Buzzer: Sound on' : 'Buzzer: Muted'}
                            className={`size-8 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                                isSoundEnabled
                                    ? 'bg-md-surface-container-high border-md-outline-variant/30 text-primary'
                                    : 'bg-transparent border-transparent text-md-on-surface-variant/40 hover:text-md-on-surface-variant'
                            }`}
                        >
                            <Icon
                                name={isSoundEnabled ? 'volume_up' : 'volume_off'}
                                className="text-sm"
                            />
                        </button>
                    </div>

                    {/* DISPLAY: WEIGHT HERO (MANUAL) vs FULL INSTRUMENT CLUSTER (POUR-OVER / ESPRESSO) */}
                    {brewMode === 'manual' ? (
                        /* MANUAL MODE: PURE PRECISION WEIGHING DISPLAY (Hardware Deck Surface) */
                        <div className="relative z-10 flex-1 flex flex-col justify-center items-center my-2 w-full">
                            <div className="w-full flex-1 flex flex-col justify-center items-center rounded-2xl bg-md-surface-container-low/40 dark:bg-md-surface-container/30 border border-md-outline-variant/20 px-4 py-5 shadow-xs relative overflow-hidden">
                                {/* Subtle Scale Mat concentric ring / pad accent */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                    <div className="w-48 h-48 rounded-full border border-dashed border-md-outline-variant/40" />
                                </div>

                                <span className="text-xs font-bold uppercase tracking-widest text-md-on-surface-variant/70 mb-2 flex items-center gap-1.5 relative z-10">
                                    <Icon name="scale" className="text-base text-primary" />
                                    <span>Weight</span>
                                </span>

                                <div className="flex items-baseline justify-center gap-2 relative z-10">
                                    <span className="text-7xl sm:text-8xl md:text-9xl font-sans font-light tracking-tight text-md-on-surface tabular-nums leading-none">
                                        {currentWeight.toFixed(1)}
                                    </span>
                                    <span className="text-3xl sm:text-4xl font-sans font-medium text-md-on-surface-variant/70 self-end mb-1">
                                        g
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mt-3 text-xs font-mono text-md-on-surface-variant/60 relative z-10">
                                    <span className="inline-block size-1.5 rounded-full bg-emerald-500/80" />
                                    <span>±0.1g accuracy</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* BREWING MODES: FULL INSTRUMENT (WEIGHT HERO + TIMER & FLOW RATE) */
                        <div className="relative z-10 flex-1 flex flex-col justify-center items-center py-1.5 gap-2.5 w-full">
                            {/* 1. HERO WEIGHT DISPLAY */}
                            <div className="flex flex-col items-center justify-center pt-1">
                                <span className="text-xs font-bold uppercase tracking-widest text-md-on-surface-variant/70 mb-1 flex items-center gap-1.5">
                                    <Icon name="scale" className="text-sm text-primary" />
                                    <span>Weight</span>
                                </span>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-6xl sm:text-7xl font-sans font-light tracking-tight text-md-on-surface tabular-nums leading-none">
                                        {currentWeight.toFixed(1)}
                                    </span>
                                    <span className="text-2xl font-sans font-medium text-md-on-surface-variant/70 self-end mb-1">
                                        g
                                    </span>
                                </div>
                                <span className="text-[11px] font-mono text-md-on-surface-variant/60 mt-1">
                                    ±0.1g accuracy
                                </span>
                            </div>

                            {/* SUBTLE CARD DIVIDER */}
                            <div className="w-full h-px bg-md-outline-variant/20" />

                            {/* 2. COMPANION ROW (TIMER & FLOW RATE - Compact 50:50 Grid) */}
                            <div className="grid grid-cols-2 gap-2.5 w-full">
                                {/* Left: Timer */}
                                <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-md-surface-container-low/80 border border-md-outline-variant/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant/70 mb-1 flex items-center gap-1">
                                        <Icon name="timer" className="text-xs text-primary" />
                                        <span>Timer</span>
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-mono font-medium tracking-tight text-md-on-surface tabular-nums leading-none">
                                        {formatTimemoreTimer(timerSeconds)}
                                    </span>
                                    <span className="text-[10px] font-mono text-md-on-surface-variant/60 mt-1">
                                        {isTimerRunning ? 'Running' : timerSeconds > 0 ? 'Paused' : '00:00'}
                                    </span>
                                </div>

                                {/* Right: Flow Rate */}
                                <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-md-surface-container-low/80 border border-md-outline-variant/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                                        <Icon name="water_drop" className={`text-xs ${isPouring ? 'animate-pulse text-primary' : 'text-md-on-surface-variant/50'}`} />
                                        <span>Flow Rate</span>
                                    </span>
                                    <div className="flex items-baseline justify-center gap-1 leading-none">
                                        <span className={`text-2xl sm:text-3xl font-mono font-medium tabular-nums transition-colors ${
                                            isPouring ? 'text-primary' : 'text-md-on-surface'
                                        }`}>
                                            {flowRate.toFixed(1)}
                                        </span>
                                        <span className="text-xs font-mono font-medium text-md-on-surface-variant/70">
                                            g/s
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-md-on-surface-variant/60 mt-1 truncate">
                                        {isPouring ? 'Pouring' : 'Idle'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOTTOM STATUS GUIDANCE */}
                    <div className="relative z-10 pt-2 border-t border-md-outline-variant/20 flex items-center text-xs text-md-on-surface-variant">
                        <div className="flex items-center gap-2 w-full">
                            <span className={`size-2 rounded-full shrink-0 ${
                                (isTimerRunning && brewMode !== 'manual') ? 'bg-primary animate-ping' : 'bg-md-outline-variant'
                            }`} />
                            <span className="truncate">
                                {brewMode === 'manual' && 'Precision scale • Real-time weight'}
                                {brewMode === 'pour-over' && (
                                    pourOverPhase === 'idle'
                                        ? 'Tare scale to arm auto-timer'
                                        : pourOverPhase === 'armed'
                                        ? 'Armed • Auto-starts when pouring'
                                        : pourOverPhase === 'brewing'
                                        ? 'Brewing • Auto-pauses when lifted'
                                        : 'Brew finished • Dripper lifted'
                                )}
                                {brewMode === 'espresso' && (
                                    espressoPhase === 'idle'
                                        ? 'Place cup for Auto-Tare'
                                        : espressoPhase === 'cup_detected'
                                        ? 'Cup detected • Taring...'
                                        : espressoPhase === 'ready_to_extract'
                                        ? 'Ready • Timer starts on first drop'
                                        : espressoPhase === 'extracting'
                                        ? 'Extracting espresso...'
                                        : 'Extraction complete'
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. ERGONOMIC ACTION CONTROLS */}
                <div className="w-full space-y-2 pt-1">
                    {brewMode !== 'manual' && (
                        /* ROW 1: TIMER ACTIONS (Only shown for Pour Over & Espresso) */
                        <div className="grid grid-cols-2 gap-2">
                            {/* Start / Pause / Resume Button */}
                            <button
                                type="button"
                                onClick={handleToggleTimer}
                                className={`h-12 sm:h-14 rounded-2xl font-bold text-sm sm:text-base transition-all active:scale-[0.98] cursor-pointer shadow-xs border flex items-center justify-center gap-2 select-none ${
                                    isTimerRunning
                                        ? 'bg-primary/10 text-primary border-primary/30 ring-1 ring-primary/20'
                                        : 'bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface border-md-outline-variant/30'
                                }`}
                            >
                                <Icon
                                    name={isTimerRunning ? 'pause' : timerSeconds > 0 ? 'play_arrow' : 'timer'}
                                    className="text-xl"
                                />
                                <span>{isTimerRunning ? 'Pause' : timerSeconds > 0 ? 'Resume' : 'Start Timer'}</span>
                            </button>

                            {/* Reset Button */}
                            <button
                                type="button"
                                onClick={handleResetTimer}
                                disabled={timerSeconds === 0 && !isTimerRunning}
                                className={`h-12 sm:h-14 rounded-2xl font-bold text-sm sm:text-base transition-all active:scale-[0.98] cursor-pointer border flex items-center justify-center gap-2 select-none ${
                                    timerSeconds > 0 || isTimerRunning
                                        ? 'bg-md-surface-container-high hover:bg-md-surface-container-highest border-md-outline-variant/30 text-md-on-surface shadow-xs'
                                        : 'opacity-35 pointer-events-none border-transparent bg-md-surface-container text-md-on-surface-variant'
                                }`}
                            >
                                <Icon name="restart_alt" className="text-xl" />
                                <span>Reset</span>
                            </button>
                        </div>
                    )}

                    {/* TARE BUTTON (Large & Full-Width) */}
                    <button
                        type="button"
                        onClick={handleTare}
                        className={`w-full ${
                            brewMode === 'manual' ? 'h-14 sm:h-16 text-base sm:text-lg' : 'h-12 sm:h-14 text-sm sm:text-base'
                        } rounded-2xl bg-primary hover:bg-primary/95 text-white active:scale-[0.98] font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 select-none`}
                    >
                        <Icon name="scale" className={brewMode === 'manual' ? 'text-2xl' : 'text-xl'} />
                        <span>Tare (0.0 g)</span>
                    </button>
                </div>
            </main>

            {/* Bluetooth Pairing Modal */}
            <ScalePairingModal
                isOpen={isPairingModalOpen}
                onClose={handleClosePairingModal}
            />
        </div>
    );
};
