import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { useWakeLock } from '../shared/hooks/useWakeLock';
import { drinkService, settingsService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import { parseList, formatScaledIngredient } from '../shared/utils/drinks';
import { useBackHandler, useSafeBack } from '../shared/utils/backNavigation';
import type { ExtraPantryItemUsage } from '../features/brew/application/DrinkService';

interface FlowLocationState {
    servings?: number;
    selectedBeanId?: string;
    selectedMilkId?: string;
    extraPantryItems?: ExtraPantryItemUsage[];
}

interface StepActionMeta {
    icon: string;
    label: string;
    badgeColor: string;
    tip?: string;
}

// Universal step action classifier for coffee, non-coffee, hot, cold, mocktail, etc.
function classifyStep(instruction: string, drinkName: string, isLastStep: boolean): StepActionMeta {
    const text = instruction.toLowerCase();

    if (isLastStep || text.includes('serve') || text.includes('enjoy') || text.includes('garnish')) {
        return {
            icon: 'local_bar',
            label: 'Finishing & Serve',
            badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
            tip: 'Serve immediately at peak temperature and aroma.'
        };
    }
    if (text.includes('espresso') || text.includes('pull') || text.includes('extract') || text.includes('shot')) {
        return {
            icon: 'local_cafe',
            label: 'Espresso Extraction',
            badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
            tip: 'Aim for a steady stream with rich hazelnut crema.'
        };
    }
    if (text.includes('steam') || text.includes('froth') || text.includes('foam')) {
        return {
            icon: 'air',
            label: 'Milk Steaming & Texture',
            badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
            tip: 'Keep the wand just below the surface for glossy microfoam (60-65°C).'
        };
    }
    if (text.includes('whisk') || text.includes('dissolve') || text.includes('stir') || text.includes('mix')) {
        return {
            icon: 'soup_kitchen',
            label: 'Whisk & Dissolve',
            badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
            tip: 'Whisk in a zig-zag or W-motion until completely smooth without clumps.'
        };
    }
    if (text.includes('ice') || text.includes('chill') || text.includes('cold')) {
        return {
            icon: 'ac_unit',
            label: 'Chill & Ice Prep',
            badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
            tip: 'Use dense ice cubes to prevent premature dilution.'
        };
    }
    if (text.includes('water') || text.includes('pour') || text.includes('fill')) {
        return {
            icon: 'water_drop',
            label: 'Pour & Measure',
            badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
            tip: 'Pour steadily to ensure clean layering and uniform temperature.'
        };
    }

    return {
        icon: 'checklist',
        label: 'Preparation Step',
        badgeColor: 'bg-md-primary-container/40 text-md-primary border-md-primary/20',
        tip: `Crafting ${drinkName}. Follow proportions carefully.`
    };
}

export const DrinkFlowPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const safeBack = useSafeBack();
    const flowState = (location.state as FlowLocationState) || {};
    const servings = flowState.servings || 1;

    const [drink, setDrink] = useState<Drink | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Optional / on-demand timer state
    const [showTimer, setShowTimer] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [feedbackEnabled, setFeedbackEnabled] = useState(true);
    const timerRef = useRef<number | null>(null);

    // Intercept back navigation to prompt exit confirmation modal
    useBackHandler(!isExitModalOpen, () => setIsExitModalOpen(true));

    // Keep screen awake while in flow
    useWakeLock(true);

    useEffect(() => {
        if (!id) return;
        drinkService.getDrink(id).then((d) => {
            setDrink(d);
            setLoading(false);
        }).catch((err) => {
            console.error('Failed to load drink for flow:', err);
            setLoading(false);
        });

        settingsService.getTimerFeedbackEnabled()
            .then(setFeedbackEnabled)
            .catch(() => setFeedbackEnabled(true));
    }, [id]);

    const playChime = useCallback(() => {
        if (!feedbackEnabled) return;
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch {
            // AudioContext not supported or gesture blocked
        }
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    }, [feedbackEnabled]);

    // Optional Stopwatch Interval
    useEffect(() => {
        if (isTimerRunning) {
            timerRef.current = window.setInterval(() => {
                setTimerSeconds((prev) => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning]);

    const steps = useMemo(() => (drink ? parseList(drink.instructions_json) : []), [drink]);
    const rawIngredients = useMemo(() => (drink ? parseList(drink.ingredients_json) : []), [drink]);
    const scaledIngredients = useMemo(
        () => rawIngredients.map((ing) => formatScaledIngredient(ing, servings)),
        [rawIngredients, servings]
    );

    const totalSteps = steps.length;
    const isLastStep = currentStepIndex === totalSteps - 1;
    const currentStepText = steps[currentStepIndex] || '';

    const actionMeta = useMemo(() => {
        return classifyStep(currentStepText, drink?.name || 'Drink', isLastStep);
    }, [currentStepText, drink?.name, isLastStep]);

    // Find ingredients mentioned in the current step to highlight them directly
    const currentStepIngredients = useMemo(() => {
        const stepLower = currentStepText.toLowerCase();
        const matches = scaledIngredients.filter((ing) => {
            const words = ing.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !/^\d+/.test(w));
            return words.some(w => stepLower.includes(w));
        });
        const extras = (flowState.extraPantryItems || [])
            .filter(e => e.name && stepLower.includes(e.name.toLowerCase()))
            .map(e => `${e.amount}${e.unit || 'g'} ${e.name}`);
        return [...matches, ...extras];
    }, [currentStepText, scaledIngredients, flowState.extraPantryItems]);

    const handleNextStep = () => {
        playChime();
        if (isLastStep) {
            // Navigate to DrinkLogPage with prep details
            navigate(`/drink-log/${drink?.id}`, {
                state: {
                    servings,
                    selectedBeanId: flowState.selectedBeanId,
                    selectedMilkId: flowState.selectedMilkId,
                    extraPantryItems: flowState.extraPantryItems,
                    durationSeconds: timerSeconds,
                }
            });
        } else {
            setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
        }
    };

    const handlePrevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex((prev) => prev - 1);
        }
    };

    const formatTimer = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!drink || totalSteps === 0) {
        return (
            <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface p-6 items-center justify-center text-center">
                <Icon name="error" className="text-5xl text-md-error mb-4" />
                <h2 className="typescale-title-large font-bold">No Instructions Found</h2>
                <button
                    onClick={() => safeBack(`/drinks/${id}`)}
                    className="mt-4 text-md-primary font-bold hover:underline cursor-pointer"
                >
                    Back to previous page
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Header with Exit, Title, and Segmented Progress */}
            <header className="shrink-0 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20 sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsExitModalOpen(true)}
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        aria-label="Exit flow"
                    >
                        <Icon name="close" className="text-2xl" />
                    </button>
                    <div className="flex flex-col items-center min-w-0 px-2">
                        <span className="typescale-label-small font-bold text-md-primary uppercase tracking-wider">
                            Step {currentStepIndex + 1} of {totalSteps}
                        </span>
                        <h1 className="typescale-title-medium font-bold text-md-on-surface truncate">
                            {drink.name} {servings > 1 ? `(${servings}x)` : ''}
                        </h1>
                    </div>
                    <div className="size-10" aria-hidden="true" />
                </div>

                {/* Segmented Step Indicator */}
                <div className="flex gap-1.5 mt-3">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i <= currentStepIndex ? 'bg-md-primary' : 'bg-md-surface-container-highest'
                            }`}
                        />
                    ))}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 px-5 py-5 space-y-4">
                {/* 1. Hero Active Action Stage Card */}
                <div className="p-6 rounded-3xl bg-md-surface-container-low border border-md-outline-variant/30 shadow-md-2 space-y-4 relative overflow-hidden">
                    {/* Top Row: Action Classification Badge + Optional Timer Trigger */}
                    <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 typescale-label-small font-bold px-3 py-1 rounded-full border ${actionMeta.badgeColor}`}>
                            <Icon name={actionMeta.icon} className="text-sm" />
                            {actionMeta.label}
                        </span>

                        {/* Optional Stopwatch Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowTimer((prev) => !prev)}
                            className={`typescale-label-small font-bold px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer border ${
                                showTimer
                                    ? 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                                    : 'bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface border-md-outline-variant/30'
                            }`}
                            aria-label="Toggle stopwatch timer"
                        >
                            <Icon name="timer" className="text-sm" />
                            <span>{showTimer ? formatTimer(timerSeconds) : 'Timer'}</span>
                        </button>
                    </div>

                    {/* Expandable Optional Stopwatch Widget */}
                    {showTimer && (
                        <div className="p-3.5 rounded-2xl bg-md-surface-container-high/80 border border-md-outline-variant/20 flex items-center justify-between animate-fadeIn">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-full bg-md-primary/10 text-md-primary flex items-center justify-center">
                                    <Icon name="timer" className="text-xl" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-md-on-surface-variant">Stopwatch</span>
                                    <span className="typescale-title-large font-black tabular-nums tracking-tight text-md-on-surface">
                                        {formatTimer(timerSeconds)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setIsTimerRunning((r) => !r)}
                                    className={`size-9 rounded-full flex items-center justify-center font-bold text-white transition-all cursor-pointer ${
                                        isTimerRunning ? 'bg-amber-500' : 'bg-md-primary'
                                    }`}
                                >
                                    <Icon name={isTimerRunning ? 'pause' : 'play_arrow'} className="text-lg" />
                                </button>
                                {timerSeconds > 0 && !isTimerRunning && (
                                    <button
                                        type="button"
                                        onClick={() => setTimerSeconds(0)}
                                        className="size-9 rounded-full bg-md-surface-container-highest text-md-on-surface-variant flex items-center justify-center hover:text-md-on-surface cursor-pointer"
                                    >
                                        <Icon name="replay" className="text-base" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Large Action Instruction Headline */}
                    <div className="py-1">
                        <h2 className="typescale-headline-small font-black text-md-on-surface leading-snug">
                            {currentStepText}
                        </h2>
                    </div>

                    {/* Highlighted Ingredients for this Step (if detected) */}
                    {currentStepIngredients.length > 0 && (
                        <div className="p-4 rounded-2xl bg-md-primary-container/20 border border-md-primary/20 space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-md-primary flex items-center gap-1.5">
                                <Icon name="check_circle" className="text-sm" /> Ingredients for this action
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {currentStepIngredients.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="typescale-body-medium font-bold px-3 py-1.5 rounded-xl bg-md-surface text-md-on-surface shadow-xs border border-md-outline-variant/30"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Barista Technique Tip */}
                    {actionMeta.tip && (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                            <Icon name="lightbulb" className="text-amber-500 text-base shrink-0 mt-0.5" />
                            <span>{actionMeta.tip}</span>
                        </div>
                    )}
                </div>

                {/* 2. Visual Recipe Roadmap (All Steps Timeline) */}
                <div className="p-5 rounded-3xl bg-md-surface-container-low border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <div className="flex items-center justify-between pb-1">
                        <span className="typescale-label-small font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
                            <Icon name="timeline" className="text-base text-md-primary" />
                            Recipe Roadmap
                        </span>
                        <span className="text-xs text-md-on-surface-variant/70 font-semibold">
                            {currentStepIndex + 1} of {totalSteps} Steps
                        </span>
                    </div>

                    <div className="space-y-2">
                        {steps.map((step, idx) => {
                            const isDone = idx < currentStepIndex;
                            const isCurrent = idx === currentStepIndex;

                            return (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                                        isCurrent
                                            ? 'bg-md-primary/10 border border-md-primary/30 shadow-xs'
                                            : isDone
                                              ? 'bg-md-surface-container-high/50 border border-transparent opacity-75'
                                              : 'bg-md-surface-container-high/30 border border-transparent opacity-50'
                                    }`}
                                >
                                    <div
                                        className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                            isDone
                                                ? 'bg-emerald-500/20 text-emerald-600'
                                                : isCurrent
                                                  ? 'bg-md-primary text-white shadow-xs'
                                                  : 'bg-md-surface-container-highest text-md-on-surface-variant'
                                        }`}
                                    >
                                        {isDone ? <Icon name="check" className="text-sm font-bold" /> : idx + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={`text-xs leading-snug truncate ${
                                                isCurrent
                                                    ? 'font-bold text-md-on-surface'
                                                    : isDone
                                                      ? 'line-through text-md-on-surface-variant/70'
                                                      : 'text-md-on-surface-variant'
                                            }`}
                                        >
                                            {step}
                                        </p>
                                    </div>

                                    {isCurrent && (
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-md-primary text-white shrink-0">
                                            Current
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Scaled Ingredients Reference */}
                <div className="p-4 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/30 space-y-2">
                    <span className="typescale-label-small font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
                        <Icon name="kitchen" className="text-sm text-md-primary" />
                        All Ingredients ({servings}x Portion)
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {scaledIngredients.map((ing, i) => (
                            <span
                                key={i}
                                className="typescale-body-small font-medium px-2.5 py-1 rounded-lg bg-md-surface-container-high text-md-on-surface border border-md-outline-variant/20"
                            >
                                {ing}
                            </span>
                        ))}
                        {flowState.extraPantryItems?.map((extra, i) => (
                            <span
                                key={`extra-${i}`}
                                className="typescale-body-small font-medium px-2.5 py-1 rounded-lg bg-md-secondary-container/60 text-md-on-secondary-container border border-md-secondary/30 flex items-center gap-1"
                            >
                                <Icon name="add" className="text-xs" />
                                {extra.amount}{extra.unit || 'g'} {extra.name}
                            </span>
                        ))}
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Navigation Action Bar */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 z-20">
                <div className="flex w-full gap-3 items-center">
                    {currentStepIndex > 0 && (
                        <button
                            type="button"
                            onClick={handlePrevStep}
                            className="w-1/3 py-4 rounded-2xl border border-md-outline-variant/40 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                        >
                            <Icon name="arrow_back" className="text-lg" />
                            <span>Back</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 py-4 rounded-2xl bg-md-primary text-md-on-primary font-bold text-sm flex items-center justify-center gap-2 shadow-md-2 hover:shadow-md-3 transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <span>{isLastStep ? 'Finish & Log Drink' : 'Next Step'}</span>
                        <Icon name={isLastStep ? 'check' : 'arrow_forward'} className="text-lg" />
                    </button>
                </div>
            </div>

            {/* Exit Confirmation Modal */}
            <Modal
                isOpen={isExitModalOpen}
                type="info"
                title="Exit Crafting Flow?"
                confirmText="Exit Flow"
                cancelText="Stay Here"
                onConfirm={() => safeBack(`/drinks/${drink.id}`)}
                onClose={() => setIsExitModalOpen(false)}
                message="Are you sure you want to stop? Your preparation will not be saved to journal yet."
            />
        </div>
    );
};
