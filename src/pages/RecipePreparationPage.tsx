import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Icon } from '../components/Icons';
import { brewService, pantryService, settingsService } from '../core/services';
import type { Recipe, BrewStep } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';
import { useBrewStore, type BrewMode } from '../state/useBrewStore';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { ScalePairingModal } from '../components/ScalePairingModal';
import { BrewModeSheet } from '../components/BrewModeSheet';
import { Dropdown } from '../components/Dropdown';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { Modal } from '../components/Modal';
import { calculateCoffeeDose, formatDuration, formatWeight, formatVolume, formatStepSeconds, formatMethodName, parseRatio, scaleRecipe, scaleInstructionText, getBrewDuration, getPourAmount, getStepIntervalInfo, getTotalTargetWeight, getBrewSteps, withDerivedPourDurations, type UnitSystem } from '../shared/utils/brewMath';
import { useSafeBack } from '../shared/utils/backNavigation';
import { useWakeLock } from '../shared/hooks/useWakeLock';

// Steps that only set things up (ice, rinse, dosing) belong on this screen, not the brew flow.
const DEFAULT_ICE_RATIO = 4.375;
// Curated ice ratios for recipes that don't state their own ice weight.
const ICE_RATIO_BY_RECIPE: Record<string, number> = {};

// Reads an ice weight the recipe states itself (e.g. "100 grams of ice" / "70g ice cubes").
const parseExplicitIce = (recipe: Recipe): number | null => {
    const text = [
        recipe.description_detailed,
        ...(recipe.steps ?? []).flatMap(step => [step.label, step.instruction])
    ].filter(Boolean).join(' ');
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gram|grams)\s*(?:of\s*)?ice\b/i)
        || text.match(/\bice\b[^.\d]{0,24}?(\d+(?:\.\d+)?)\s*(?:g|gr|gram|grams)\b/i);
    return match ? Math.round(parseFloat(match[1])) : null;
};

const SectionHeader = ({ step, title, right }: { step: number; title: string; right?: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant tabular-nums">
            {step} · {title}
        </h2>
        {right}
    </div>
);

const StepperRow = ({
    label,
    subtitle,
    value,
    onDecrement,
    onIncrement,
    decrementLabel,
    incrementLabel,
    onReset,
}: {
    label: string;
    subtitle?: string;
    value: string;
    onDecrement: () => void;
    onIncrement: () => void;
    decrementLabel: string;
    incrementLabel: string;
    onReset?: () => void;
}) => (
    <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
            <span className="block typescale-title-small font-bold text-md-on-surface">{label}</span>
            {(subtitle || onReset) && (
                <div className="flex items-center gap-2 mt-0.5">
                    {subtitle && (
                        <span className="typescale-body-small text-md-on-surface-variant">{subtitle}</span>
                    )}
                    {onReset && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="typescale-label-small font-bold text-md-primary hover:underline cursor-pointer"
                        >
                            Reset
                        </button>
                    )}
                </div>
            )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
            <button
                type="button"
                onClick={onDecrement}
                aria-label={decrementLabel}
                className="size-11 rounded-full border border-md-outline-variant/35 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all active:scale-95 flex items-center justify-center font-bold text-xl cursor-pointer"
            >
                -
            </button>
            <span className="min-w-[4.25rem] text-center typescale-title-large font-extrabold text-md-on-surface tracking-tight tabular-nums">
                {value}
            </span>
            <button
                type="button"
                onClick={onIncrement}
                aria-label={incrementLabel}
                className="size-11 rounded-full border border-md-outline-variant/35 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all active:scale-95 flex items-center justify-center font-bold text-xl cursor-pointer"
            >
                +
            </button>
        </div>
    </div>
);

export const RecipePreparationPage = () => {
    useWakeLock(true);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const [searchParams] = useSearchParams();
    const startBrew = useBrewStore(state => state.startBrew);

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [beans, setBeans] = useState<PantryItem[]>([]);
    const [selectedBeanId, setSelectedBeanId] = useState<string>('');
    const [filters, setFilters] = useState<PantryItem[]>([]);
    const [selectedFilterId, setSelectedFilterId] = useState<string>('');
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [adjustedCoffeeDose, setAdjustedCoffeeDose] = useState<number>(0);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
    const initialModeParam = searchParams.get('mode');
    const skipPairing = searchParams.get('skipPairing') === '1';
    const hasExplicitMode = initialModeParam === 'smart-scale' || initialModeParam === 'manual';
    const [brewMode, setBrewMode] = useState<BrewMode>(hasExplicitMode ? initialModeParam : 'manual');
    const [isModeSheetOpen, setIsModeSheetOpen] = useState(!hasExplicitMode);
    const [showStepsPreview, setShowStepsPreview] = useState(false);
    const [isPairingModalOpen, setIsPairingModalOpen] = useState(
        () => initialModeParam === 'smart-scale' && !skipPairing && useScaleStore.getState().connectionState !== 'connected'
    );
    const { connectionState, device, batteryPercent, currentWeight, tare, connectMock } = useScaleStore();
    const manageClicked = useRef(false);
    const [stockWarning, setStockWarning] = useState<string[] | null>(null);

    useEffect(() => {
        if (recipe) {
            const initialDose = calculateCoffeeDose(recipe.total_water, recipe.ratio);
            setAdjustedCoffeeDose(initialDose || 15);
        }
    }, [recipe]);

    const ratioMultiplier = recipe ? (parseRatio(recipe.ratio) || 16) : 16;
    const adjustedWaterVolume = adjustedCoffeeDose * ratioMultiplier;

    // Prefer the amount the recipe states itself; the curated ratios below win where present.
    const curatedIceRatio = recipe ? ICE_RATIO_BY_RECIPE[recipe.id] : undefined;
    const explicitIceWeight = recipe && curatedIceRatio === undefined ? parseExplicitIce(recipe) : null;
    const baseDose = recipe ? (calculateCoffeeDose(recipe.total_water, recipe.ratio) || 15) : 15;

    const isIced = Boolean(
        recipe?.style?.toLowerCase().includes('iced') ||
        recipe?.name?.toLowerCase().includes('iced') ||
        recipe?.id?.toLowerCase().includes('iced') ||
        recipe?.steps?.some(s => s.instruction?.toLowerCase().includes('ice') || s.label?.toLowerCase().includes('ice'))
    );

    const defaultIceWeight = recipe
        ? Math.round(explicitIceWeight !== null
            ? explicitIceWeight * (adjustedCoffeeDose / baseDose)
            : (curatedIceRatio ?? DEFAULT_ICE_RATIO) * adjustedCoffeeDose)
        : 70;

    const [customIceWeight, setCustomIceWeight] = useState<number | null>(null);
    const effectiveIceWeight = isIced ? (customIceWeight ?? defaultIceWeight) : 0;
    // When the recipe's own pour targets already cover the stated water, the ice is a
    // separate layer in the server — brewed hot, then drained over it. Only treat the
    // water as including ice when the targets fall short of it (the gap is the ice), or
    // when the recipe states no pour targets at all.
    const recipePourTarget = getTotalTargetWeight(recipe?.steps ?? []);
    const iceIsPartOfWater = recipePourTarget < (recipe?.total_water ?? 0) * 0.9
        && (explicitIceWeight === null || (adjustedWaterVolume - effectiveIceWeight) >= effectiveIceWeight);
    const hotWaterVolume = isIced
        ? (iceIsPartOfWater ? Math.max(20, adjustedWaterVolume - effectiveIceWeight) : adjustedWaterVolume)
        : adjustedWaterVolume;
    const totalBrewVolume = isIced ? Math.round(hotWaterVolume + effectiveIceWeight) : Math.round(adjustedWaterVolume);

    const currentScaledRecipe = useMemo(() => {
        if (!recipe) return null;
        const scaled = scaleRecipe(recipe, adjustedCoffeeDose);

        const finalize = (steps: BrewStep[], totalWater?: number) => ({
            ...scaled,
            total_water: totalWater ?? scaled.total_water,
            steps: withDerivedPourDurations(getBrewSteps(steps))
        });

        if (!isIced) return finalize(scaled.steps);

        const pourSteps = scaled.steps.filter(s => typeof s.target_weight === 'number' && s.target_weight > 0);
        const maxPourTarget = pourSteps.length > 0 ? Math.max(...pourSteps.map(s => s.target_weight!)) : 0;
        if (maxPourTarget <= 0) return finalize(scaled.steps);

        const hotWaterScale = hotWaterVolume / maxPourTarget;

        const adjustedSteps = scaled.steps.map(step => {
            if (step.label?.toLowerCase().includes('ice') || step.instruction?.toLowerCase().includes('ice')) {
                const scaledInstruction = step.instruction?.replace(/\b(\d+(?:\.\d+)?)\s*(g|ml)\b/gi, () => {
                    return `${effectiveIceWeight}g`;
                });
                return { ...step, instruction: scaledInstruction };
            }

            if (typeof step.target_weight === 'number' && step.target_weight > 0) {
                const adjustedTarget = Math.round(step.target_weight * hotWaterScale);
                const adjustedInstruction = scaleInstructionText(step.instruction, hotWaterScale);
                return {
                    ...step,
                    target_weight: adjustedTarget,
                    instruction: adjustedInstruction
                };
            }
            return step;
        });

        return finalize(adjustedSteps, Math.round(hotWaterVolume + effectiveIceWeight));
    }, [recipe, adjustedCoffeeDose, isIced, hotWaterVolume, effectiveIceWeight]);

    const handleAdjustDose = (delta: number) => {
        setAdjustedCoffeeDose(prev => {
            const next = prev + delta * 0.5;
            return Math.round(Math.max(5, Math.min(100, next)) * 10) / 10;
        });
        setCustomIceWeight(null);
    };

    const handleAdjustIce = (delta: number) => {
        setCustomIceWeight(() => {
            const current = customIceWeight ?? defaultIceWeight;
            return Math.max(10, Math.min(500, current + delta * 5));
        });
    };

    useEffect(() => {
        settingsService.getAppUnit().then(setUnitSystem);
    }, []);

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!id) return;
            try {
                const [data, pantryItems] = await Promise.all([
                    brewService.getRecipe(id),
                    pantryService.getPantryItems()
                ]);
                setRecipe(data);

                const availableBeans = pantryItems.filter(item => item.category === 'beans');
                setBeans(availableBeans);

                const availableFilters = pantryItems.filter(item => item.category === 'filter');
                setFilters(availableFilters);

                if (availableBeans.length > 0) {
                    setSelectedBeanId((availableBeans.find(b => b.id === searchParams.get('beanId')) ?? availableBeans[0]).id);
                }
                if (availableFilters.length > 0) setSelectedFilterId(availableFilters[0].id);
            } catch (error) {
                console.error('Failed to load recipe:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecipe();
    }, [id, searchParams]);

    // Dynamic Checklist Generator
    const dynamicChecklist = recipe ? (() => {
        const items: { id: string; label: string }[] = [];
        const grind = recipe.grind_size || 'Medium';

        items.push({
            id: 'coffee',
            label: `Weigh ${formatWeight(adjustedCoffeeDose, unitSystem)} coffee & Grind (${grind})`
        });

        if (recipe.temperature && recipe.temperature > 0) {
            items.push({
                id: 'water',
                label: `Heat ${formatVolume(hotWaterVolume, unitSystem)} water to ${recipe.temperature}°C`
            });
        }

        if (isIced) {
            items.push({
                id: 'ice',
                label: `Prepare ${formatWeight(effectiveIceWeight, unitSystem)} ice cubes directly into server`
            });
        }

        if (recipe.method_id === 'aeropress') {
            const isInverted = recipe.description_detailed?.toLowerCase().includes('inverted') || recipe.steps?.some(s => s.instruction?.toLowerCase().includes('inverted'));
            items.push({
                id: 'filter',
                label: `Rinse paper filter & setup AeroPress (${isInverted ? 'Inverted position' : 'Standard position'})`
            });
        } else if (recipe.method_id === 'espresso') {
            items.push({
                id: 'filter',
                label: 'Preheat espresso machine & portafilter basket'
            });
        } else {
            items.push({
                id: 'filter',
                label: 'Rinse filter paper & preheat dripper'
            });
        }

        items.push({
            id: 'scale',
            label: brewMode === 'smart-scale'
                ? 'Add coffee grounds to brewer & tare scale'
                : 'Add coffee grounds to brewer'
        });

        return items;
    })() : [];

    const toggleCheck = (itemId: string) => {
        setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const totalChecklistItems = dynamicChecklist.length;
    const checkedCount = dynamicChecklist.filter(item => checkedItems[item.id]).length;
    const isReady = dynamicChecklist.length > 0 && checkedCount === dynamicChecklist.length
        && (beans.length === 0 || selectedBeanId !== '')
        && (filters.length === 0 || selectedFilterId !== '');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface p-6 text-center">
                <Icon name="error" className="text-5xl text-md-error mb-4" />
                <h2 className="typescale-title-large font-bold text-md-on-surface">Recipe not found</h2>
                <button
                    onClick={() => safeBack(id ? `/recipes/${id}` : '/recipes')}
                    className="mt-4 text-md-primary font-bold hover:underline cursor-pointer"
                >
                    Back to previous page
                </button>
            </div>
        );
    }

    const proceedToBrew = () => {
        // If smart scale mode is chosen on web without physical scale connected, activate demo mode only on web
        if (!Capacitor.isNativePlatform() && brewMode === 'smart-scale' && connectionState !== 'connected') {
            connectMock();
        }
        // Drop any log id from a previous brew so this one isn't saved over it.
        sessionStorage.removeItem('coffee_flow_last_logged_id');
        startBrew(currentScaledRecipe!, selectedBeanId, selectedFilterId, adjustedCoffeeDose, brewMode);
        navigate('/brew-flow');
    };

    const handleProceedToBrew = () => {
        if (!currentScaledRecipe || !isReady) return;
        const selectedBean = beans.find(b => b.id === selectedBeanId);
        const selectedFilter = filters.find(f => f.id === selectedFilterId);
        const lines: string[] = [];
        if (selectedBean && typeof selectedBean.quantity === 'number' && selectedBean.quantity < adjustedCoffeeDose) {
            lines.push(`Not enough beans ("${selectedBean.name}"): this brew uses ${adjustedCoffeeDose.toFixed(1)}g but you only have ${selectedBean.quantity}g left.`);
        }
        if (selectedFilter && (selectedFilter.quantity == null || selectedFilter.quantity < 1)) {
            lines.push(`No ${selectedFilter.name} filters left in your pantry.`);
        }
        if (lines.length > 0) {
            setStockWarning(lines);
            return;
        }
        proceedToBrew();
    };

    const isSmartScaleMode = brewMode === 'smart-scale';
    const scaledWaterTotal = currentScaledRecipe
        ? formatVolume(getTotalTargetWeight(currentScaledRecipe.steps) || currentScaledRecipe.total_water || 0, unitSystem)
        : '';
    const scaledSpecs = isIced
        ? [
            { icon: 'water_drop', label: 'Hot Water', value: formatVolume(hotWaterVolume, unitSystem) },
            { icon: 'ac_unit', label: 'Total Brew', value: `${totalBrewVolume}ml` },
            { icon: 'grain', label: 'Grind', value: recipe.grind_size || 'Medium' },
            { icon: 'thermostat', label: 'Temp', value: recipe.temperature ? `${recipe.temperature}°C` : '—' },
        ]
        : [
            { icon: 'water_drop', label: 'Water', value: formatVolume(hotWaterVolume, unitSystem) },
            { icon: 'thermostat', label: 'Temp', value: recipe.temperature ? `${recipe.temperature}°C` : '—' },
            { icon: 'grain', label: 'Grind', value: recipe.grind_size || 'Medium' },
            { icon: 'timer', label: 'Duration', value: formatDuration(getBrewDuration(currentScaledRecipe?.steps ?? recipe.steps)) },
        ];

    return (
        <div className="flex flex-col min-h-dvh max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28 overflow-x-hidden">
            {/* Header with active mode switch pill */}
            <PageHeader
                title="Preparation"
                onBack={() => safeBack(id ? `/recipes/${id}` : '/recipes')}
                action={(
                    <button
                        type="button"
                        onClick={() => setIsModeSheetOpen(true)}
                        aria-label={`Change brewing mode (current: ${isSmartScaleMode ? 'Smart Scale' : 'Manual Timer'})`}
                        className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-full typescale-label-small font-bold transition-all active:scale-95 cursor-pointer ${
                            isSmartScaleMode
                                ? 'bg-md-tertiary-container text-md-on-tertiary-container'
                                : 'bg-md-primary-container text-md-on-primary-container'
                        }`}
                    >
                        <Icon name={isSmartScaleMode ? 'scale' : 'timer'} className="text-sm" />
                        <span>{isSmartScaleMode ? 'Smart Scale' : 'Manual'}</span>
                        <Icon name="swap_horiz" className="text-sm opacity-75" />
                    </button>
                )}
            />

            <main className="flex-1 px-5 pt-4 space-y-5">
                {/* Recipe Title Context */}
                <div className="px-0.5">
                    <span className="typescale-label-small font-bold text-md-primary uppercase tracking-wider">
                        {formatMethodName(recipe.method_id)}
                    </span>
                    <h1 className="typescale-title-large font-bold text-md-on-surface leading-snug">
                        {recipe.name}
                    </h1>
                </div>

                {/* Section 1: Dose & Scaled Specs */}
                <section className="space-y-2.5">
                    <SectionHeader
                        step={1}
                        title="Dose & Specs"
                        right={
                            <span className="typescale-label-small font-bold text-md-on-primary-container bg-md-primary-container px-2.5 py-0.5 rounded-full tabular-nums">
                                Ratio {recipe.ratio}
                            </span>
                        }
                    />
                    <div className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3.5">
                        <StepperRow
                            label="Coffee Dose"
                            subtitle={`Base ${baseDose}g`}
                            value={`${adjustedCoffeeDose.toFixed(1)}g`}
                            onDecrement={() => handleAdjustDose(-1)}
                            onIncrement={() => handleAdjustDose(1)}
                            decrementLabel="Decrease coffee dose"
                            incrementLabel="Increase coffee dose"
                        />

                        {isIced && (
                            <>
                                <div className="h-px bg-md-outline-variant/20" />
                                <StepperRow
                                    label="Ice Cubes"
                                    subtitle={customIceWeight !== null ? 'Custom' : 'Default'}
                                    value={`${effectiveIceWeight}g`}
                                    onDecrement={() => handleAdjustIce(-1)}
                                    onIncrement={() => handleAdjustIce(1)}
                                    decrementLabel="Decrease ice weight"
                                    incrementLabel="Increase ice weight"
                                    onReset={customIceWeight !== null ? () => setCustomIceWeight(null) : undefined}
                                />
                            </>
                        )}

                        {/* Live Scaled Specs 2x2 Grid */}
                        <div className="pt-3.5 border-t border-md-outline-variant/20 grid grid-cols-2 gap-x-4 gap-y-3">
                            {scaledSpecs.map((spec) => (
                                <div key={spec.label} className="flex items-center gap-2.5 min-w-0">
                                    <div className="size-8 rounded-xl bg-md-surface-container-high text-md-primary flex items-center justify-center shrink-0">
                                        <Icon name={spec.icon} className="text-lg" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block typescale-label-small text-md-on-surface-variant uppercase tracking-wider font-semibold">
                                            {spec.label}
                                        </span>
                                        <span className="block typescale-title-small font-bold text-md-on-surface tabular-nums truncate">
                                            {spec.value}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Section 2: Pantry Gear (Beans & Filter) */}
                <section className="space-y-2.5">
                    <SectionHeader step={2} title="Pantry Gear" />
                    <div className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3.5">
                        {[
                            {
                                key: 'beans',
                                label: 'Beans',
                                icon: 'inventory_2',
                                items: beans,
                                value: selectedBeanId,
                                onChange: setSelectedBeanId,
                                placeholder: 'Select a coffee bean...',
                                emptyText: 'No beans in pantry',
                                addLabel: 'Add Beans',
                                addPath: '/pantry/add/beans',
                            },
                            {
                                key: 'filter',
                                label: 'Filter',
                                icon: 'filter_list',
                                items: filters,
                                value: selectedFilterId,
                                onChange: setSelectedFilterId,
                                placeholder: 'Select a filter...',
                                emptyText: 'No filters in pantry',
                                addLabel: 'Add Filters',
                                addPath: '/pantry/add/filter',
                            },
                        ].map((gear, idx) => (
                            <div key={gear.key}>
                                {idx > 0 && <div className="h-px bg-md-outline-variant/20 mb-3.5" />}
                                {gear.items.length > 0 ? (
                                    <Dropdown
                                        label={gear.label}
                                        icon={gear.icon}
                                        options={gear.items.map((item) => ({ value: item.id, label: item.name }))}
                                        value={gear.value}
                                        onChange={gear.onChange}
                                        placeholder={gear.placeholder}
                                        className="w-full"
                                    />
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className="block typescale-label-small font-bold uppercase tracking-wider text-md-on-surface-variant">
                                                {gear.label}
                                            </span>
                                            <span className="block typescale-body-small text-md-on-surface-variant">
                                                {gear.emptyText}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigate(gear.addPath)}
                                            className="typescale-label-medium font-bold text-md-on-primary-container bg-md-primary-container px-3.5 py-2 min-h-[40px] rounded-full hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                                        >
                                            {gear.addLabel}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 3: Smart Scale Connection (only in Smart Scale mode) */}
                {isSmartScaleMode && (
                    <section className="space-y-2.5">
                        <SectionHeader
                            step={3}
                            title="Smart Scale"
                            right={
                                <span className={`typescale-label-small font-bold px-2.5 py-0.5 rounded-full ${
                                    connectionState === 'connected'
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-md-tertiary-container text-md-on-tertiary-container'
                                }`}>
                                    {connectionState === 'connected' ? 'Connected' : 'Not Connected'}
                                </span>
                            }
                        />
                        <div className="p-4 rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low shadow-md-1 space-y-4">
                            {connectionState === 'connected' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                                            <span className="typescale-title-small font-bold text-md-on-surface truncate">
                                                {device?.name || 'TIMEMORE_Dot'}
                                            </span>
                                        </div>
                                        {batteryPercent !== undefined && (
                                            <span className="typescale-label-small font-bold text-md-on-surface-variant bg-md-surface-container-high px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-md-outline-variant/20 shrink-0">
                                                <Icon name="battery_full" className="text-xs text-md-primary" />
                                                <span className="tabular-nums font-mono">{batteryPercent}%</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="py-1 flex items-baseline justify-center gap-1.5">
                                        <span className="text-5xl font-light text-md-on-surface tracking-tighter tabular-nums font-sans">
                                            {currentWeight.toFixed(1)}
                                        </span>
                                        <span className="text-xl font-bold text-md-on-surface-variant">g</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.vibrate?.(25);
                                            tare();
                                        }}
                                        className="w-full h-12 rounded-2xl bg-md-primary hover:opacity-95 text-md-on-primary font-bold typescale-label-large flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                                    >
                                        <Icon name="restart_alt" className="text-lg" />
                                        <span>Tare Scale</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-center py-2 space-y-2.5">
                                    <div className="size-11 rounded-full bg-md-tertiary-container text-md-on-tertiary-container flex items-center justify-center">
                                        <Icon name="scale" className="text-2xl" />
                                    </div>
                                    <div>
                                        <h3 className="typescale-title-small font-bold text-md-on-surface">No scale connected</h3>
                                        <p className="typescale-body-small text-md-on-surface-variant">
                                            {Capacitor.isNativePlatform()
                                                ? 'Turn on your Timemore Dot to connect.'
                                                : 'Connect a Timemore Dot or preview with Demo Mode.'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsPairingModalOpen(true)}
                                            className="min-h-[44px] px-4 py-2 rounded-xl bg-md-primary text-md-on-primary font-bold typescale-label-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                                        >
                                            <Icon name="bluetooth" className="text-base" />
                                            <span>Connect Now</span>
                                        </button>
                                        {!Capacitor.isNativePlatform() && (
                                            <button
                                                type="button"
                                                onClick={() => connectMock()}
                                                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-md-surface-container-high text-md-primary font-bold typescale-label-medium flex items-center gap-1.5 hover:bg-md-surface-container-highest transition-colors cursor-pointer border border-md-outline-variant/30"
                                            >
                                                <Icon name="science" className="text-base" />
                                                <span>Demo Mode</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Section 4 (or 3 in Manual): Scaled Steps Preview (collapsible) */}
                {currentScaledRecipe && currentScaledRecipe.steps.length > 0 && (
                    <section className="space-y-2.5">
                        <SectionHeader
                            step={isSmartScaleMode ? 4 : 3}
                            title="Scaled Brew Steps"
                            right={
                                <span className="typescale-label-small font-semibold text-md-on-surface-variant tabular-nums">
                                    {currentScaledRecipe.steps.length} steps · {scaledWaterTotal}
                                </span>
                            }
                        />
                        <div className="bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowStepsPreview(prev => !prev)}
                                aria-expanded={showStepsPreview}
                                className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-md-surface-container-high transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-md-primary"
                            >
                                <span className="typescale-body-medium font-semibold text-md-on-surface">
                                    {showStepsPreview ? 'Hide scaled pour weights' : 'Preview scaled pour weights'}
                                </span>
                                <Icon name={showStepsPreview ? 'expand_less' : 'expand_more'} className="text-xl text-md-on-surface-variant shrink-0" />
                            </button>

                            {showStepsPreview && (
                                <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-md-outline-variant/20">
                                    {currentScaledRecipe.steps.map((step, idx) => {
                                        const pour = getPourAmount(currentScaledRecipe.steps, idx);
                                        const intervalInfo = getStepIntervalInfo(step);
                                        const hasTarget = typeof step.target_weight === 'number' && step.target_weight > 0;
                                        return (
                                            <div key={step.id || idx} className="p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20 space-y-1.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="typescale-title-small font-bold text-md-on-surface flex-1 min-w-0 leading-snug tabular-nums">
                                                        {idx + 1}. {step.label}
                                                    </h4>
                                                    <span className="typescale-label-small font-bold text-md-on-surface-variant bg-md-surface-container-highest px-2 py-0.5 rounded-full shrink-0 tabular-nums">
                                                        {formatStepSeconds(step.duration_seconds)}
                                                    </span>
                                                </div>
                                                {(hasTarget || intervalInfo.restSeconds > 0) && (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {hasTarget && (
                                                            <>
                                                                <span className="inline-flex items-center gap-1 typescale-label-small font-bold text-md-on-primary-container bg-md-primary-container px-2 py-0.5 rounded-full tabular-nums">
                                                                    +{formatWeight(pour, unitSystem)}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 typescale-label-small font-semibold text-md-on-surface-variant bg-md-surface-container-highest px-2 py-0.5 rounded-full tabular-nums">
                                                                    Target {formatWeight(step.target_weight!, unitSystem)}
                                                                </span>
                                                            </>
                                                        )}
                                                        {intervalInfo.restSeconds > 0 && (
                                                            <span className="inline-flex items-center gap-1 typescale-label-small font-semibold text-md-on-secondary-container bg-md-secondary-container px-2 py-0.5 rounded-full tabular-nums">
                                                                Rest {intervalInfo.restSeconds}s
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {step.instruction && (
                                                    <p className="typescale-body-small text-md-on-surface-variant leading-relaxed">
                                                        {step.instruction}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Section 5 (or 4 in Manual): Preparation Checklist */}
                <section className="space-y-2.5 pb-4">
                    <SectionHeader
                        step={isSmartScaleMode ? 5 : 4}
                        title="Preparation Checklist"
                        right={
                            <span className={`typescale-label-small font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
                                isReady
                                    ? 'bg-md-primary-container text-md-on-primary-container'
                                    : 'bg-md-surface-container-high text-md-on-surface-variant'
                            }`}>
                                {checkedCount}/{totalChecklistItems} Checked
                            </span>
                        }
                    />
                    <div className="space-y-2">
                        {dynamicChecklist.map((item) => (
                            <CheckItem
                                key={item.id}
                                label={item.label}
                                checked={Boolean(checkedItems[item.id])}
                                onToggle={() => toggleCheck(item.id)}
                            />
                        ))}
                    </div>
                </section>
            </main>

            {/* Sticky Action Button */}
            <SaveBar
                onClick={handleProceedToBrew}
                disabled={!isReady}
                icon={isReady ? 'timer' : 'lock'}
                label={isReady ? "I'm Ready, Start Timer" : 'Complete Checklist to Start'}
            />
            <Modal
                isOpen={stockWarning !== null}
                type="info"
                title="Not enough ingredients"
                confirmText="Manage Pantry"
                cancelText="Continue anyway"
                onConfirm={() => {
                    manageClicked.current = true;
                    setStockWarning(null);
                }}
                onClose={() => {
                    const wasManage = manageClicked.current;
                    manageClicked.current = false;
                    setStockWarning(null);
                    if (wasManage) {
                        navigate('/pantry');
                    } else {
                        proceedToBrew();
                    }
                }}
                message={
                    <div className="space-y-2 text-left">
                        <p className="typescale-body-medium text-md-on-surface-variant">This brew needs more stock than you have right now:</p>
                        <ul className="list-disc list-inside typescale-body-medium text-md-on-surface pl-4 space-y-0.5">
                            {stockWarning?.map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                    </div>
                }
            />
            <ScalePairingModal
                isOpen={isPairingModalOpen}
                onClose={() => setIsPairingModalOpen(false)}
            />
            <BrewModeSheet
                isOpen={isModeSheetOpen}
                onClose={() => setIsModeSheetOpen(false)}
                recipeName={recipe.name}
                currentMode={brewMode}
                onSelect={(mode) => {
                    setBrewMode(mode);
                    setIsModeSheetOpen(false);
                    if (mode === 'smart-scale' && connectionState !== 'connected') {
                        setIsPairingModalOpen(true);
                    }
                }}
            />
        </div>
    );
};

const CheckItem = ({ label, checked, onToggle }: { label: string, checked: boolean, onToggle: () => void }) => (
    <button
        onClick={onToggle}
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer w-full text-left shadow-md-1 ${
            checked
                ? 'bg-md-secondary-container text-md-on-secondary-container border-md-primary'
                : 'bg-md-surface-container-low text-md-on-surface border-md-outline-variant/30 hover:bg-md-surface-container-high'
        }`}
    >
        <div className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
            checked ? 'bg-md-primary border-md-primary text-md-on-primary' : 'border-md-outline-variant text-transparent'
        }`}>
            <Icon name="check" className="text-base font-bold" />
        </div>
        <span className={`typescale-body-medium font-bold ${checked ? 'text-md-on-secondary-container' : 'text-md-on-surface'}`}>{label}</span>
    </button>
);
