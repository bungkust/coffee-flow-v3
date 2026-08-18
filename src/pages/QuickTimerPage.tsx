import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
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
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        aria-label="Go back"
                    >
                        <Icon name="arrow_back" className="text-2xl" />
                    </button>
                    <h1 className="typescale-headline-small font-bold text-md-on-surface">Quick Timer</h1>
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
                <div className="typescale-display-large text-7xl font-extrabold tabular-nums tracking-tight text-md-primary mb-8 bg-md-surface-container-low px-8 py-6 rounded-3xl border border-md-outline-variant/30 shadow-md-1">
                    {formatDuration(remaining)}
                </div>

                <div className="grid w-full grid-cols-3 gap-3">
                    {[120, 180, 240].map((preset) => (
                        <button
                            key={preset}
                            onClick={() => setPreset(preset)}
                            className={`rounded-2xl py-3.5 typescale-title-small font-bold transition-all cursor-pointer border ${
                                seconds === preset
                                    ? 'bg-md-secondary-container text-md-on-secondary-container border-md-primary shadow-sm'
                                    : 'bg-md-surface-container-low text-md-on-surface-variant border-md-outline-variant/30 hover:bg-md-surface-container-high'
                            }`}
                        >
                            {formatDuration(preset)}
                        </button>
                    ))}
                </div>
            </main>

            <div className="border-t border-md-outline-variant/20 p-5 space-y-3 bg-md-surface/95 backdrop-blur-md">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={handlePrimaryAction}
                    className="w-full"
                >
                    {running ? 'Pause' : remaining === 0 ? 'Restart' : 'Start'}
                </Button>
                <button
                    onClick={() => { setRunning(false); setRemaining(seconds); }}
                    className="w-full rounded-full py-3 typescale-label-large font-bold text-md-on-surface-variant bg-md-surface-container-high hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};
