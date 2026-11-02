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

export interface IBleScaleAdapter {
    isAvailable(): Promise<boolean>;
    requestPermissions(): Promise<boolean>;
    startScan(onDiscovered: (device: ScaleDevice) => void): Promise<void>;
    stopScan(): Promise<void>;
    connect(
        deviceId: string,
        onData: (data: DataView) => void,
        onDisconnect: () => void
    ): Promise<void>;
    disconnect(): Promise<void>;
    send(data: Uint8Array): Promise<void>;
}

/**
 * Capacitor BLE Implementation (Native Android / iOS)
 */
class CapacitorBleAdapter implements IBleScaleAdapter {
    private connectedDeviceId: string | null = null;
    private isInitialized = false;

    private async ensureInit(): Promise<void> {
        if (!this.isInitialized) {
            await BleClient.initialize();
            this.isInitialized = true;
        }
    }

    async isAvailable(): Promise<boolean> {
        return Capacitor.isNativePlatform();
    }

    async requestPermissions(): Promise<boolean> {
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
            { services: [TIMEMORE_SERVICE_UUID] },
            (result: ScanResult) => {
                const name = result.localName || result.device.name || 'Timemore Scale';
                onDiscovered({
                    id: result.device.deviceId,
                    name,
                    rssi: result.rssi
                });
            }
        );
    }

    async stopScan(): Promise<void> {
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
        if (this.connectedDeviceId) {
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

class NoopBleAdapter implements IBleScaleAdapter {
    async isAvailable(): Promise<boolean> { return false; }
    async requestPermissions(): Promise<boolean> { return false; }
    async startScan(): Promise<void> { throw new Error('BLE scale scanning is only available on native mobile.'); }
    async stopScan(): Promise<void> {}
    async connect(): Promise<void> { throw new Error('BLE scale connection is only available on native mobile.'); }
    async disconnect(): Promise<void> {}
    async send(): Promise<void> {}
}

let adapterInstance: IBleScaleAdapter | null = null;

export function getBleScaleAdapter(): IBleScaleAdapter {
    if (!adapterInstance) {
        adapterInstance = Capacitor.isNativePlatform() ? new CapacitorBleAdapter() : new NoopBleAdapter();
    }
    return adapterInstance;
}
