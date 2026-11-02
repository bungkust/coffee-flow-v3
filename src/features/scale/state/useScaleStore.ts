import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { getBleScaleAdapter, type ScaleDevice } from '../infrastructure/bleAdapter';
import {
    parseTimemorePacket,
    buildTareCommand,
    buildBatteryQueryCommand,
} from '../protocol/timemoreProtocol';

export type ScaleConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

export interface CurvePoint {
    time: number;
    weight: number;
    flowRate: number;
}

interface ScaleState {
    connectionState: ScaleConnectionState;
    device: ScaleDevice | null;
    isMock: boolean;
    currentWeight: number;
    flowRate: number;
    batteryPercent: number;
    batteryBars: number;
    isOverload: boolean;
    availableDevices: ScaleDevice[];
    errorMessage: string | null;
    curveData: CurvePoint[];

    // Actions
    startScan: () => Promise<void>;
    stopScan: () => Promise<void>;
    connectDevice: (device: ScaleDevice) => Promise<void>;
    connectMock: () => void;
    setMockWeight: (weight: number, flowRate?: number) => void;
    disconnect: () => Promise<void>;
    tare: () => Promise<void>;
    recordCurvePoint: (timeSeconds: number) => void;
}

const STORAGE_LAST_SCALE_ID = 'coffee_flow_last_scale_id';
const STORAGE_LAST_SCALE_NAME = 'coffee_flow_last_scale_name';

export const useScaleStore = create<ScaleState>((set, get) => ({
    connectionState: 'disconnected',
    device: null,
    isMock: false,
    currentWeight: 0,
    flowRate: 0,
    batteryPercent: 100,
    batteryBars: 4,
    isOverload: false,
    availableDevices: [],
    errorMessage: null,
    curveData: [],

    connectMock: () => {
        // Block mock scale on native mobile APK
        if (Capacitor.isNativePlatform()) return;
        set({
            connectionState: 'connected',
            device: { id: 'mock-timemore-dot', name: 'TIMEMORE_Dot (Demo)' },
            isMock: true,
            batteryPercent: 100,
            batteryBars: 4,
            currentWeight: 0,
            flowRate: 0,
            errorMessage: null,
        });
    },

    setMockWeight: (weight: number, flowRate = 0) => {
        if (Capacitor.isNativePlatform() || !get().isMock) return;
        set({
            currentWeight: Math.round(weight * 10) / 10,
            flowRate: Math.round(flowRate * 10) / 10,
        });
    },

    startScan: async () => {
        const adapter = getBleScaleAdapter();
        set({ connectionState: 'scanning', errorMessage: null, availableDevices: [] });
        try {
            await adapter.startScan((device) => {
                set((state) => {
                    const exists = state.availableDevices.some((d) => d.id === device.id);
                    if (exists) return state;
                    return { availableDevices: [...state.availableDevices, device] };
                });
            });
        } catch (error: unknown) {
            const err = error as Error;
            set({ connectionState: 'error', errorMessage: err.message || 'Scan failed' });
        }
    },

    stopScan: async () => {
        const adapter = getBleScaleAdapter();
        try {
            await adapter.stopScan();
        } catch {
            // Ignore
        }
        if (get().connectionState === 'scanning') {
            set({ connectionState: 'disconnected' });
        }
    },

    connectDevice: async (device: ScaleDevice) => {
        const adapter = getBleScaleAdapter();
        set({ connectionState: 'connecting', errorMessage: null });

        try {
            await adapter.connect(
                device.id,
                (dataView) => {
                    const packet = parseTimemorePacket(dataView);
                    if (!packet) return;

                    if (packet.type === 'weight_stream') {
                        set({
                            currentWeight: packet.weight,
                            flowRate: packet.flowRate,
                            isOverload: packet.isOverload,
                        });
                    } else if (packet.type === 'battery') {
                        set({
                            batteryBars: packet.bars,
                            batteryPercent: packet.percentage,
                        });
                    }
                },
                () => {
                    // On disconnect callback
                    set({
                        connectionState: 'disconnected',
                        device: null,
                        currentWeight: 0,
                        flowRate: 0,
                    });
                }
            );

            // Connected successfully
            set({
                connectionState: 'connected',
                device,
                errorMessage: null,
            });

            // Persist last paired device
            try {
                localStorage.setItem(STORAGE_LAST_SCALE_ID, device.id);
                localStorage.setItem(STORAGE_LAST_SCALE_NAME, device.name);
            } catch {
                // Ignore storage error
            }

            // Query initial battery status
            try {
                await adapter.send(buildBatteryQueryCommand());
            } catch {
                // Ignore
            }
        } catch (error: unknown) {
            const err = error as Error;
            set({
                connectionState: 'error',
                errorMessage: err.message || 'Connection failed',
                device: null,
            });
        }
    },

    disconnect: async () => {
        if (!get().isMock) {
            const adapter = getBleScaleAdapter();
            try {
                await adapter.disconnect();
            } catch {
                // Ignore
            }
        }
        set({
            connectionState: 'disconnected',
            device: null,
            isMock: false,
            currentWeight: 0,
            flowRate: 0,
            errorMessage: null,
        });
    },

    tare: async () => {
        if (get().isMock) {
            set({ currentWeight: 0, flowRate: 0 });
            return;
        }
        const adapter = getBleScaleAdapter();
        if (get().connectionState !== 'connected') return;
        try {
            await adapter.send(buildTareCommand());
            set({ currentWeight: 0 });
        } catch (error: unknown) {
            console.warn('Tare failed', error);
        }
    },

    recordCurvePoint: (timeSeconds: number) => {
        const { currentWeight, flowRate, curveData } = get();
        // Prevent recording duplicates within same second
        const last = curveData[curveData.length - 1];
        if (last && last.time === timeSeconds) {
            return;
        }
        set({
            curveData: [
                ...curveData,
                {
                    time: timeSeconds,
                    weight: currentWeight,
                    flowRate,
                },
            ],
        });
    },
}));

