import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService, pantryService } from '../core/services';
import type { Recipe } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';
import { useBrewStore } from '../state/useBrewStore';
import { Dropdown } from '../components/Dropdown';

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
        if (recipe) {
            startBrew(recipe, selectedBeanId, selectedFilterId);
            navigate('/brew-flow');
        }
    };

    const toggleCheck = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isReady = checklist.coffee && checklist.water && checklist.filter && checklist.scale;

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
                            {Math.round((recipe.total_water || 0) / parseFloat(recipe.ratio.split(':')[1] || '15'))}g
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Coffee</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="water_drop" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">{recipe.total_water}ml</span>
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
                                    onClick={() => navigate('/pantry')}
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
                                    onClick={() => navigate('/pantry')}
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
                        label={`Weigh ${Math.round((recipe.total_water || 0) / parseFloat(recipe.ratio.split(':')[1] || '15'))}g coffee & Grind (${recipe.grind_size || 'Medium'})`}
                        checked={checklist.coffee}
                        onToggle={() => toggleCheck('coffee')}
                    />
                    <CheckItem
                        label={`Heat ${recipe.total_water}ml water to ${recipe.temperature}°C`}
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
