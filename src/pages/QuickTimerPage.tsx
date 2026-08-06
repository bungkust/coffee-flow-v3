import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { formatDuration } from '../shared/utils/brewMath';

export const QuickTimerPage = () => {
    const navigate = useNavigate();
    const [seconds, setSeconds] = useState(180);
    const [remaining, setRemaining] = useState(180);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => {
            setRemaining((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    setRunning(false);
                    if ('vibrate' in navigator) navigator.vibrate([150, 80, 150]);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [running]);

    // Screen Wake Lock API to prevent screen from sleeping during active timer
    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && !wakeLock) {
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('Screen Wake Lock acquired');
                }
            } catch (err) {
                console.warn('Screen Wake Lock request failed:', err);
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLock) {
                try {
                    await wakeLock.release();
                    console.log('Screen Wake Lock released');
                } catch (err) {
                    console.warn('Screen Wake Lock release failed:', err);
                }
                wakeLock = null;
            }
        };

        if (running && remaining > 0) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && running && remaining > 0) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [running, remaining]);

    const handlePrimaryAction = () => {
        if (remaining === 0) {
            setRemaining(seconds);
            setRunning(true);
            return;
        }
        setRunning((current) => !current);
    };

    const setPreset = (value: number) => {
        setSeconds(value);
        setRemaining(value);
        setRunning(false);
    };

    return (
        <div className="flex min-h-screen w-full max-w-md flex-col bg-white font-display text-neutral-text shadow-2xl mx-auto">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 pb-4 pt-12">
                <button onClick={() => navigate(-1)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-50">
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <h1 className="text-xl font-bold">Quick Timer</h1>
            </div>
            <main className="flex flex-1 flex-col items-center justify-center px-6">
                <div className="text-[72px] font-extrabold tabular-nums">{formatDuration(remaining)}</div>
                <div className="mt-8 grid w-full grid-cols-3 gap-3">
                    {[120, 180, 240].map((preset) => (
                        <button key={preset} onClick={() => setPreset(preset)} className={`rounded-xl py-3 text-sm font-bold ${seconds === preset ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500'}`}>
                            {formatDuration(preset)}
                        </button>
                    ))}
                </div>
            </main>
            <div className="border-t border-gray-100 p-6">
                <button onClick={handlePrimaryAction} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white">
                    {running ? 'Pause' : remaining === 0 ? 'Restart' : 'Start'}
                </button>
                <button onClick={() => { setRunning(false); setRemaining(seconds); }} className="mt-3 w-full rounded-2xl bg-gray-50 py-3 font-bold text-gray-500">
                    Reset
                </button>
            </div>
        </div>
    );
};
