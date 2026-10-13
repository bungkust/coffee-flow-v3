import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useWakeLock } from '../shared/hooks/useWakeLock';

const formatStopwatch = (ms: number): string => {
    const totalHundredths = Math.floor(Math.max(0, ms) / 10);
    const hundredths = totalHundredths % 100;
    const totalSeconds = Math.floor(totalHundredths / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
};

export const QuickTimerPage = () => {
    const navigate = useNavigate();
    const [elapsedMs, setElapsedMs] = useState(0);
    const [running, setRunning] = useState(false);
    const [laps, setLaps] = useState<number[]>([]);
    const startedAtRef = useRef(0);
    const accumulatedRef = useRef(0);

    useEffect(() => {
        if (!running) return;
        let frame = 0;
        const tick = () => {
            setElapsedMs(accumulatedRef.current + (Date.now() - startedAtRef.current));
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [running]);

    // Keep the screen awake while the stopwatch runs
    useWakeLock(running);

    const toggleRun = () => {
        if (running) {
            accumulatedRef.current += Date.now() - startedAtRef.current;
            setElapsedMs(accumulatedRef.current);
            setRunning(false);
        } else {
            startedAtRef.current = Date.now();
            setRunning(true);
        }
    };

    const handleLap = () => {
        if (elapsedMs === 0) return;
        setLaps((prev) => [...prev, elapsedMs]);
        if ('vibrate' in navigator) navigator.vibrate(20);
    };

    const handleReset = () => {
        accumulatedRef.current = 0;
        setElapsedMs(0);
        setRunning(false);
        setLaps([]);
    };

    const display = formatStopwatch(elapsedMs);
    const lapRows = laps
        .map((total, index) => ({ index: index + 1, split: total - (laps[index - 1] ?? 0), total }))
        .reverse();

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Header */}
            <PageHeader title="Quick Timer" onBack={() => navigate(-1)} />

            <main className="flex flex-1 flex-col items-center px-5 py-6 overflow-y-auto">
                <div className="w-full bg-md-surface-container-low px-6 py-6 rounded-3xl border border-md-outline-variant/30 shadow-md-1 mb-6 flex items-baseline justify-center tabular-nums">
                    <span className="typescale-display-large text-6xl font-extrabold tracking-tight text-md-primary">
                        {display.slice(0, 5)}
                    </span>
                    <span className="typescale-headline-small font-bold text-md-primary/50">
                        {display.slice(5)}
                    </span>
                </div>

                {lapRows.length > 0 ? (
                    <div className="w-full">
                        <div className="flex items-center justify-between px-4 pb-2 typescale-label-small font-bold uppercase tracking-wider text-md-on-surface-variant">
                            <span>Lap</span>
                            <span>Split</span>
                            <span>Total</span>
                        </div>
                        <div className="divide-y divide-md-outline-variant/20 rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low overflow-hidden">
                            {lapRows.map((lap) => (
                                <div key={lap.index} className="flex items-center justify-between px-4 py-2.5 tabular-nums">
                                    <span className="typescale-body-medium font-bold text-md-on-surface">#{lap.index}</span>
                                    <span className="typescale-body-medium font-bold text-md-primary">+{formatStopwatch(lap.split)}</span>
                                    <span className="typescale-body-small text-md-on-surface-variant">{formatStopwatch(lap.total)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-center typescale-body-medium text-md-on-surface-variant/70">
                        Tap <b>Lap</b> to record a split while you pour.
                    </p>
                )}
            </main>

            <div className="border-t border-md-outline-variant/20 p-5 space-y-3 bg-md-surface/95 backdrop-blur-md">
                <Button variant="filled" size="lg" onClick={toggleRun} className="w-full">
                    {running ? 'Pause' : elapsedMs > 0 ? 'Resume' : 'Start'}
                </Button>
                <div className="flex gap-3">
                    <Button variant="secondary" size="lg" onClick={handleLap} disabled={elapsedMs === 0} className="flex-1">
                        Lap
                    </Button>
                    <Button variant="ghost" size="lg" onClick={handleReset} disabled={elapsedMs === 0 && laps.length === 0} className="flex-1">
                        Reset
                    </Button>
                </div>
            </div>
        </div>
    );
};
