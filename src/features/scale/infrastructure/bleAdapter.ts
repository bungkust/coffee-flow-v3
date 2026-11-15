import { Capacitor } from '@capacitor/core';
import { BleClient, type ScanResult } from '@capacitor-community/bluetooth-le';

// Timemore 16-bit UUIDs in standard 128-bit BLE format
export const TIMEMORE_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
export const TIMEMORE_NOTIFY_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
export const TIMEMORE_WRITE_CHAR_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';

export interface ScaleDevice {
    id: string;
    name: string;
    rssi?: number;
}

export class BleScaleAdapter {
    private connectedDeviceId: string | null = null;
    private isInitialized = false;

    private async ensureInit(): Promise<void> {
        if (!Capacitor.isNativePlatform()) throw new Error('BLE scale is only available on native mobile.');
        if (!this.isInitialized) {
            await BleClient.initialize();
            this.isInitialized = true;
        }
    }

    async isAvailable(): Promise<boolean> {
        return Capacitor.isNativePlatform();
    }

    async requestPermissions(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            await this.ensureInit();
            return true;
        } catch {
            return false;
        }
    }

    async startScan(onDiscovered: (device: ScaleDevice) => void): Promise<void> {
        await this.ensureInit();
        await BleClient.requestLEScan(
            { allowDuplicates: false },
            (result: ScanResult) => {
                const name = result.localName || result.device.name || '';
                const services = (result.uuids || []).map((s: string) => s.toLowerCase());
                const isTimemoreService = services.includes(TIMEMORE_SERVICE_UUID.toLowerCase()) || services.some((s: string) => s.includes('fff0'));
                const isScaleName = /timemore|black\s*mirror|tes\d+|coffee|scale/i.test(name);

                if (isTimemoreService || isScaleName) {
                    onDiscovered({
                        id: result.device.deviceId,
                        name: name || 'Timemore Scale',
                        rssi: result.rssi
                    });
                }
            }
        );
    }

    async stopScan(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        await this.ensureInit();
        await BleClient.stopLEScan();
    }

    async connect(
        deviceId: string,
        onData: (data: DataView) => void,
        onDisconnect: () => void
    ): Promise<void> {
        await this.ensureInit();
        await BleClient.connect(deviceId, () => {
            this.connectedDeviceId = null;
            onDisconnect();
        });
        this.connectedDeviceId = deviceId;

        await BleClient.startNotifications(
            deviceId,
            TIMEMORE_SERVICE_UUID,
            TIMEMORE_NOTIFY_CHAR_UUID,
            (value: DataView) => {
                onData(value);
            }
        );
    }

    async disconnect(): Promise<void> {
        if (this.connectedDeviceId && Capacitor.isNativePlatform()) {
            await BleClient.disconnect(this.connectedDeviceId);
            this.connectedDeviceId = null;
        }
    }

    async send(data: Uint8Array): Promise<void> {
        if (!this.connectedDeviceId) throw new Error('Scale not connected');
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        await BleClient.writeWithoutResponse(
            this.connectedDeviceId,
            TIMEMORE_SERVICE_UUID,
            TIMEMORE_WRITE_CHAR_UUID,
            view
        );
    }
}

const adapterInstance = new BleScaleAdapter();

export function getBleScaleAdapter(): BleScaleAdapter {
    return adapterInstance;
}
