import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService, pantryService, settingsService } from '../core/services';
import type { Recipe } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';
import { useBrewStore } from '../state/useBrewStore';
import { Dropdown } from '../components/Dropdown';
import { Button } from '../components/Button';
import { calculateCoffeeDose, formatWeight, formatVolume, parseRatio, scaleRecipe, scaleInstructionText, getPourAmount, getStepIntervalInfo, type UnitSystem } from '../shared/utils/brewMath';

const DEFAULT_ICE_RATIO = 4.375;
const ICE_RATIO_BY_RECIPE: Record<string, number> = {
    'chemex-pull-and-pour-japanese-iced': 7.5,
    'v60-bean-rock-iced-japanese': 6
};

export const RecipePreparationPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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

    useEffect(() => {
        if (recipe) {
            const initialDose = calculateCoffeeDose(recipe.total_water, recipe.ratio);
            setAdjustedCoffeeDose(initialDose || 15);
        }
    }, [recipe]);

    const ratioMultiplier = recipe ? (parseRatio(recipe.ratio) || 16) : 16;
    const adjustedWaterVolume = adjustedCoffeeDose * ratioMultiplier;

    const isIced = Boolean(
        recipe?.style?.toLowerCase().includes('iced') ||
        recipe?.name?.toLowerCase().includes('iced') ||
        recipe?.id?.toLowerCase().includes('iced') ||
        recipe?.steps?.some(s => s.instruction?.toLowerCase().includes('ice') || s.label?.toLowerCase().includes('ice'))
    );

    const defaultIceWeight = recipe
        ? Math.round((ICE_RATIO_BY_RECIPE[recipe.id] ?? DEFAULT_ICE_RATIO) * adjustedCoffeeDose)
        : 70;

    const [customIceWeight, setCustomIceWeight] = useState<number | null>(null);
    const effectiveIceWeight = isIced ? (customIceWeight ?? defaultIceWeight) : 0;
    const hotWaterVolume = isIced ? Math.max(20, adjustedWaterVolume - effectiveIceWeight) : adjustedWaterVolume;

    const currentScaledRecipe = useMemo(() => {
        if (!recipe) return null;
        const scaled = scaleRecipe(recipe, adjustedCoffeeDose);
        if (!isIced) return scaled;

        const pourSteps = scaled.steps.filter(s => typeof s.target_weight === 'number' && s.target_weight > 0);
        const maxPourTarget = pourSteps.length > 0 ? Math.max(...pourSteps.map(s => s.target_weight!)) : 0;
        if (maxPourTarget <= 0) return scaled;

        const hotWaterScale = hotWaterVolume / maxPourTarget;

        const adjustedSteps = scaled.steps.map(step => {
            if (step.label?.toLowerCase().includes('ice') || step.instruction?.toLowerCase().includes('ice')) {
                const scaledInstruction = step.instruction?.replace(/\b(\d+(?:\.\d+)?)\s*(g|ml)\b/gi, () => {
                    return `${effectiveIceWeight}g`;
                });
                return { ...step, instruction: scaledInstruction };
            }

            if (typeof step.target_weight === 'number' && step.target_weight > 0) {
                const adjustedTarget = Math.round(step.target_weight * hotWaterScale * 10) / 10;
                const adjustedInstruction = scaleInstructionText(step.instruction, hotWaterScale);
                return {
                    ...step,
                    target_weight: adjustedTarget,
                    instruction: adjustedInstruction
                };
            }
            return step;
        });

        return {
            ...scaled,
            total_water: Math.round(hotWaterVolume + effectiveIceWeight),
            steps: adjustedSteps
        };
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

                if (availableBeans.length > 0) setSelectedBeanId(availableBeans[0].id);
                if (availableFilters.length > 0) setSelectedFilterId(availableFilters[0].id);
            } catch (error) {
                console.error('Failed to load recipe:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecipe();
    }, [id]);

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
            label: 'Add coffee grounds to brewer & tare scale'
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
                    onClick={() => navigate(-1)}
                    className="mt-4 text-md-primary font-bold hover:underline cursor-pointer"
                >
                    Back to previous page
                </button>
            </div>
        );
    }

    const handleProceedToBrew = () => {
        if (currentScaledRecipe && isReady) {
            startBrew(currentScaledRecipe, selectedBeanId, selectedFilterId, adjustedCoffeeDose);
            navigate('/brew-flow');
        }
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
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
                    <span className="typescale-headline-small font-bold text-md-on-surface">Preparation</span>
                </div>
            </header>

            {/* Preparation Banner Title */}
            <div className="px-5 py-5 border-b border-md-outline-variant/20 bg-md-surface-container-low/60 space-y-1">
                <span className="typescale-label-medium font-bold text-md-primary uppercase tracking-wider">Ready to Brew?</span>
                <h1 className="typescale-headline-small font-bold text-md-on-surface leading-tight">{recipe.name}</h1>
                <p className="typescale-body-small text-md-on-surface-variant">Make sure you have everything ready before we start the timer.</p>
            </div>

            <main className="flex-1 px-5 pt-4 space-y-5">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-low border border-md-outline-variant/30 shadow-md-1">
                        <Icon name="coffee" className="text-md-primary mb-1 text-xl" />
                        <span className="typescale-title-small font-bold text-md-on-surface">
                            {formatWeight(adjustedCoffeeDose, unitSystem)}
                        </span>
                        <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">Coffee</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-low border border-md-outline-variant/30 shadow-md-1">
                        <Icon name="water_drop" className="text-md-primary mb-1 text-xl" />
                        <span className="typescale-title-small font-bold text-md-on-surface">{formatVolume(hotWaterVolume, unitSystem)}</span>
                        <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">{isIced ? 'Hot Water' : 'Water'}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-low border border-md-outline-variant/30 shadow-md-1">
                        <Icon name={isIced ? "ac_unit" : "thermostat"} className="text-md-primary mb-1 text-xl" />
                        <span className="typescale-title-small font-bold text-md-on-surface">
                            {isIced ? formatWeight(effectiveIceWeight, unitSystem) : `${recipe.temperature}°C`}
                        </span>
                        <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">{isIced ? 'Ice' : 'Temp'}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-low border border-md-outline-variant/30 shadow-md-1">
                        <Icon name="grain" className="text-md-primary mb-1 text-xl" />
                        <span className="typescale-title-small font-bold text-md-on-surface line-clamp-1">{recipe.grind_size || 'Coarse'}</span>
                        <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">Grind</span>
                    </div>
                </div>

                {/* Dose & Ice Adjuster Card */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">
                            {isIced ? 'Adjust Dose & Ice' : 'Adjust Brew Dose'}
                        </span>
                        <span className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1 rounded-full">Ratio {recipe.ratio}</span>
                    </div>

                    {/* Coffee Dose Stepper */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4 py-1">
                            <button
                                onClick={() => handleAdjustDose(-1)}
                                className="size-11 rounded-full border border-md-outline-variant/40 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all active:scale-95 flex items-center justify-center font-bold text-2xl cursor-pointer"
                            >
                                -
                            </button>
                            <div className="flex flex-col items-center flex-1">
                                <span className="typescale-headline-medium font-extrabold text-md-on-surface tracking-tight tabular-nums">{adjustedCoffeeDose.toFixed(1)}g</span>
                                <span className="typescale-label-small text-md-on-surface-variant/70 font-bold uppercase tracking-wider">Coffee Dose</span>
                            </div>
                            <button
                                onClick={() => handleAdjustDose(1)}
                                className="size-11 rounded-full border border-md-outline-variant/40 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all active:scale-95 flex items-center justify-center font-bold text-2xl cursor-pointer"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Ice Stepper (Only for Iced Recipes) */}
                    {isIced && (
                        <>
                            <div className="h-px bg-md-outline-variant/20"></div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center px-1 mb-1">
                                    <span className="typescale-label-small font-bold uppercase tracking-wider text-md-primary flex items-center gap-1">
                                        <Icon name="ac_unit" className="text-sm" /> Ice Cubes Target
                                    </span>
                                    {customIceWeight !== null && (
                                        <button
                                            onClick={() => setCustomIceWeight(null)}
                                            className="typescale-label-small text-md-outline hover:text-md-primary transition-colors cursor-pointer font-medium"
                                        >
                                            Reset Ratio
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-4 py-1">
                                    <button
                                        onClick={() => handleAdjustIce(-1)}
                                        className="size-11 rounded-full border border-md-outline-variant/40 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all active:scale-95 flex items-center justify-center font-bold text-2xl cursor-pointer"
                                    >
                                        -
                                    </button>
                                    <div className="flex flex-col items-center flex-1">
                                        <span className="typescale-headline-medium font-extrabold text-md-on-surface tracking-tight tabular-nums">{effectiveIceWeight}g</span>
                                        <span className="typescale-label-small text-md-on-surface-variant/70 font-bold uppercase tracking-wider">
                                            {customIceWeight !== null ? 'Custom Ice' : 'Default Ice'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleAdjustIce(1)}
                                        className="size-11 rounded-full border border-md-outline-variant/40 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all active:scale-95 flex items-center justify-center font-bold text-2xl cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-md-outline-variant/20"></div>
                    <div className={`grid ${isIced ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-center`}>
                        <div>
                            <span className="typescale-label-small font-semibold text-md-on-surface-variant/80 block mb-0.5">
                                {isIced ? 'Hot Water' : 'Scaled Water'}
                            </span>
                            <span className="typescale-title-medium font-extrabold text-md-on-surface tabular-nums">{Math.round(hotWaterVolume)}ml</span>
                        </div>
                        {isIced && (
                            <div>
                                <span className="typescale-label-small font-semibold text-md-on-surface-variant/80 block mb-0.5">Ice Cubes</span>
                                <span className="typescale-title-medium font-extrabold text-md-on-surface tabular-nums">{Math.round(effectiveIceWeight)}g</span>
                            </div>
                        )}
                        <div>
                            <span className="typescale-label-small font-semibold text-md-on-surface-variant/80 block mb-0.5">Total Brew</span>
                            <span className="typescale-title-medium font-extrabold text-md-on-surface tabular-nums">{Math.round(adjustedWaterVolume)}ml</span>
                        </div>
                    </div>
                </div>

                {/* Scaled Steps Preview */}
                {currentScaledRecipe && currentScaledRecipe.steps.length > 0 && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                                <Icon name="format_list_numbered" className="text-md-primary text-base" />
                                Scaled Brew Steps
                            </span>
                            <span className="typescale-label-small font-bold text-md-on-surface-variant bg-md-surface-container-high px-2.5 py-0.5 rounded-full border border-md-outline-variant/20">
                                {formatVolume(currentScaledRecipe.total_water || 0, unitSystem)} Total Water
                            </span>
                        </div>
                        <div className="space-y-3 mt-2">
                            {currentScaledRecipe.steps.map((step, idx) => {
                                const pour = getPourAmount(currentScaledRecipe.steps, idx);
                                const intervalInfo = getStepIntervalInfo(step);
                                return (
                                    <div key={step.id || idx} className="p-4 rounded-2xl bg-md-surface-container-high/60 border border-md-outline-variant/20 space-y-2">
                                        {/* Row 1: Title & Duration Pill */}
                                        <div className="flex items-start justify-between gap-3">
                                            <h4 className="typescale-title-small font-bold text-md-on-surface flex-1 min-w-0 leading-snug">
                                                {idx + 1}. {step.label}
                                            </h4>
                                            <span className="typescale-label-small font-bold text-md-on-surface-variant bg-md-surface-container-highest px-2.5 py-0.5 rounded-full shrink-0 border border-md-outline-variant/20">
                                                {step.duration_seconds}s
                                            </span>
                                        </div>

                                        {/* Row 2: Target, Pour Amount & Interval Chips */}
                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                            {typeof step.target_weight === 'number' && step.target_weight > 0 && (
                                                <>
                                                    <span className="inline-flex items-center gap-1 typescale-label-small font-extrabold text-md-primary bg-md-primary-container/40 px-2.5 py-0.5 rounded-full border border-md-primary/20">
                                                        <Icon name="water_drop" className="text-xs" />
                                                        +{formatWeight(pour, unitSystem)}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 typescale-label-small font-bold text-md-on-surface-variant bg-md-surface-container-highest px-2.5 py-0.5 rounded-full border border-md-outline-variant/20">
                                                        <Icon name="scale" className="text-xs text-md-on-surface-variant/70" />
                                                        Target: {formatWeight(step.target_weight, unitSystem)}
                                                    </span>
                                                </>
                                            )}

                                            {intervalInfo.restSeconds > 0 && (
                                                <span className="inline-flex items-center gap-1 typescale-label-small font-bold text-md-secondary bg-md-secondary-container/40 px-2.5 py-0.5 rounded-full border border-md-secondary/20">
                                                    <Icon name="hourglass_empty" className="text-xs" />
                                                    Rest: {intervalInfo.restSeconds}s
                                                </span>
                                            )}
                                        </div>

                                        {/* Row 3: Step Instruction */}
                                        {step.instruction && (
                                            <p className="typescale-body-small text-md-on-surface-variant leading-relaxed pt-0.5">
                                                {step.instruction}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bean Selection */}
                <div>
                    {beans.length > 0 ? (
                        <Dropdown
                            label="Choose Beans from Pantry"
                            icon="inventory_2"
                            options={beans.map(b => ({ value: b.id, label: b.name }))}
                            value={selectedBeanId}
                            onChange={setSelectedBeanId}
                            placeholder="Select a coffee bean..."
                            className="w-full"
                        />
                    ) : (
                        <div className="flex flex-col gap-2">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                <Icon name="inventory_2" className="text-base" /> Choose Beans from Pantry
                            </label>
                            <div className="p-4 bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl flex items-center justify-between shadow-md-1">
                                <span className="typescale-body-medium text-md-on-surface-variant font-medium">No beans available</span>
                                <button
                                    onClick={() => navigate('/pantry/add/beans')}
                                    className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                                >
                                    Add Beans
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filter Selection */}
                <div>
                    {filters.length > 0 ? (
                        <Dropdown
                            label="Choose Filter from Pantry"
                            icon="filter_list"
                            options={filters.map(f => ({ value: f.id, label: f.name }))}
                            value={selectedFilterId}
                            onChange={setSelectedFilterId}
                            placeholder="Select a filter..."
                            className="w-full"
                        />
                    ) : (
                        <div className="flex flex-col gap-2">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                <Icon name="filter_list" className="text-base" /> Choose Filter from Pantry
                            </label>
                            <div className="p-4 bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl flex items-center justify-between shadow-md-1">
                                <span className="typescale-body-medium text-md-on-surface-variant font-medium">No filters available</span>
                                <button
                                    onClick={() => navigate('/pantry/add/filter')}
                                    className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                                >
                                    Add Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Checklist Section */}
                <div className="pt-2">
                    <div className="flex items-center justify-between mb-3.5">
                        <h2 className="typescale-title-medium font-bold text-md-on-surface flex items-center gap-2">
                            <Icon name="checklist" className="text-md-primary" />
                            Preparation Checklist
                        </h2>
                        <span className={`typescale-label-small font-bold px-2.5 py-0.5 rounded-full border ${
                            isReady
                                ? 'bg-md-primary-container text-md-on-primary-container border-md-primary/20'
                                : 'bg-md-surface-container-high text-md-on-surface-variant border-md-outline-variant/30'
                        }`}>
                            {checkedCount}/{totalChecklistItems} Checked
                        </span>
                    </div>
                    <div className="space-y-2.5">
                        {dynamicChecklist.map((item) => (
                            <CheckItem
                                key={item.id}
                                label={item.label}
                                checked={Boolean(checkedItems[item.id])}
                                onToggle={() => toggleCheck(item.id)}
                            />
                        ))}
                    </div>
                </div>
            </main>

            {/* Sticky Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 max-w-md mx-auto z-20">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={handleProceedToBrew}
                    disabled={!isReady}
                    className="w-full"
                >
                    <Icon name={isReady ? "timer" : "lock"} className="text-xl" />
                    <span>{isReady ? "I'm Ready, Start Timer" : "Complete Checklist to Start"}</span>
                </Button>
            </div>
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
