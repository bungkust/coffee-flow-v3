import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { useBrewStore } from '../state/useBrewStore';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { brewService, settingsService } from '../core/services';
import { sendNotification } from '../shared/utils/notify';
import { useWakeLock } from '../shared/hooks/useWakeLock';
import type { Recipe } from '../shared/domain/entities';
import { formatDuration, formatWeight, formatVolume, formatStepSeconds, formatMethodName, getCurrentTargetWeight, getPourAmount, getTotalTargetWeight, getWaterProgressPercent, getStepIntervalInfo, type UnitSystem } from '../shared/utils/brewMath';

const BrewHeader = ({ recipe }: { recipe: Recipe }) => (
    <header className="shrink-0 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
        <div className="flex flex-col">
            <span className="typescale-label-small font-bold text-md-on-surface-variant/70 uppercase tracking-wider">{formatMethodName(recipe.method_id)}</span>
            <h1 className="typescale-headline-small font-bold text-md-on-surface">{recipe.name}</h1>
        </div>
    </header>
);

export const BrewFlowPage = () => {
    const navigate = useNavigate();
    const { activeRecipe, engineState, stopBrew, pauseBrew, resumeBrew, hydrateBrew, skipStep, selectedBeanId, selectedFilterId, coffeeConsumed } = useBrewStore();

    const [isStopModalOpen, setIsStopModalOpen] = useState(false);
    const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
    const [feedbackEnabled, setFeedbackEnabled] = useState(true);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
    const hasHydratedRef = useRef(false);

    useEffect(() => {
        settingsService.getAppUnit().then(setUnitSystem);
    }, []);

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
        if (hasHydratedRef.current) return;
        hasHydratedRef.current = true;

        if (!activeRecipe) {
            const restored = hydrateBrew();
            if (!restored) navigate('/brew-methods');
        }
    }, [activeRecipe, hydrateBrew, navigate]);

    useEffect(() => {
        settingsService.getTimerFeedbackEnabled()
            .then(setFeedbackEnabled)
            .catch(() => setFeedbackEnabled(true));
    }, []);

    // Keep the screen awake for the whole brew flow (running, paused or done)
    useWakeLock(true);

    // Persist the brew as soon as it finishes, so leaving via "Back to Homepage" still journals it.
    const hasAutoLoggedRef = useRef(false);
    useEffect(() => {
        if (!engineState?.isCompleted || !activeRecipe || hasAutoLoggedRef.current) return;
        hasAutoLoggedRef.current = true;
        brewService.logBrew(
            activeRecipe.id,
            4,
            '',
            { sweetness: 75, acidity: 50, body: 30, bitterness: 20 },
            ['Fruity'],
            selectedBeanId || undefined,
            selectedFilterId || undefined,
            coffeeConsumed || undefined
        ).then((id) => sessionStorage.setItem('coffee_flow_last_logged_id', id)).catch(console.error);
    }, [engineState?.isCompleted, activeRecipe, selectedBeanId, selectedFilterId, coffeeConsumed]);

    const recipeName = activeRecipe?.name;

    useEffect(() => {
        if (!engineState) return;

        if (engineState.isRunning) {
            if (engineState.remainingTime === 0 && !engineState.isCompleted) {
                playFeedback(440, 0.2);
                if ('vibrate' in navigator) navigator.vibrate(200);
            }

            if (engineState.remainingTime > 0 && engineState.remainingTime <= 3) {
                playFeedback(330, 0.1);
            }
        }

        if (engineState.isCompleted) {
            playFeedback(880, 0.5);
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            void sendNotification('Brew Complete', `${recipeName ?? 'Brew'} is ready to serve`);
        }
    }, [engineState, playFeedback, recipeName]);

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

    const handleSkipStep = () => {
        if (engineState.currentStepIndex >= activeRecipe.steps.length - 1) {
            skipStep();
        } else {
            setIsSkipModalOpen(true);
        }
    };

    const confirmSkip = () => {
        skipStep();
        setIsSkipModalOpen(false);
    };

    // The scale reads only the water poured (any ice already sits in the server), so the gauge
    // tracks the final pour target rather than the recipe total, which may include the ice.
    const totalWaterRecipe = getTotalTargetWeight(activeRecipe.steps) || activeRecipe.total_water || 0;
    const iceWeight = Math.max(0, Math.round((activeRecipe.total_water || 0) - totalWaterRecipe));
    const currentTargetWeight = getCurrentTargetWeight(activeRecipe.steps, engineState.currentStepIndex);
    const pourAmount = getPourAmount(activeRecipe.steps, engineState.currentStepIndex);
    const progressPercent = getWaterProgressPercent(currentTargetWeight, totalWaterRecipe);
    const stepTitle = currentStep.target_weight && pourAmount > 0
        ? `Pour +${formatWeight(pourAmount, unitSystem)}`
        : currentStep.label;
    const stepSubtitle = currentStep.target_weight && pourAmount > 0
        ? `Target: ${formatWeight(currentStep.target_weight, unitSystem)} on scale — ${currentStep.instruction || currentStep.label}`
        : currentStep.instruction || currentStep.label;
    const intervalInfo = getStepIntervalInfo(currentStep);

    if (engineState.isCompleted) {
        return (
            <div className="flex flex-col h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
                {/* Header for Done state */}
                <BrewHeader recipe={activeRecipe} />

                <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto scrollbar-hide">
                    {/* Done Card */}
                    <div className="shrink-0 flex flex-col justify-center items-center mb-6 relative">
                        <div className="w-full bg-md-surface-container-low rounded-3xl p-6 border border-md-outline-variant/30 shadow-md-2 flex flex-col items-center justify-center text-center relative overflow-hidden space-y-3">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-md-primary"></div>

                            <div className="size-20 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center mb-2 shadow-inner">
                                <Icon name="emoji_events" className="text-4xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                            </div>

                            <h2 className="typescale-headline-large font-extrabold text-md-on-surface">Done!</h2>
                            <h3 className="typescale-title-large font-bold text-md-on-surface">Enjoy your coffee</h3>
                            <p className="typescale-body-medium text-md-on-surface-variant max-w-[240px]">
                                Great job! Your brew is complete and ready to serve.
                            </p>

                            {/* Final Water Progress */}
                            <div className="w-full pt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="typescale-label-medium font-bold text-md-on-surface-variant">Total Water</span>
                                    <span className="typescale-title-medium font-bold text-md-primary tabular-nums">
                                        {formatVolume(totalWaterRecipe, unitSystem)} <span className="typescale-body-small text-md-on-surface-variant/70 font-normal">/ {formatVolume(totalWaterRecipe, unitSystem)}</span>
                                    </span>
                                </div>
                                <div className="w-full bg-md-surface-container-high rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-md-primary h-3 rounded-full"
                                        style={{ width: '100%' }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Previous Steps section */}
                    <div className="mb-6">
                        <h3 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider mb-2.5 ml-1">Previous Steps</h3>
                        <div className="flex items-center gap-4 p-4 rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low shadow-md-1">
                            <div className="size-10 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center shrink-0">
                                <Icon name="check" className="text-xl font-bold" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="typescale-title-small font-bold text-md-on-surface line-clamp-1">{activeRecipe.steps[activeRecipe.steps.length - 1].label}</h4>
                                <p className="typescale-body-small text-md-on-surface-variant">Completed at {formatDuration(totalElapsed)}</p>
                            </div>
                            <span className="typescale-label-medium font-bold text-md-primary shrink-0">
                                Done
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bottom Controls for Done State */}
                <div className="sticky bottom-0 left-0 right-0 p-5 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 z-20 flex flex-col gap-3">
                    <Button
                        variant="filled"
                        size="lg"
                        onClick={() => navigate('/brew-log')}
                        className="w-full"
                    >
                        <Icon name="assignment" style={{ fontVariationSettings: "'FILL' 1" }} />
                        <span>Finish & Log Brew</span>
                    </Button>
                    <button
                        onClick={() => {
                            stopBrew();
                            navigate('/home');
                        }}
                        className="w-full py-2.5 text-md-on-surface-variant font-bold hover:text-md-on-surface transition-colors cursor-pointer typescale-label-large"
                    >
                        Back to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Header */}
            <BrewHeader recipe={activeRecipe} />

            <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto scrollbar-hide">
                {/* Active Phase Card */}
                <div className="shrink-0 flex flex-col justify-center items-center mb-6 relative">
                    <div className="w-full bg-md-surface-container-low rounded-3xl p-6 border border-md-outline-variant/30 shadow-md-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-md-primary"></div>
                        <div className="mb-2 flex items-center gap-2 flex-wrap justify-center">
                            <span className="inline-flex items-center px-3.5 py-1 rounded-full typescale-label-medium font-bold bg-md-secondary-container text-md-on-secondary-container border border-md-outline-variant/20">
                                Phase {engineState.currentStepIndex + 1} of {activeRecipe.steps.length}
                            </span>
                            {intervalInfo.pourSeconds > 0 && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full typescale-label-small font-bold bg-md-surface-container-high text-md-secondary border border-md-outline-variant/30">
                                    <Icon name="hourglass_empty" className="text-xs" />
                                    Pour ~{intervalInfo.pourSeconds}s{intervalInfo.restSeconds > 0 ? ` • Rest ~${intervalInfo.restSeconds}s` : ''}
                                </span>
                            )}
                        </div>
                        <div className="typescale-display-large text-7xl font-extrabold text-md-on-surface leading-none tracking-tight tabular-nums mb-4 mt-2">
                            {formatDuration(engineState.remainingTime)}
                        </div>
                        <h2 className="typescale-title-large font-bold text-md-on-surface mb-1">
                            {stepTitle}
                        </h2>
                        <p className="typescale-body-small text-md-on-surface-variant mb-6 max-w-[260px]">
                            {stepSubtitle}
                        </p>

                        {/* Water Progress */}
                        <div className="w-full">
                            <div className="flex justify-between items-end mb-2">
                                <span className="typescale-label-medium font-bold text-md-on-surface-variant">Total Water</span>
                                <span className="typescale-title-medium font-bold text-md-primary tabular-nums">
                                    {formatWeight(currentTargetWeight, unitSystem)} <span className="typescale-body-small text-md-on-surface-variant/70 font-normal">/ {formatVolume(totalWaterRecipe, unitSystem)}</span>
                                </span>
                            </div>
                            <div className="w-full bg-md-surface-container-high rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-md-primary h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                            {iceWeight > 0 && (
                                <p className="typescale-body-small text-md-on-surface-variant mt-2 flex items-center gap-1.5">
                                    <Icon name="ac_unit" className="text-sm text-md-primary" />
                                    Ice {formatWeight(iceWeight, unitSystem)} already in the server — pour from 0
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Next Up - All Remaining Steps */}
                {engineState.currentStepIndex < activeRecipe.steps.length - 1 && (
                    <div className="mb-6">
                        <h3 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider mb-2.5 ml-1">Next Up</h3>
                        <div className="space-y-2.5">
                            {activeRecipe.steps.slice(engineState.currentStepIndex + 1).map((step, idx) => (
                                <div key={step.id || idx} className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-md-outline-variant/20 bg-md-surface-container-low/70 opacity-70">
                                    <div className="size-8 rounded-full bg-md-surface-container-highest border border-md-outline-variant/20 flex items-center justify-center text-md-on-surface-variant typescale-label-medium font-bold shrink-0">
                                        {engineState.currentStepIndex + idx + 2}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="typescale-title-small font-bold text-md-on-surface line-clamp-1">
                                            {typeof step.target_weight === 'number' && step.target_weight > 0
                                                ? `Pour +${formatWeight(getPourAmount(activeRecipe.steps, engineState.currentStepIndex + idx + 1), unitSystem)}`
                                                : step.label}
                                        </h4>
                                        <p className="typescale-body-small text-md-on-surface-variant line-clamp-1">
                                            {typeof step.target_weight === 'number' && step.target_weight > 0
                                                ? `Target: ${formatWeight(step.target_weight)} on scale`
                                                : step.instruction || step.label}
                                        </p>
                                    </div>
                                    <span className="typescale-label-medium font-semibold text-md-on-surface-variant tabular-nums shrink-0">
                                        {formatStepSeconds(step.duration_seconds)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="sticky bottom-0 left-0 right-0 p-5 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 z-20">
                <div className="flex w-full gap-3">
                    {totalElapsed === 0 && !engineState.isRunning ? (
                        <Button
                            variant="filled"
                            size="lg"
                            onClick={resumeBrew}
                            className="w-full"
                        >
                            <Icon name="play_arrow" style={{ fontVariationSettings: "'FILL' 1" }} />
                            <span>Start Brew</span>
                        </Button>
                    ) : (
                        <>
                            <button
                                onClick={handleBack}
                                className="flex-1 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface font-bold py-3.5 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 typescale-label-large border border-md-outline-variant/30 cursor-pointer"
                            >
                                <Icon name="stop" style={{ fontVariationSettings: "'FILL' 1" }} />
                                Stop
                            </button>
                            <button
                                onClick={handleSkipStep}
                                className="flex-1 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface font-bold py-3.5 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 typescale-label-large border border-md-outline-variant/30 cursor-pointer"
                            >
                                <Icon name="skip_next" style={{ fontVariationSettings: "'FILL' 1" }} />
                                Skip
                            </button>
                            <Button
                                variant="filled"
                                size="lg"
                                onClick={engineState.isRunning ? pauseBrew : resumeBrew}
                                className="flex-1"
                            >
                                <Icon name={engineState.isRunning ? "pause" : "play_arrow"} style={{ fontVariationSettings: "'FILL' 1" }} />
                                <span>{engineState.isRunning ? 'Pause' : 'Resume'}</span>
                            </Button>
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
            <Modal
                isOpen={isSkipModalOpen}
                onClose={() => setIsSkipModalOpen(false)}
                onConfirm={confirmSkip}
                title="Skip this step?"
                message={`Skip "${currentStep.label}" and move to the next step? The timer for this step will not be counted.`}
                confirmText="Skip Step"
                cancelText="Stay Here"
                type="info"
            />
        </div>
    );
};
