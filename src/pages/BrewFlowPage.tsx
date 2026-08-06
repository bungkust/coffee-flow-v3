import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { useBrewStore } from '../state/useBrewStore';
import { Modal } from '../components/Modal';
import { settingsService } from '../core/services';
import { formatDuration, getCurrentTargetWeight, getPourAmount, getWaterProgressPercent } from '../shared/utils/brewMath';

export const BrewFlowPage = () => {
    const navigate = useNavigate();
    const { activeRecipe, engineState, stopBrew, pauseBrew, resumeBrew, hydrateBrew } = useBrewStore();

    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    const [feedbackEnabled, setFeedbackEnabled] = useState(true);

    const playFeedback = useCallback((frequency: number, duration: number) => {
        if (!feedbackEnabled) return;
        try {
            const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
            const AudioContextCtor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
            if (!AudioContextCtor) return;
            const context = new AudioContextCtor();
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, context.currentTime);

            gain.gain.setValueAtTime(0.1, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

            oscillator.connect(gain);
            gain.connect(context.destination);

            oscillator.start();
            oscillator.stop(context.currentTime + duration);
        } catch (error) {
            console.warn('Audio feedback failed', error);
        }
    }, [feedbackEnabled]);

    useEffect(() => {
        if (!activeRecipe) {
            const restored = hydrateBrew();
            if (!restored) navigate('/brew-methods');
            return;
        }
    }, [activeRecipe, hydrateBrew, navigate]);

    useEffect(() => {
        settingsService.getTimerFeedbackEnabled()
            .then(setFeedbackEnabled)
            .catch(() => setFeedbackEnabled(true));
    }, []);

    // Screen Wake Lock API to prevent screen from sleeping during active brewing
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

        if (engineState?.isRunning && !engineState?.isCompleted) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && engineState?.isRunning && !engineState?.isCompleted) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [engineState?.isRunning, engineState?.isCompleted]);

    useEffect(() => {
        if (!engineState || !activeRecipe) return;

        // Sound & Haptic Triggers
        if (engineState.isRunning) {
            // Trigger haptic and sound on step completion (remainingTime becomes 0)
            if (engineState.remainingTime === 0 && !engineState.isCompleted) {
                playFeedback(440, 0.2); // Beep
                if ('vibrate' in navigator) navigator.vibrate(200);
            }

            // Trigger feedback on brew completion
            if (engineState.isCompleted) {
                playFeedback(880, 0.5); // Higher pitch long beep
                if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            }

            // Countdown beeps for last 3 seconds
            if (engineState.remainingTime > 0 && engineState.remainingTime <= 3) {
                playFeedback(330, 0.1); // Short low beep
            }
        }
    }, [engineState, activeRecipe, playFeedback]);

    if (!activeRecipe || !engineState) return null;

    const currentStep = activeRecipe.steps[engineState.currentStepIndex];
    if (!currentStep) return null;

    let totalElapsed = 0;
    for (let i = 0; i < engineState.currentStepIndex; i++) {
        totalElapsed += activeRecipe.steps[i].duration_seconds;
    }
    totalElapsed += (engineState.totalTime - engineState.remainingTime);

    const handleBack = () => {
        setIsStopModalOpen(true);
    };

    const confirmStop = () => {
        stopBrew();
        navigate('/brew-methods');
    };

    const totalWaterRecipe = activeRecipe.total_water || 0;
    const currentTargetWeight = getCurrentTargetWeight(activeRecipe.steps, engineState.currentStepIndex);
    const pourAmount = getPourAmount(activeRecipe.steps, engineState.currentStepIndex);
    const progressPercent = getWaterProgressPercent(currentTargetWeight, totalWaterRecipe);
    const stepTitle = currentStep.target_weight && pourAmount > 0
        ? `Pour +${pourAmount}g`
        : currentStep.label;
    const stepSubtitle = currentStep.target_weight && pourAmount > 0
        ? `Target: ${currentStep.target_weight}g on scale — ${currentStep.instruction || currentStep.label}`
        : currentStep.instruction || currentStep.label;

    if (engineState.isCompleted) {
        return (
            <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-white shadow-2xl font-display text-[#181411]">
                {/* Header for Done state */}
                <div className="shrink-0 bg-white/95 backdrop-blur-md pt-12 pb-4 px-6 flex items-center justify-between border-b border-gray-50">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Brewing Method</span>
                        <h1 className="text-lg font-bold text-[#181411]">{activeRecipe.method_id.toUpperCase()} - {activeRecipe.name}</h1>
                    </div>
                </div>

                <div className="flex-1 flex flex-col px-6 py-4 overflow-y-auto hide-scrollbar">
                    {/* Done Card */}
                    <div className="shrink-0 flex flex-col justify-center items-center mb-6 relative">
                        <div className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#34A853]"></div>

                            <div className="w-20 h-20 rounded-full bg-[#F2FAF5] flex items-center justify-center mb-6">
                                <Icon name="emoji_events" className="text-[#34A853] text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                            </div>

                            <h2 className="text-[44px] font-extrabold text-[#181411] mb-2">Done!</h2>
                            <h3 className="text-xl font-bold text-[#181411] mb-2">Enjoy your coffee</h3>
                            <p className="text-gray-600 text-sm mb-12 max-w-[240px]">
                                Great job! Your brew is complete and ready to serve.
                            </p>

                            {/* Final Water Progress */}
                            <div className="w-full">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-semibold text-gray-500">Total Water</span>
                                    <span className="text-lg font-bold text-[#8B5E3C] tabular-nums">
                                        {totalWaterRecipe}g <span className="text-gray-400 font-normal text-sm">/ {totalWaterRecipe}g</span>
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-[#8B5E3C] h-3 rounded-full"
                                        style={{ width: '100%' }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Previous Steps section */}
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Previous Steps</h3>
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-50 bg-gray-50/30">
                            <div className="h-10 w-10 rounded-full bg-[#F2FAF5] flex items-center justify-center text-[#34A853] shrink-0">
                                <Icon name="check" className="text-xl" style={{ fontVariationSettings: "'wght' 700" }} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-400">{activeRecipe.steps[activeRecipe.steps.length - 1].label}</h4>
                                <p className="text-xs text-gray-400">Completed at {formatDuration(totalElapsed)}</p>
                            </div>
                            <span className="ml-auto text-sm font-semibold text-gray-300">
                                Done
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bottom Controls for Done State */}
                <div className="sticky bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-50 z-20 flex flex-col gap-4">
                    <button
                        onClick={() => {
                            navigate('/brew-log');
                        }}
                        className="w-full bg-[#8B5E3C] hover:bg-[#7A4D2F] text-white font-bold py-5 rounded-2xl shadow-lg shadow-[#8B5E3C]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                    >
                        <Icon name="assignment" style={{ fontVariationSettings: "'FILL' 1" }} />
                        Finish & Log Brew
                    </button>
                    <button
                        onClick={() => {
                            stopBrew();
                            navigate('/home');
                        }}
                        className="w-full py-2 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                    >
                        Back to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-white shadow-2xl font-display text-[#181411]">
            {/* Header */}
            <div className="shrink-0 bg-white/95 backdrop-blur-md pt-12 pb-4 px-6 flex items-center justify-between border-b border-gray-50">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Brewing Method</span>
                    <h1 className="text-lg font-bold text-[#181411]">{activeRecipe.method_id.toUpperCase()} - {activeRecipe.name}</h1>
                </div>
            </div>

            <div className="flex-1 flex flex-col px-6 py-4 overflow-y-auto hide-scrollbar">
                {/* Active Phase Card */}
                <div className="shrink-0 flex flex-col justify-center items-center mb-6 relative">
                    <div className="w-full bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary/10"></div>
                        <div className="mb-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary text-white">
                                Phase {engineState.currentStepIndex + 1} of {activeRecipe.steps.length}
                            </span>
                        </div>
                        <div className="text-[80px] font-extrabold text-[#181411] leading-none tracking-tight tabular-nums mb-4 mt-2">
                            {formatDuration(engineState.remainingTime)}
                        </div>
                        <h2 className="text-2xl font-bold text-[#181411] mb-2">
                            {stepTitle}
                        </h2>
                        <p className="text-gray-500 mb-8 max-w-[240px]">
                            {stepSubtitle}
                        </p>

                        {/* Water Progress */}
                        <div className="w-full">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-semibold text-gray-400">Total Water</span>
                                <span className="text-lg font-bold text-primary tabular-nums">
                                    {currentTargetWeight}g <span className="text-gray-400 font-normal text-sm">/ {activeRecipe.total_water}g</span>
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-primary h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Next Up - All Remaining Steps */}
                {engineState.currentStepIndex < activeRecipe.steps.length - 1 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Next Up</h3>
                        <div className="space-y-3">
                            {activeRecipe.steps.slice(engineState.currentStepIndex + 1).map((step, idx) => (
                                <div key={step.id || idx} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 opacity-60">
                                    <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0">
                                        {engineState.currentStepIndex + idx + 2}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[#181411]">
                                            {typeof step.target_weight === 'number' && step.target_weight > 0 
                                                ? `Pour +${getPourAmount(activeRecipe.steps, engineState.currentStepIndex + idx + 1)}g` 
                                                : step.label}
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            {typeof step.target_weight === 'number' && step.target_weight > 0 
                                                ? `Target: ${step.target_weight}g on scale — ${step.instruction || step.label}` 
                                                : step.instruction || step.label}
                                        </p>
                                    </div>
                                    <span className="ml-auto text-sm font-semibold text-gray-400 tabular-nums">
                                        {formatDuration(step.duration_seconds)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="sticky bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-50 z-20">
                <div className="flex w-full gap-3">
                    {totalElapsed === 0 && !engineState.isRunning ? (
                        <button
                            onClick={resumeBrew}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                        >
                            <Icon name="play_arrow" style={{ fontVariationSettings: "'FILL' 1" }} />
                            Start Brew
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleBack}
                                className="flex-1 bg-gray-50 hover:bg-gray-100 text-[#181411] font-bold py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg border border-gray-100"
                            >
                                <Icon name="stop" style={{ fontVariationSettings: "'FILL' 1" }} />
                                Stop
                            </button>
                            <button
                                onClick={engineState.isRunning ? pauseBrew : resumeBrew}
                                className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                            >
                                <Icon name={engineState.isRunning ? "pause" : "play_arrow"} style={{ fontVariationSettings: "'FILL' 1" }} />
                                {engineState.isRunning ? 'Pause' : 'Resume'}
                            </button>
                        </>
                    )}
                </div>
            </div>
            <Modal
                isOpen={isStopModalOpen}
                onClose={() => setIsStopModalOpen(false)}
                onConfirm={confirmStop}
                title="Stop Brewing?"
                message="Are you sure you want to stop this brew session? All progress will be lost."
                confirmText="Stop Brew"
                cancelText="Keep Brewing"
                type="warning"
            />
        </div>
    );
};
