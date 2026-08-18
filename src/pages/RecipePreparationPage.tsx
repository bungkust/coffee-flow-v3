import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService, pantryService, settingsService } from '../core/services';
import type { Recipe } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';
import { useBrewStore } from '../state/useBrewStore';
import { Dropdown } from '../components/Dropdown';
import { calculateCoffeeDose, formatWeight, formatVolume, parseRatio, scaleRecipe, getPourAmount, type UnitSystem } from '../shared/utils/brewMath';

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
    const [checklist, setChecklist] = useState({
        coffee: false,
        water: false,
        filter: false,
        scale: false
    });
    const [adjustedCoffeeDose, setAdjustedCoffeeDose] = useState<number>(0);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

    useEffect(() => {
        if (recipe) {
            const initialDose = calculateCoffeeDose(recipe.total_water, recipe.ratio);
            setAdjustedCoffeeDose(initialDose || 15);
        }
    }, [recipe]);

    const initialCoffeeDose = recipe ? (calculateCoffeeDose(recipe.total_water, recipe.ratio) || 15) : 15;
    const ratioMultiplier = recipe ? (parseRatio(recipe.ratio) || 16) : 16;
    const adjustedWaterVolume = adjustedCoffeeDose * ratioMultiplier;

    const currentScaledRecipe = recipe ? scaleRecipe(recipe, adjustedCoffeeDose) : null;

    const handleAdjustDose = (delta: number) => {
        setAdjustedCoffeeDose(prev => {
            const next = prev + delta * 0.5;
            return Math.round(Math.max(5, Math.min(100, next)) * 10) / 10;
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
                    setSelectedBeanId(availableBeans[0].id);
                }
                if (availableFilters.length > 0) {
                    setSelectedFilterId(availableFilters[0].id);
                }
            } catch (err) {
                console.error('Error fetching recipe:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecipe();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
                <Icon name="error" className="text-5xl text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-neutral-text">Recipe not found</h2>
                <button
                    onClick={() => navigate('/recipes')}
                    className="mt-4 text-primary font-bold hover:underline"
                >
                    Back to recipes
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

    const toggleCheck = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isReady = checklist.coffee && checklist.water && checklist.filter && checklist.scale
        && (beans.length === 0 || selectedBeanId !== '')
        && (filters.length === 0 || selectedFilterId !== '');

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-white shadow-2xl pb-32 font-display text-[#181411]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md pt-12 pb-4 px-6 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-[#181411] hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <Icon name="arrow_back" className="text-[24px]" />
                    </button>
                    <span className="text-lg font-bold text-[#181411]">Preparation</span>
                </div>
            </div>

            {/* Preparation Title */}
            <div className="px-6 py-6 border-b border-gray-50 bg-gray-50/30">
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Ready to Brew?</span>
                <h1 className="text-2xl font-bold text-[#181411] leading-tight mt-1">{recipe.name}</h1>
                <p className="text-sm text-gray-500 mt-2">Make sure you have everything ready before we start the timer.</p>
            </div>

            {/* Stats Quad */}
            <div className="px-6 py-6">
                <div className="grid grid-cols-4 gap-2 mb-6">
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="coffee" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">
                            {formatWeight(adjustedCoffeeDose, unitSystem)}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Coffee</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="water_drop" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">{formatVolume(adjustedWaterVolume, unitSystem)}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Water</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="thermostat" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">{recipe.temperature}°C</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Temp</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="grain" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">{recipe.grind_size || 'Coarse'}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Grind</span>
                    </div>
                </div>

                {/* Dose Adjuster Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Adjust Brew Dose</span>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">Ratio {recipe.ratio}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2">
                        <button
                            onClick={() => handleAdjustDose(-1)}
                            className="w-12 h-12 rounded-full border border-gray-200 hover:border-primary/20 hover:bg-primary/5 text-gray-500 hover:text-primary transition-all active:scale-95 flex items-center justify-center font-bold text-xl cursor-pointer"
                        >
                            -
                        </button>
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-3xl font-extrabold text-[#181411] tracking-tight tabular-nums">{adjustedCoffeeDose.toFixed(1)}g</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Coffee Target</span>
                        </div>
                        <button
                            onClick={() => handleAdjustDose(1)}
                            className="w-12 h-12 rounded-full border border-gray-200 hover:border-primary/20 hover:bg-primary/5 text-gray-500 hover:text-primary transition-all active:scale-95 flex items-center justify-center font-bold text-xl cursor-pointer"
                        >
                            +
                        </button>
                    </div>
                    <div className="h-px bg-gray-100"></div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <span className="text-xs font-semibold text-gray-400 block mb-0.5">Scaled Water</span>
                            <span className="text-base font-extrabold text-[#181411] tabular-nums">{Math.round(adjustedWaterVolume)}ml</span>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-gray-400 block mb-0.5">Scale Ratio</span>
                            <span className="text-base font-extrabold text-[#181411] tabular-nums">{Math.round((adjustedCoffeeDose / initialCoffeeDose) * 100)}%</span>
                        </div>
                    </div>
                </div>

                {/* Scaled Steps Preview */}
                {currentScaledRecipe && currentScaledRecipe.steps.length > 0 && (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 mb-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Icon name="format_list_numbered" className="text-primary text-[16px]" />
                                Scaled Brew Steps
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {formatVolume(currentScaledRecipe.total_water || 0, unitSystem)} Total Water
                            </span>
                        </div>
                        <div className="space-y-2 mt-1">
                            {currentScaledRecipe.steps.map((step, idx) => {
                                const pour = getPourAmount(currentScaledRecipe.steps, idx);
                                return (
                                    <div key={step.id || idx} className="p-3 rounded-lg bg-gray-50/70 border border-gray-100/80 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#181411]">
                                                {idx + 1}. {step.label}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {typeof step.target_weight === 'number' && step.target_weight > 0 && (
                                                    <span className="text-xs font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                                        +{formatWeight(pour, unitSystem)} (Target: {formatWeight(step.target_weight, unitSystem)})
                                                    </span>
                                                )}
                                                <span className="text-xs font-semibold text-gray-400">
                                                    {step.duration_seconds}s
                                                </span>
                                            </div>
                                        </div>
                                        {step.instruction && (
                                            <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
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
                <div className="mb-4">
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
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <Icon name="inventory_2" className="text-[16px]" /> Choose Beans from Pantry
                            </label>
                            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-500">No beans available</span>
                                <button
                                    onClick={() => navigate('/pantry/add/beans')}
                                    className="text-primary font-bold text-sm bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors"
                                >
                                    Add Beans
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filter Selection */}
                <div className="mb-2">
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
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <Icon name="filter_list" className="text-[16px]" /> Choose Filter from Pantry
                            </label>
                            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-500">No filters available</span>
                                <button
                                    onClick={() => navigate('/pantry/add/filter')}
                                    className="text-primary font-bold text-sm bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors"
                                >
                                    Add Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Checklist Section */}
            <div className="px-6 pb-32">
                <h2 className="text-lg font-bold text-[#181411] mb-5 flex items-center gap-2">
                    <Icon name="checklist" className="text-primary" />
                    Preparation Checklist
                </h2>
                <div className="space-y-3">
                    <CheckItem
                        label={`Weigh ${formatWeight(adjustedCoffeeDose, unitSystem)} coffee & Grind (${recipe.grind_size || 'Medium'})`}
                        checked={checklist.coffee}
                        onToggle={() => toggleCheck('coffee')}
                    />
                    <CheckItem
                        label={`Heat ${formatVolume(adjustedWaterVolume, unitSystem)} water to ${recipe.temperature}°C`}
                        checked={checklist.water}
                        onToggle={() => toggleCheck('water')}
                    />
                    <CheckItem
                        label="Rinse filter paper & preheat dripper"
                        checked={checklist.filter}
                        onToggle={() => toggleCheck('filter')}
                    />
                    <CheckItem
                        label="Add coffee to dripper & tare scale"
                        checked={checklist.scale}
                        onToggle={() => toggleCheck('scale')}
                    />
                </div>
            </div>

            {/* Sticky Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent max-w-md mx-auto z-20">
                <button
                    onClick={handleProceedToBrew}
                    disabled={!isReady}
                    className={`w-full py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer font-bold ${isReady ? 'bg-primary text-white shadow-primary/30' : 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                        }`}
                >
                    <Icon name="timer" />
                    I'm Ready, Start Timer
                </button>
            </div>
        </div>
    );
};

const CheckItem = ({ label, checked, onToggle }: { label: string, checked: boolean, onToggle: () => void }) => (
    <button
        onClick={onToggle}
        className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer w-full text-left ${checked ? 'bg-primary-light/30 border-primary/20' : 'bg-white border-gray-100'
            }`}
    >
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-primary border-primary text-white' : 'border-gray-200'
            }`}>
            {checked && <Icon name="check" className="text-[16px] font-bold" />}
        </div>
        <span className={`text-sm font-bold ${checked ? 'text-primary' : 'text-[#181411]'}`}>{label}</span>
    </button>
);

