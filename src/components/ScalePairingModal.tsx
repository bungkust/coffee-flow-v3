import React, { useEffect } from 'react';
import { Icon } from './Icons';
import { useScaleStore } from '../features/scale/state/useScaleStore';

interface ScalePairingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ScalePairingModal: React.FC<ScalePairingModalProps> = ({ isOpen, onClose }) => {
    const {
        connectionState,
        availableDevices,
        errorMessage,
        startScan,
        stopScan,
        connectDevice,
    } = useScaleStore();

    useEffect(() => {
        if (isOpen && connectionState === 'disconnected') {
            startScan();
        }
        return () => {
            if (isOpen && connectionState === 'scanning') {
                stopScan();
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-3xl p-6 w-full max-w-sm shadow-md-3 space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="size-10 rounded-full bg-md-primary/10 text-md-primary flex items-center justify-center">
                            <Icon name="scale" className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="typescale-title-medium font-bold text-md-on-surface">
                                Connect Timemore Scale
                            </h3>
                            <p className="typescale-body-small text-md-on-surface-variant">
                                Bluetooth Smart Scale
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="size-8 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-high transition-colors"
                    >
                        <Icon name="close" className="text-lg" />
                    </button>
                </div>

                {/* Status / Devices List */}
                <div className="space-y-3 min-h-[140px] flex flex-col justify-center">
                    {connectionState === 'scanning' && availableDevices.length === 0 && (
                        <div className="text-center py-6 space-y-3">
                            <div className="size-12 rounded-full border-2 border-md-primary border-t-transparent animate-spin mx-auto"></div>
                            <p className="typescale-body-medium text-md-on-surface-variant">
                                Scanning for nearby scales...
                            </p>
                            <p className="typescale-body-small text-md-on-surface-variant/70 text-xs">
                                Ensure your Timemore Dot is powered on and within range.
                            </p>
                        </div>
                    )}

                    {connectionState === 'connecting' && (
                        <div className="text-center py-6 space-y-3">
                            <div className="size-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto"></div>
                            <p className="typescale-body-medium text-md-on-surface font-bold">
                                Connecting to scale...
                            </p>
                        </div>
                    )}

                    {availableDevices.length > 0 && (
                        <div className="space-y-2">
                            <span className="typescale-label-small font-bold text-md-on-surface-variant uppercase tracking-wider">
                                Discovered Scales
                            </span>
                            <div className="space-y-2 max-h-52 overflow-y-auto">
                                {availableDevices.map((dev) => (
                                    <button
                                        key={dev.id}
                                        type="button"
                                        onClick={async () => {
                                            await connectDevice(dev);
                                            onClose();
                                        }}
                                        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-md-surface-container-high hover:bg-md-primary/10 border border-md-outline-variant/30 hover:border-md-primary/50 transition-all text-left group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon name="scale" className="text-xl text-md-primary" />
                                            <div>
                                                <div className="typescale-title-small font-bold text-md-on-surface group-hover:text-md-primary transition-colors">
                                                    {dev.name || 'Timemore Scale'}
                                                </div>
                                                <div className="typescale-body-small text-md-on-surface-variant/70 text-xs font-mono">
                                                    {dev.id.slice(0, 16)}...
                                                </div>
                                            </div>
                                        </div>
                                        <span className="typescale-label-small font-bold px-2.5 py-1 rounded-full bg-md-primary text-md-on-primary">
                                            Connect
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                            <Icon name="error" className="text-base shrink-0 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-md-outline-variant/20">
                    <button
                        type="button"
                        onClick={() => {
                            if (connectionState === 'scanning') {
                                stopScan();
                            } else {
                                startScan();
                            }
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface typescale-label-medium transition-colors"
                    >
                        {connectionState === 'scanning' ? 'Stop Scanning' : 'Rescan'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2.5 px-4 rounded-xl font-bold text-md-on-surface-variant hover:text-md-on-surface typescale-label-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
