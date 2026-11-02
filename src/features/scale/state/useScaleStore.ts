import { create } from 'zustand';
import { getBleScaleAdapter, type ScaleDevice } from '../infrastructure/bleAdapter';
import {
    parseTimemorePacket,
    buildTareCommand,
    buildTimerCommand,
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
    currentWeight: number;
    flowRate: number;
    scaleTimer: number;
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
    disconnect: () => Promise<void>;
    tare: () => Promise<void>;
    syncTimer: (action: 'start' | 'pause' | 'reset') => Promise<void>;
    queryBattery: () => Promise<void>;
    recordCurvePoint: (timeSeconds: number) => void;
    clearCurveData: () => void;
    resetState: () => void;
}

const STORAGE_LAST_SCALE_ID = 'coffee_flow_last_scale_id';
const STORAGE_LAST_SCALE_NAME = 'coffee_flow_last_scale_name';

export const useScaleStore = create<ScaleState>((set, get) => ({
    connectionState: 'disconnected',
    device: null,
    currentWeight: 0,
    flowRate: 0,
    scaleTimer: 0,
    batteryPercent: 100,
    batteryBars: 4,
    isOverload: false,
    availableDevices: [],
    errorMessage: null,
    curveData: [],

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
                            scaleTimer: packet.timer,
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
        const adapter = getBleScaleAdapter();
        try {
            await adapter.disconnect();
        } catch {
            // Ignore
        }
        set({
            connectionState: 'disconnected',
            device: null,
            currentWeight: 0,
            flowRate: 0,
            errorMessage: null,
        });
    },

    tare: async () => {
        const adapter = getBleScaleAdapter();
        if (get().connectionState !== 'connected') return;
        try {
            await adapter.send(buildTareCommand());
            set({ currentWeight: 0 });
        } catch (error: unknown) {
            console.warn('Tare failed', error);
        }
    },

    syncTimer: async (action: 'start' | 'pause' | 'reset') => {
        const adapter = getBleScaleAdapter();
        if (get().connectionState !== 'connected') return;
        try {
            await adapter.send(buildTimerCommand(action));
        } catch (error: unknown) {
            console.warn('Timer sync failed', error);
        }
    },

    queryBattery: async () => {
        const adapter = getBleScaleAdapter();
        if (get().connectionState !== 'connected') return;
        try {
            await adapter.send(buildBatteryQueryCommand());
        } catch {
            // Ignore
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

    clearCurveData: () => {
        set({ curveData: [] });
    },

    resetState: () => {
        set({
            currentWeight: 0,
            flowRate: 0,
            scaleTimer: 0,
            curveData: [],
            errorMessage: null,
        });
    },
}));

