import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { ScalePairingModal } from '../components/ScalePairingModal';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { useWakeLock } from '../shared/hooks/useWakeLock';
import { useSafeBack } from '../shared/utils/backNavigation';
import { formatDuration } from '../shared/utils/brewMath';

export const ScalePage = () => {
    const safeBack = useSafeBack();

    // On native APK, auto-open pairing modal if disconnected on initial mount
    const [isPairingModalOpen, setIsPairingModalOpen] = useState(
        () => Capacitor.isNativePlatform() && useScaleStore.getState().connectionState !== 'connected'
    );

    // Timer & Auto-Start State
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isAutoTimerEnabled, setIsAutoTimerEnabled] = useState(true);
    const timerRef = useRef<number | null>(null);
    const hasAutoStartedRef = useRef(false);

    // Refs to avoid stale closures in store subscription
    const isAutoTimerEnabledRef = useRef(isAutoTimerEnabled);
    const isTimerRunningRef = useRef(isTimerRunning);
    const timerSecondsRef = useRef(timerSeconds);

    useEffect(() => {
        isAutoTimerEnabledRef.current = isAutoTimerEnabled;
        isTimerRunningRef.current = isTimerRunning;
        timerSecondsRef.current = timerSeconds;
    }, [isAutoTimerEnabled, isTimerRunning, timerSeconds]);

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

    // Handle closing pairing modal
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

    // Auto-Start Timer: Subscribes to weight updates from useScaleStore
    useEffect(() => {
        const unsub = useScaleStore.subscribe((state) => {
            if (
                isAutoTimerEnabledRef.current &&
                !isTimerRunningRef.current &&
                timerSecondsRef.current === 0 &&
                !hasAutoStartedRef.current &&
                state.currentWeight >= 0.5
            ) {
                hasAutoStartedRef.current = true;
                setIsTimerRunning(true);
                navigator.vibrate?.([25, 40, 25]);
            }
        });
        return unsub;
    }, []);

    const handleToggleTimer = () => {
        navigator.vibrate?.(25);
        setIsTimerRunning((prev) => !prev);
    };

    const handleResetTimer = () => {
        navigator.vibrate?.(35);
        setIsTimerRunning(false);
        setTimerSeconds(0);
        hasAutoStartedRef.current = false;
    };

    const handleTare = () => {
        navigator.vibrate?.(30);
        tare();
        hasAutoStartedRef.current = false;
    };

    // Dynamic reactive glow calculation for the hero weight card
    const hasWeight = Math.abs(currentWeight) > 0.2;
    const clampedAbsWeight = Math.min(Math.abs(currentWeight), 1000);
    const glowOpacity = hasWeight ? Math.min(0.18 + (clampedAbsWeight / 1000) * 0.25, 0.45) : 0.08;

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-8 select-none">
            {/* Header: Title & Connection Status */}
            <PageHeader
                title="Smart Scale"
                subtitle={isConnected ? (device?.name || 'Scale Connected') : 'Digital Precision Scale'}
                onBack={() => safeBack('/brew-methods')}
                action={
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <button
                                onClick={disconnect}
                                title="Tap to disconnect"
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-md-surface-container-low border border-md-outline-variant/30 text-xs text-md-on-surface hover:bg-md-surface-container transition-all cursor-pointer shadow-xs"
                            >
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-semibold truncate max-w-[100px]">
                                    {device?.name || (isMock ? 'Demo Scale' : 'Connected')}
                                </span>
                                {!isMock && batteryPercent !== undefined && (
                                    <span className="text-[11px] text-md-on-surface-variant font-mono">
                                        {batteryPercent}%
                                    </span>
                                )}
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
                <div className="mx-5 mt-3 px-4 py-2 rounded-2xl bg-md-error/15 border border-md-error/30 text-md-error text-xs font-semibold flex items-center justify-center gap-1.5 animate-bounce">
                    <Icon name="warning" className="text-sm" />
                    Scale overload warning! Maximum weight exceeded.
                </div>
            )}

            {/* Main Content Area: Weight is the King & Dominant Hero */}
            <main className="flex-1 px-5 py-4 flex flex-col justify-between gap-4">
                {/* 1. HERO WEIGHT DISPLAY CARD (Takes the Spotlight in the Middle) */}
                <div className="flex-1 flex items-center justify-center my-auto">
                    <div className="relative w-full rounded-[36px] bg-md-surface-container-lowest/60 dark:bg-md-surface-container-low/40 border border-md-outline-variant/25 p-8 sm:p-12 shadow-sm flex flex-col items-center justify-center overflow-hidden">
                        {/* Ambient Reactive Glow behind the weight */}
                        <div
                            className="absolute inset-0 rounded-[36px] blur-3xl pointer-events-none transition-opacity duration-300 bg-md-primary"
                            style={{ opacity: glowOpacity }}
                        />

                        {/* Weight Label */}
                        <span className="typescale-label-medium font-bold uppercase tracking-widest text-md-on-surface-variant mb-2 relative z-10">
                            Weight
                        </span>

                        {/* Massive Dominant Weight Number */}
                        <div className="flex items-baseline justify-center gap-1.5 sm:gap-2.5 my-2 relative z-10">
                            <span className="text-7xl sm:text-8xl md:text-9xl font-light text-md-on-surface tracking-tighter tabular-nums font-sans">
                                {currentWeight.toFixed(1)}
                            </span>
                            <span className="text-2xl sm:text-3xl md:text-4xl font-medium text-md-on-surface-variant/80 font-sans">
                                g
                            </span>
                        </div>

                        {/* Flow Rate or Precision Status Pill */}
                        <div className="mt-2 relative z-10 flex items-center justify-center h-7">
                            {flowRate > 0.1 ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-md-primary/10 border border-md-primary/25 text-xs font-semibold text-md-primary tabular-nums animate-in fade-in">
                                    <Icon name="water_drop" className="text-xs" />
                                    <span>Flow {flowRate.toFixed(1)} g/s</span>
                                </div>
                            ) : (
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-md-on-surface-variant/50">
                                    Precision ±0.1g
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. COMPACT COMPANION TIMER ROW: Symmetrical 3-Column Layout */}
                <div className="w-full grid grid-cols-[56px_1fr_56px] items-center px-1">
                    {/* Left: Auto-Start Timer Toggle Button */}
                    <div className="flex justify-start">
                        <button
                            type="button"
                            onClick={() => {
                                navigator.vibrate?.(20);
                                setIsAutoTimerEnabled((prev) => !prev);
                            }}
                            title={isAutoTimerEnabled ? 'Auto-Start: Aktif' : 'Auto-Start: Nonaktif'}
                            className={`size-11 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                                isAutoTimerEnabled
                                    ? 'bg-md-primary/15 border-md-primary/40 text-md-primary shadow-xs'
                                    : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface-variant/50 hover:text-md-on-surface-variant'
                            }`}
                        >
                            <Icon
                                name="bolt"
                                className="text-lg"
                                style={{ fontVariationSettings: isAutoTimerEnabled ? "'FILL' 1" : "'FILL' 0" }}
                            />
                            <span className="text-[9px] font-bold tracking-tighter uppercase -mt-0.5">
                                {isAutoTimerEnabled ? 'Auto' : 'Off'}
                            </span>
                        </button>
                    </div>

                    {/* Center: Compact Companion Timer mm:ss (Centered Horizontally) */}
                    <div className="flex items-center justify-center gap-2">
                        <Icon name="schedule" className="text-lg text-md-on-surface-variant/60" />
                        <span className="text-3xl sm:text-4xl font-mono font-medium text-md-on-surface tracking-tight tabular-nums">
                            {formatDuration(timerSeconds)}
                        </span>
                    </div>

                    {/* Right: Reset Button (Mirrors Auto Button Size for 100% Horizontal Symmetry) */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleResetTimer}
                            disabled={timerSeconds === 0 && !isTimerRunning}
                            title="Reset timer"
                            className={`size-11 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                                timerSeconds > 0 || isTimerRunning
                                    ? 'bg-md-surface-container-high hover:bg-md-surface-container-highest border-md-outline-variant/30 text-md-on-surface shadow-xs'
                                    : 'opacity-20 pointer-events-none border-transparent text-md-on-surface-variant'
                            }`}
                        >
                            <Icon name="restart_alt" className="text-lg" />
                            <span className="text-[9px] font-bold tracking-tighter uppercase -mt-0.5">
                                Reset
                            </span>
                        </button>
                    </div>
                </div>

                {/* 3. BOTTOM ACTION BUTTONS: Timer & Tare (50:50 Balanced Grid) */}
                <div className="w-full grid grid-cols-2 gap-4 pt-1">
                    {/* Timer Manual Button */}
                    <button
                        type="button"
                        onClick={handleToggleTimer}
                        className={`py-4 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] cursor-pointer shadow-md-1 border flex items-center justify-center gap-2 select-none ${
                            isTimerRunning
                                ? 'bg-md-secondary-container text-md-on-secondary-container border-md-secondary/40 ring-2 ring-md-secondary/20'
                                : 'bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface border-md-outline-variant/40'
                        }`}
                    >
                        <span>{isTimerRunning ? 'Pause' : timerSeconds > 0 ? 'Resume' : 'Timer'}</span>
                    </button>

                    {/* Tare Button */}
                    <button
                        type="button"
                        onClick={handleTare}
                        className="py-4 rounded-2xl bg-md-primary hover:bg-md-primary/90 text-md-on-primary active:scale-[0.98] font-semibold text-lg transition-all cursor-pointer shadow-md-2 flex items-center justify-center gap-2 select-none"
                    >
                        <span>Tare</span>
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
