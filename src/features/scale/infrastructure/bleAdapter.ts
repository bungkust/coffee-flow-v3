import { Capacitor } from '@capacitor/core';
import { BleClient, type BleDevice as CapBleDevice } from '@capacitor-community/bluetooth-le';

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
 * Web Bluetooth API Implementation (For Chrome on Desktop / Android)
 */
class WebBluetoothAdapter implements IBleScaleAdapter {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
    private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
    private onDisconnectCallback: (() => void) | null = null;

    async isAvailable(): Promise<boolean> {
        return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    }

    async requestPermissions(): Promise<boolean> {
        return true;
    }

    async startScan(onDiscovered: (device: ScaleDevice) => void): Promise<void> {
        if (!navigator.bluetooth) throw new Error('Web Bluetooth not supported in this browser');
        try {
            // Web Bluetooth requires user gesture and opens browser device picker
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'TIMEMORE' },
                    { namePrefix: 'DOT' },
                    { namePrefix: 'TES' },
                    { services: [0xFFF0] }
                ],
                optionalServices: [0xFFF0, 0x180A]
            });
            onDiscovered({
                id: device.id,
                name: device.name || 'Timemore Scale'
            });
        } catch (err: unknown) {
            const error = err as Error;
            if (error.name !== 'NotFoundError') {
                throw error;
            }
        }
    }

    async stopScan(): Promise<void> {
        // Web Bluetooth scans via modal picker
    }

    async connect(
        deviceId: string,
        onData: (data: DataView) => void,
        onDisconnect: () => void
    ): Promise<void> {
        this.onDisconnectCallback = onDisconnect;

        // If we don't have the device instance yet (e.g. from picker), request it
        if (!this.device || this.device.id !== deviceId) {
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'TIMEMORE' },
                    { namePrefix: 'DOT' },
                    { services: [0xFFF0] }
                ],
                optionalServices: [0xFFF0, 0x180A]
            });
        }

        this.device.addEventListener('gattserverdisconnected', () => {
            this.server = null;
            this.notifyChar = null;
            this.writeChar = null;
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        const server = await this.device.gatt?.connect();
        if (!server) throw new Error('Could not connect to GATT Server');
        this.server = server;

        const service = await server.getPrimaryService(0xFFF0);
        const notifyChar = await service.getCharacteristic(0xFFF1);
        const writeChar = await service.getCharacteristic(0xFFF2);

        this.notifyChar = notifyChar;
        this.writeChar = writeChar;

        await notifyChar.startNotifications();
        notifyChar.addEventListener('characteristicvaluechanged', (e: Event) => {
            const target = e.target as unknown as { value?: DataView };
            if (target && target.value) {
                onData(target.value);
            }
        });
    }

    async disconnect(): Promise<void> {
        if (this.server && this.server.connected) {
            this.server.disconnect();
        }
        this.server = null;
        this.device = null;
    }

    async send(data: Uint8Array): Promise<void> {
        if (!this.writeChar) throw new Error('Not connected to write characteristic');
        await this.writeChar.writeValueWithoutResponse(data);
    }
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
            {
                services: [TIMEMORE_SERVICE_UUID]
            },
            (result: CapBleDevice) => {
                const name = result.name || result.device?.name || 'Timemore Scale';
                onDiscovered({
                    id: result.deviceId,
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

// Factory function
let adapterInstance: IBleScaleAdapter | null = null;

export function getBleScaleAdapter(): IBleScaleAdapter {
    if (!adapterInstance) {
        if (Capacitor.isNativePlatform()) {
            adapterInstance = new CapacitorBleAdapter();
        } else {
            adapterInstance = new WebBluetoothAdapter();
        }
    }
    return adapterInstance;
}
