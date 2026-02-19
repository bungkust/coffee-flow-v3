import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService } from '../core/services';
import type { Recipe, BrewStep } from '../shared/domain/entities';
import { BottomNav } from '../components/BottomNav';

export const RecipeEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!id) return;
            try {
                const data = await brewService.getRecipe(id);
                setRecipe(data);
            } catch (err) {
                console.error('Error fetching recipe:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecipe();
    }, [id]);

    const handleSave = async () => {
        if (!recipe) return;
        setSaving(true);
        try {
            await brewService.saveRecipe(recipe);
            navigate(`/recipes/${recipe.id}`);
        } catch (err) {
            console.error('Error saving recipe:', err);
            alert('Failed to save recipe');
        } finally {
            setSaving(false);
        }
    };

    const updateStep = (index: number, updates: Partial<BrewStep>) => {
        if (!recipe) return;
        const newSteps = [...recipe.steps];
        newSteps[index] = { ...newSteps[index], ...updates };
        setRecipe({ ...recipe, steps: newSteps });
    };

    const addStep = () => {
        if (!recipe) return;
        const newStep: BrewStep = {
            id: crypto.randomUUID(),
            recipe_id: recipe.id,
            step_order: recipe.steps.length,
            label: 'New Step',
            duration_seconds: 30,
            target_weight: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        setRecipe({ ...recipe, steps: [...recipe.steps, newStep] });
    };

    const removeStep = (index: number) => {
        if (!recipe) return;
        const newSteps = recipe.steps.filter((_, i) => i !== index)
            .map((step, i) => ({ ...step, step_order: i }));
        setRecipe({ ...recipe, steps: newSteps });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!recipe) return null;

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
                    <span className="text-lg font-bold text-[#181411]">Edit Recipe</span>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-primary font-bold px-4 py-2 hover:bg-primary/5 rounded-xl transition-all"
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="px-6 py-6 space-y-8">
                {/* Basic Info */}
                <section className="space-y-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Basic Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Recipe Name</label>
                            <input
                                type="text"
                                value={recipe.name}
                                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Ratio</label>
                                <input
                                    type="text"
                                    value={recipe.ratio}
                                    onChange={(e) => setRecipe({ ...recipe, ratio: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="1:15"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Total Water (ml)</label>
                                <input
                                    type="number"
                                    value={recipe.total_water}
                                    onChange={(e) => setRecipe({ ...recipe, total_water: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Temp (°C)</label>
                                <input
                                    type="number"
                                    value={recipe.temperature}
                                    onChange={(e) => setRecipe({ ...recipe, temperature: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Grind Size</label>
                                <input
                                    type="text"
                                    value={recipe.grind_size || ''}
                                    onChange={(e) => setRecipe({ ...recipe, grind_size: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="Medium"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Steps Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Brewing Steps</h2>
                        <button
                            onClick={addStep}
                            className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                            <Icon name="add" className="text-[16px]" />
                            Add Step
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recipe.steps.map((step, index) => (
                            <div key={step.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 relative group">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <input
                                            type="text"
                                            value={step.label}
                                            onChange={(e) => updateStep(index, { label: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-base font-bold text-[#181411] focus:ring-0 placeholder:text-gray-300"
                                            placeholder="Step label..."
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duration (s)</label>
                                                <input
                                                    type="number"
                                                    value={step.duration_seconds}
                                                    onChange={(e) => updateStep(index, { duration_seconds: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-sm font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Target (g)</label>
                                                <input
                                                    type="number"
                                                    value={step.target_weight || 0}
                                                    onChange={(e) => updateStep(index, { target_weight: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-sm font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeStep(index)}
                                        className="text-gray-300 hover:text-red-400 transition-colors p-1"
                                    >
                                        <Icon name="delete" className="text-[20px]" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <BottomNav activeTab="brewing" />
        </div>
    );
};
