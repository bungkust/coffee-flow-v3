import React, { useState } from 'react';
import { Icon } from './Icons';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { ScalePairingModal } from './ScalePairingModal';

interface ScaleConnectPillProps {
    className?: string;
}

export const ScaleConnectPill: React.FC<ScaleConnectPillProps> = ({ className = '' }) => {
    const { connectionState, device, batteryPercent, tare, disconnect } = useScaleStore();
    const [isPairingOpen, setIsPairingOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleClick = () => {
        if (connectionState === 'connected') {
            setIsSheetOpen(true);
        } else {
            setIsPairingOpen(true);
        }
    };

    const getBatteryIcon = (pct: number) => {
        if (pct >= 85) return 'battery_full';
        if (pct >= 60) return 'battery_6_bar';
        if (pct >= 35) return 'battery_4_bar';
        if (pct >= 15) return 'battery_2_bar';
        return 'battery_alert';
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full typescale-label-small font-bold transition-all cursor-pointer ${
                    connectionState === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : connectionState === 'connecting' || connectionState === 'scanning'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                        : 'bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface border border-md-outline-variant/30 hover:bg-md-surface-container-highest'
                } ${className}`}
                title={connectionState === 'connected' ? 'Scale connected — tap for options' : 'Connect scale'}
            >
                <Icon
                    name={connectionState === 'connected' ? 'scale' : 'bluetooth'}
                    className="text-sm shrink-0"
                />
                <span className="truncate max-w-[120px]">
                    {connectionState === 'connected'
                        ? device?.name || 'Timemore Dot'
                        : connectionState === 'connecting'
                        ? 'Connecting...'
                        : 'Connect Scale'}
                </span>
                {connectionState === 'connected' && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] opacity-80 shrink-0">
                        <Icon name={getBatteryIcon(batteryPercent)} className="text-xs" />
                        <span className="tabular-nums">{batteryPercent}%</span>
                    </span>
                )}
            </button>

            {/* Pairing Modal */}
            <ScalePairingModal
                isOpen={isPairingOpen}
                onClose={() => setIsPairingOpen(false)}
            />

            {/* Quick Connected Options Sheet / Modal */}
            {isSheetOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsSheetOpen(false)}
                >
                    <div
                        className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-3xl p-5 w-full max-w-xs shadow-md-3 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="size-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <Icon name="scale" className="text-xl" />
                                </div>
                                <div>
                                    <h4 className="typescale-title-small font-bold text-md-on-surface">
                                        {device?.name || 'Timemore Scale'}
                                    </h4>
                                    <p className="typescale-body-small text-emerald-400 flex items-center gap-1 font-semibold">
                                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Connected • {batteryPercent}%
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSheetOpen(false)}
                                className="size-8 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-high transition-colors"
                            >
                                <Icon name="close" className="text-lg" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    tare();
                                    setIsSheetOpen(false);
                                }}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-md-primary/10 hover:bg-md-primary/20 text-md-primary border border-md-primary/30 font-bold transition-all cursor-pointer"
                            >
                                <Icon name="restart_alt" className="text-2xl" />
                                <span className="typescale-label-medium">Tare (0.0g)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    disconnect();
                                    setIsSheetOpen(false);
                                }}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold transition-all cursor-pointer"
                            >
                                <Icon name="bluetooth_disabled" className="text-2xl" />
                                <span className="typescale-label-medium">Disconnect</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
