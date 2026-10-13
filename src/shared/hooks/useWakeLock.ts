import { useEffect } from 'react';

/** Holds the Screen Wake Lock while `active`, re-acquiring it when the tab becomes visible again. */
export const useWakeLock = (active: boolean) => {
    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && !wakeLock) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                console.warn('Screen Wake Lock request failed:', err);
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLock) {
                try {
                    await wakeLock.release();
                } catch (err) {
                    console.warn('Screen Wake Lock release failed:', err);
                }
                wakeLock = null;
            }
        };

        if (active) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && active) requestWakeLock();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [active]);
};
