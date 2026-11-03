import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { ScalePairingModal } from '../components/ScalePairingModal';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { useWakeLock } from '../shared/hooks/useWakeLock';
import { useSafeBack } from '../shared/utils/backNavigation';

const TARGET_PRESETS = [15, 18, 20, 250, 300];

export const ScalePage: React.FC = () => {
    const safeBack = useSafeBack();
    const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
    const [targetWeight, setTargetWeight] = useState<number | null>(null);

    // Stopwatch state for timing pours/extractions
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerMs, setTimerMs] = useState(0);
    const timerStartRef = useRef(0);
    const timerAccumRef = useRef(0);

    // Scale store
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
        setMockWeight,
    } = useScaleStore();

    // Keep screen awake while on the scale page
    useWakeLock(true);

    // Timer loop
    useEffect(() => {
        if (!timerRunning) return;
        let frameId = 0;
        const tick = () => {
            setTimerMs(timerAccumRef.current + (Date.now() - timerStartRef.current));
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [timerRunning]);

    const toggleTimer = () => {
        if (timerRunning) {
            timerAccumRef.current += Date.now() - timerStartRef.current;
            setTimerMs(timerAccumRef.current);
            setTimerRunning(false);
        } else {
            timerStartRef.current = Date.now();
            setTimerRunning(true);
        }
    };

    const resetTimer = () => {
        timerAccumRef.current = 0;
        setTimerMs(0);
        setTimerRunning(false);
    };

    const formatTimer = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const tenths = Math.floor((ms % 1000) / 100);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
    };

    const handleTare = async () => {
        if ('vibrate' in navigator) navigator.vibrate(30);
        await tare();
    };

    const isConnected = connectionState === 'connected';

    // Target calculation
    const isTargetSet = targetWeight !== null && targetWeight > 0;
    const diff = isTargetSet ? currentWeight - targetWeight : 0;
    const isTargetReached = isTargetSet && Math.abs(diff) <= 0.3;
    const isTargetExceeded = isTargetSet && diff > 0.3;

    return (
        <div className="min-h-screen bg-md-surface flex flex-col justify-between pb-8 select-none">
            {/* Header */}
            <PageHeader
                title="Smart Scale"
                subtitle="Timemore Dot & Digital Scale"
                onBack={() => safeBack('/brew-methods')}
                action={
                    <button
                        onClick={() => setIsPairingModalOpen(true)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isConnected
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-md-primary/10 text-md-primary border border-md-primary/20 hover:bg-md-primary/20'
                        }`}
                    >
                        <span className={`size-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-md-outline'}`} />
                        {isConnected ? (device?.name || 'Connected') : 'Connect'}
                    </button>
                }
            />

            <main className="flex-1 max-w-lg w-full mx-auto px-5 py-3 flex flex-col justify-between gap-6">
                {/* Scale Connection Status Card */}
                <div className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl p-3.5 flex items-center justify-between shadow-md-1">
                    <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl flex items-center justify-center font-bold ${
                            isConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-md-surface-container-high text-md-on-surface-variant'
                        }`}>
                            <Icon name="scale" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="typescale-label-large font-bold text-md-on-surface">
                                    {isConnected ? (device?.name || 'Timemore Scale') : 'Scale Disconnected'}
                                </span>
                                {isConnected && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                        Active
                                    </span>
                                )}
                            </div>
                            <span className="typescale-body-small text-md-on-surface-variant">
                                {isConnected
                                    ? isMock
                                        ? 'Demo mode active'
                                        : `Battery: ${batteryPercent}%`
                                    : 'Connect Timemore Dot via Bluetooth'}
                            </span>
                        </div>
                    </div>

                    {isConnected ? (
                        <button
                            onClick={disconnect}
                            className="text-xs text-md-error font-medium px-3 py-1.5 rounded-lg hover:bg-md-error/10 transition-colors"
                        >
                            Disconnect
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsPairingModalOpen(true)}
                            className="typescale-label-medium font-semibold text-md-on-primary bg-md-primary px-3.5 py-1.5 rounded-full shadow-md-1 active:scale-95 transition-all"
                        >
                            Pair
                        </button>
                    )}
                </div>

                {/* Overload Alert */}
                {isOverload && (
                    <div className="bg-md-error/10 border border-md-error/30 text-md-error p-3 rounded-2xl flex items-center gap-2 font-medium text-sm animate-bounce">
                        <Icon name="warning" className="text-lg" />
                        Scale overload warning! Maximum weight exceeded.
                    </div>
                )}

                {/* Main Scale Face (Hero Weight Display) */}
                <div className={`relative rounded-3xl p-7 border transition-all duration-300 flex flex-col items-center justify-center shadow-md-2 ${
                    isTargetReached
                        ? 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/50 ring-2 ring-emerald-500/20'
                        : isTargetExceeded
                            ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/40'
                            : 'bg-md-surface-container-lowest border-md-outline-variant/30'
                }`}>
                    {/* Top sub-info: Flow Rate & Target indicator */}
                    <div className="w-full flex items-center justify-between text-xs text-md-on-surface-variant mb-2">
                        <div className="flex items-center gap-1.5 font-medium">
                            <Icon name="water_drop" className="text-sm text-md-primary" />
                            <span>Flow:</span>
                            <span className="font-mono font-bold text-md-on-surface tabular-nums">
                                {flowRate.toFixed(1)} g/s
                            </span>
                        </div>

                        {isTargetSet && (
                            <div className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                                isTargetReached
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : isTargetExceeded
                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                        : 'bg-md-surface-container-high text-md-on-surface-variant'
                            }`}>
                                Target: {targetWeight}g ({diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`}g)
                            </div>
                        )}
                    </div>

                    {/* Massive Weight Readout */}
                    <div className="flex items-baseline justify-center my-4">
                        <span className={`text-7xl sm:text-8xl font-black font-mono tracking-tighter tabular-nums transition-colors ${
                            isTargetReached
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isTargetExceeded
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-md-on-surface'
                        }`}>
                            {currentWeight.toFixed(1)}
                        </span>
                        <span className="text-2xl sm:text-3xl font-bold text-md-on-surface-variant ml-2">
                            g
                        </span>
                    </div>

                    {/* Tare Button */}
                    <button
                        onClick={handleTare}
                        className="mt-2 w-full max-w-xs py-3.5 px-6 rounded-2xl bg-md-surface-container-high hover:bg-md-surface-container-highest active:scale-95 transition-all border border-md-outline-variant/40 flex items-center justify-center gap-2 font-bold text-md-on-surface shadow-md-1 cursor-pointer"
                    >
                        <Icon name="replay" className="text-xl" />
                        <span>TARE / ZERO</span>
                    </button>
                </div>

                {/* Target Dose Presets */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="typescale-label-medium text-md-on-surface-variant font-bold uppercase tracking-wider">
                            Target Dose (Optional)
                        </span>
                        {targetWeight !== null && (
                            <button
                                onClick={() => setTargetWeight(null)}
                                className="text-xs text-md-primary font-medium hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {TARGET_PRESETS.map((preset) => {
                            const isSelected = targetWeight === preset;
                            return (
                                <button
                                    key={preset}
                                    onClick={() => setTargetWeight(isSelected ? null : preset)}
                                    className={`flex-1 min-w-[54px] py-2 px-3 rounded-xl font-bold text-sm transition-all border ${
                                        isSelected
                                            ? 'bg-md-primary text-md-on-primary border-md-primary shadow-md-1'
                                            : 'bg-md-surface-container-low text-md-on-surface border-md-outline-variant/30 hover:bg-md-surface-container-high'
                                    }`}
                                >
                                    {preset}g
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Built-in Stopwatch Timer */}
                <div className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl p-4 flex items-center justify-between shadow-md-1">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-md-primary-container text-md-on-primary-container flex items-center justify-center font-bold">
                            <Icon name="timer" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div>
                            <span className="typescale-label-small text-md-on-surface-variant uppercase font-bold tracking-wider block">
                                Extraction Timer
                            </span>
                            <span className="font-mono text-2xl font-bold text-md-on-surface tabular-nums">
                                {formatTimer(timerMs)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTimer}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md-1 ${
                                timerRunning
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-md-primary text-md-on-primary'
                            }`}
                        >
                            {timerRunning ? 'Pause' : timerMs > 0 ? 'Resume' : 'Start'}
                        </button>
                        {timerMs > 0 && !timerRunning && (
                            <button
                                onClick={resetTimer}
                                className="p-2 rounded-xl bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface"
                                title="Reset Timer"
                            >
                                <Icon name="restart_alt" className="text-xl" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Web Browser Demo Simulation Controls */}
                {!Capacitor.isNativePlatform() && (
                    <div className="p-3 bg-md-surface-container-high/50 border border-dashed border-md-outline-variant/50 rounded-2xl space-y-2">
                        <span className="text-[11px] font-bold text-md-on-surface-variant uppercase tracking-wider block">
                            Browser Demo Controls (Web Simulation)
                        </span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setMockWeight(Math.max(0, currentWeight + 1), 1.2)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-md-surface-container-highest border border-md-outline-variant/40 hover:bg-md-surface"
                            >
                                +1g
                            </button>
                            <button
                                onClick={() => setMockWeight(Math.max(0, currentWeight + 5), 2.5)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-md-surface-container-highest border border-md-outline-variant/40 hover:bg-md-surface"
                            >
                                +5g
                            </button>
                            <button
                                onClick={() => setMockWeight(18.0, 0)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-md-surface-container-highest border border-md-outline-variant/40 hover:bg-md-surface"
                            >
                                18.0g
                            </button>
                            <button
                                onClick={() => setMockWeight(0, 0)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-md-surface-container-highest border border-md-outline-variant/40 hover:bg-md-surface"
                            >
                                Reset 0g
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Bluetooth Pairing Modal */}
            <ScalePairingModal
                isOpen={isPairingModalOpen}
                onClose={() => setIsPairingModalOpen(false)}
            />
        </div>
    );
};
