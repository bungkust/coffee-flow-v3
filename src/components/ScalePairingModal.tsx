import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Icon } from './Icons';
import { BottomSheet } from './BottomSheet';
import { useScaleStore } from '../features/scale/state/useScaleStore';

interface ScalePairingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConnected?: () => void;
    onSkip?: () => void;
}

export const ScalePairingModal: React.FC<ScalePairingModalProps> = ({
    isOpen,
    onClose,
    onConnected,
    onSkip,
}) => {
    const {
        connectionState,
        availableDevices,
        errorMessage,
        startScan,
        stopScan,
        connectDevice,
        connectMock,
    } = useScaleStore();

    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        // Only trigger BLE scan automatically on native mobile
        if (isOpen && isNative) {
            const store = useScaleStore.getState();
            if (store.connectionState === 'disconnected') {
                store.startScan();
            }
            return () => {
                if (useScaleStore.getState().connectionState === 'scanning') {
                    useScaleStore.getState().stopScan();
                }
            };
        }
    }, [isOpen, isNative]);

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} label="Connect smart scale">
            {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-md-primary-container text-md-on-primary-container flex items-center justify-center shrink-0 shadow-xs">
                            <Icon name="scale" className="text-2xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <div>
                            <h3 className="typescale-title-medium font-bold text-md-on-surface leading-tight">
                                Hubungkan Timbangan
                            </h3>
                            <p className="typescale-body-small text-md-on-surface-variant mt-0.5">
                                Timemore Dot & Smart Scale
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="size-9 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest active:scale-95 transition-all cursor-pointer shrink-0"
                        aria-label="Tutup"
                    >
                        <Icon name="close" className="text-xl" />
                    </button>
                </div>

                {/* Content Section */}
                <div className="space-y-4">
                    {/* CASE 1: Web Preview Simulator (Non-Native) */}
                    {!isNative ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-md-surface-container border border-md-outline-variant/30 space-y-2">
                                <div className="flex items-center gap-2 text-md-primary font-bold text-xs uppercase tracking-wider">
                                    <Icon name="devices" className="text-base" />
                                    <span>Web Simulator</span>
                                </div>
                                <p className="typescale-body-small text-md-on-surface-variant leading-relaxed">
                                    Koneksi Bluetooth BLE aktif pada aplikasi mobile APK. Di browser web, Anda dapat menggunakan <b>Demo Mode</b> untuk simulasi data timbangan.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    connectMock();
                                    onConnected?.();
                                    onClose();
                                }}
                                className="w-full py-3.5 px-4 rounded-full font-bold typescale-label-large bg-md-primary text-md-on-primary hover:bg-md-primary/90 transition-all active:scale-[0.98] shadow-md-1 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Icon name="play_arrow" className="text-xl" />
                                <span>Gunakan Demo Mode</span>
                            </button>

                            {onSkip && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSkip();
                                        onClose();
                                    }}
                                    className="w-full py-2.5 rounded-full font-semibold typescale-label-medium text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container transition-all active:scale-[0.98] cursor-pointer text-center"
                                >
                                    Lanjut Masuk Tanpa Timbangan
                                </button>
                            )}
                        </div>
                    ) : (
                        /* CASE 2: Native Android Mobile (APK) */
                        <div className="space-y-3 min-h-[160px] flex flex-col justify-center">
                            {/* Scanning State */}
                            {connectionState === 'scanning' && availableDevices.length === 0 && (
                                <div className="text-center py-6 space-y-3">
                                    <div className="relative size-14 mx-auto flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full bg-md-primary/20 animate-ping opacity-75"></div>
                                        <div className="size-12 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center shadow-xs">
                                            <Icon name="bluetooth_searching" className="text-2xl animate-pulse" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="typescale-body-medium text-md-on-surface font-bold">
                                            Mencari timbangan sekitar...
                                        </p>
                                        <p className="typescale-body-small text-md-on-surface-variant/80 text-xs mt-1">
                                            Nyalakan Timemore Dot dan dekatkan ke perangkat.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Connecting State */}
                            {connectionState === 'connecting' && (
                                <div className="text-center py-6 space-y-3">
                                    <div className="size-12 rounded-full border-3 border-md-primary border-t-transparent animate-spin mx-auto"></div>
                                    <p className="typescale-body-medium text-md-on-surface font-bold">
                                        Menghubungkan ke timbangan...
                                    </p>
                                </div>
                            )}

                            {/* Discovered Devices List */}
                            {availableDevices.length > 0 && (
                                <div className="space-y-2">
                                    <span className="typescale-label-small font-bold text-md-on-surface-variant uppercase tracking-wider">
                                        Timbangan Ditemukan ({availableDevices.length})
                                    </span>
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {availableDevices.map((dev) => (
                                            <button
                                                key={dev.id}
                                                type="button"
                                                onClick={async () => {
                                                    await connectDevice(dev);
                                                    if (useScaleStore.getState().connectionState === 'connected') {
                                                        onConnected?.();
                                                        onClose();
                                                    }
                                                }}
                                                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-md-surface-container hover:bg-md-surface-container-highest border border-md-outline-variant/30 hover:border-md-primary/50 transition-all text-left group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-xl bg-md-primary/10 text-md-primary flex items-center justify-center shrink-0">
                                                        <Icon name="scale" className="text-lg" />
                                                    </div>
                                                    <div>
                                                        <div className="typescale-title-small font-bold text-md-on-surface group-hover:text-md-primary transition-colors">
                                                            {dev.name || 'Timemore Scale'}
                                                        </div>
                                                        <div className="typescale-body-small text-md-on-surface-variant/70 text-xs font-mono">
                                                            {dev.id.slice(0, 16)}...
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="typescale-label-small font-bold px-3 py-1.5 rounded-full bg-md-primary text-md-on-primary shadow-xs">
                                                    Sambungkan
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Real Error Message (when scanning on native fails) */}
                            {errorMessage && (
                                <div className="p-3.5 rounded-2xl bg-md-error-container/40 border border-md-error/30 text-md-on-error-container text-xs flex items-start gap-2.5">
                                    <Icon name="error" className="text-base text-md-error shrink-0 mt-0.5" />
                                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                                </div>
                            )}

                            {/* Native Action Buttons (Symmetrical Grid) */}
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-md-outline-variant/20">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-3 px-4 rounded-full typescale-label-large font-bold bg-md-surface-container-highest hover:bg-md-surface-container-highest/80 text-md-on-surface border border-md-outline-variant/30 transition-all active:scale-95 cursor-pointer text-center"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => connectionState === 'scanning' ? stopScan() : startScan()}
                                    className="w-full py-3 px-4 rounded-full typescale-label-large font-bold bg-md-primary text-md-on-primary hover:bg-md-primary/90 transition-all active:scale-95 cursor-pointer text-center shadow-md-1"
                                >
                                    {connectionState === 'scanning' ? 'Hentikan' : 'Cari Ulang'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
        </BottomSheet>
    );
};
