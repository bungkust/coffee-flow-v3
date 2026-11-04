import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { ScalePairingModal } from '../components/ScalePairingModal';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { useWakeLock } from '../shared/hooks/useWakeLock';
import { useSafeBack } from '../shared/utils/backNavigation';

export const ScalePage = () => {
    const safeBack = useSafeBack();
    const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);

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

    return (
        <div className="min-h-screen bg-md-surface flex flex-col justify-between pb-8 select-none">
            <PageHeader
                title="Smart Scale"
                subtitle="Timemore Dot & Digital Scale"
                onBack={() => safeBack('/brew-methods')}
            />

            <main className="flex-1 max-w-lg w-full mx-auto px-5 py-4 flex flex-col justify-between gap-6">
                {/* Scale Connection Status Card */}
                <div className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl p-3.5 flex items-center justify-between shadow-md-1">
                    <div className="flex items-center gap-3">
                        <div
                            className={`size-10 rounded-xl flex items-center justify-center font-bold ${
                                isConnected
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-md-surface-container-high text-md-on-surface-variant'
                            }`}
                        >
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
                <div className="relative rounded-3xl p-7 border border-md-outline-variant/30 bg-md-surface-container-lowest transition-all flex flex-col items-center justify-center shadow-md-2">
                    {/* Top sub-info: Flow Rate */}
                    <div className="w-full flex items-center justify-start text-xs text-md-on-surface-variant mb-2">
                        <div className="flex items-center gap-1.5 font-medium">
                            <Icon name="water_drop" className="text-sm text-md-primary" />
                            <span>Flow:</span>
                            <span className="font-mono font-bold text-md-on-surface tabular-nums">
                                {flowRate.toFixed(1)} g/s
                            </span>
                        </div>
                    </div>

                    {/* Massive Weight Readout */}
                    <div className="flex items-baseline justify-center my-6">
                        <span className="text-7xl sm:text-8xl font-black font-mono tracking-tighter tabular-nums text-md-on-surface">
                            {currentWeight.toFixed(1)}
                        </span>
                        <span className="text-2xl sm:text-3xl font-bold text-md-on-surface-variant ml-2">
                            g
                        </span>
                    </div>

                    {/* Tare Button */}
                    <button
                        onClick={() => {
                            navigator.vibrate?.(30);
                            tare();
                        }}
                        className="mt-2 w-full max-w-xs py-3.5 px-6 rounded-2xl bg-md-surface-container-high hover:bg-md-surface-container-highest active:scale-95 transition-all border border-md-outline-variant/40 flex items-center justify-center gap-2 font-bold text-md-on-surface shadow-md-1 cursor-pointer"
                    >
                        <Icon name="replay" className="text-xl" />
                        <span>TARE / ZERO</span>
                    </button>
                </div>
            </main>

            {/* Bluetooth Pairing Modal */}
            <ScalePairingModal
                isOpen={isPairingModalOpen}
                onClose={() => setIsPairingModalOpen(false)}
            />
        </div>
    );
};
