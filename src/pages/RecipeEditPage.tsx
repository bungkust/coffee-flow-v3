import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { brewService } from '../core/services';
import type { Recipe, BrewStep } from '../shared/domain/entities';
import { BottomNav } from '../components/BottomNav';
import { parseRatio } from '../shared/utils/brewMath';

type RecipeDifficulty = NonNullable<Recipe['difficulty']>;

export const RecipeEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const prefill = (location.state as { prefill?: Partial<Recipe> } | null)?.prefill;

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!id) return;
            try {
                if (id === 'new') {
                    const method = (searchParams.get('method') || 'V60').toLowerCase();
                    const newId = crypto.randomUUID();
                    const now = new Date().toISOString();

                    if (prefill) {
                        // Pre-fill from import — recipe is NOT saved yet
                        setRecipe({
                            id: newId,
                            method_id: prefill.method_id || method,
                            name: prefill.name || '',
                            ratio: prefill.ratio || '',
                            temperature: prefill.temperature,
                            grind_size: prefill.grind_size || '',
                            difficulty: prefill.difficulty || 'Intermediate',
                            total_water: prefill.total_water,
                            description_short: prefill.description_short || '',
                            description_detailed: prefill.description_detailed || '',
                            philosophy: prefill.philosophy || '',
                            best_for_tags: prefill.best_for_tags || [],
                            not_recommended_tags: prefill.not_recommended_tags || [],
                            is_custom: true,
                            is_favorite: false,
                            version: 1,
                            created_at: now,
                            updated_at: now,
                            steps: (prefill.steps || []).map((step, idx) => ({
                                ...step,
                                id: crypto.randomUUID(),
                                recipe_id: newId,
                                step_order: idx + 1,
                                created_at: now,
                                updated_at: now,
                            }))
                        });
                    } else {
                        // Blank template for manual creation
                        setRecipe({
                            id: newId,
                            method_id: method,
                            name: '',
                            ratio: '',
                            temperature: undefined,
                            grind_size: '',
                            total_water: undefined,
                            is_custom: true,
                            is_favorite: false,
                            version: 1,
                            created_at: now,
                            updated_at: now,
                            steps: [
                                { id: crypto.randomUUID(), recipe_id: newId, step_order: 1, label: '', duration_seconds: 0, target_weight: undefined, created_at: now, updated_at: now }
                            ]
                        });
                    }
                } else {
                    const data = await brewService.getRecipe(id);
                    setRecipe(data);
                }
            } catch (err) {
                console.error('Error fetching recipe:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecipe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, searchParams]);

    const handleSave = async () => {
        if (!recipe) return;
        if (!recipe.name.trim()) {
            setError('Recipe name is required.');
            return;
        }
        if (!parseRatio(recipe.ratio)) {
            setError('Use a valid ratio, for example 1:15.');
            return;
        }
        if (!recipe.total_water || recipe.total_water <= 0) {
            setError('Total water must be greater than 0.');
            return;
        }
        if (recipe.steps.length === 0 || recipe.steps.some(step => !step.label.trim() || step.duration_seconds <= 0)) {
            setError('Every step needs a label and duration greater than 0.');
            return;
        }
        const targets = recipe.steps
            .map(step => step.target_weight)
            .filter((target): target is number => typeof target === 'number' && target > 0);
        if (targets.some(target => recipe.total_water && target > recipe.total_water)) {
            setError('Step target cannot be higher than total water.');
            return;
        }
        if (targets.some((target, index) => index > 0 && target <= targets[index - 1])) {
            setError('Step targets must be cumulative and increase over time.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await brewService.saveRecipe({
                ...recipe,
                steps: recipe.steps.map((step, index) => ({ ...step, step_order: index + 1 }))
            });
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
            step_order: recipe.steps.length + 1,
            label: 'New Step',
            duration_seconds: 30,
            target_weight: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        setRecipe({ ...recipe, steps: [...recipe.steps, newStep] });
    };

    const removeStep = (index: number) => {
        if (!recipe) return;
        const newSteps = recipe.steps.filter((_, i) => i !== index)
            .map((step, i) => ({ ...step, step_order: i + 1 }));
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
                    <span className="text-lg font-bold text-[#181411]">
                        {id === 'new' ? 'Create Recipe' : 'Edit Recipe'}
                    </span>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-primary font-bold px-4 py-2 hover:bg-primary/5 rounded-xl transition-all cursor-pointer"
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="px-6 py-6 space-y-8">
                {error && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                        {error}
                    </div>
                )}
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
                                placeholder="e.g. Even Extraction Flow"
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
                                    value={recipe.total_water || ''}
                                    onChange={(e) => setRecipe({ ...recipe, total_water: parseInt(e.target.value) || undefined })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="250"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                                <Dropdown
                                    buttonClassName="py-3 bg-gray-50 border-gray-100"
                                    value={recipe.difficulty || ''}
                                    options={[
                                        { value: 'Beginner', label: 'Beginner' },
                                        { value: 'Intermediate', label: 'Intermediate' },
                                        { value: 'Advanced', label: 'Advanced' }
                                    ]}
                                    onChange={(val) => setRecipe({ ...recipe, difficulty: val as RecipeDifficulty })}
                                    placeholder="Select"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Style</label>
                                <input
                                    type="text"
                                    value={recipe.style || ''}
                                    onChange={(e) => setRecipe({ ...recipe, style: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="Balanced / Round"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Temp (°C)</label>
                                <input
                                    type="number"
                                    value={recipe.temperature || ''}
                                    onChange={(e) => setRecipe({ ...recipe, temperature: parseInt(e.target.value) || undefined })}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="92"
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

                {/* Details Section */}
                <section className="space-y-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Details & Philosophy</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Short Description</label>
                            <input
                                type="text"
                                value={recipe.description_short || ''}
                                onChange={(e) => setRecipe({ ...recipe, description_short: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="A brief summary..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Detailed Description</label>
                            <textarea
                                value={recipe.description_detailed || ''}
                                onChange={(e) => setRecipe({ ...recipe, description_detailed: e.target.value })}
                                rows={3}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                placeholder="Explain the brewing approach..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Philosophy</label>
                            <textarea
                                value={recipe.philosophy || ''}
                                onChange={(e) => setRecipe({ ...recipe, philosophy: e.target.value })}
                                rows={2}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                placeholder="Why this recipe works..."
                            />
                        </div>
                    </div>
                </section>

                {/* Tags Section */}
                <section className="space-y-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tags (Comma Separated)</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Best For</label>
                            <input
                                type="text"
                                value={(recipe.best_for_tags || []).join(', ')}
                                onChange={(e) => setRecipe({ ...recipe, best_for_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                placeholder="Arabica, Light Roast, Washed"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Not Recommended For</label>
                            <input
                                type="text"
                                value={(recipe.not_recommended_tags || []).join(', ')}
                                onChange={(e) => setRecipe({ ...recipe, not_recommended_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                placeholder="Dark Roast, Robusta"
                            />
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
                                        <textarea
                                            value={step.instruction || ''}
                                            onChange={(e) => updateStep(index, { instruction: e.target.value })}
                                            rows={2}
                                            className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary/20 outline-none resize-none placeholder:text-gray-300"
                                            placeholder="Step instruction..."
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Duration (s)</label>
                                                <input
                                                    type="number"
                                                    value={step.duration_seconds || ''}
                                                    onChange={(e) => updateStep(index, { duration_seconds: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-sm font-bold"
                                                    placeholder="30"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Target (g)</label>
                                                <input
                                                    type="number"
                                                    value={step.target_weight || ''}
                                                    onChange={(e) => updateStep(index, { target_weight: parseInt(e.target.value) || undefined })}
                                                    className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-sm font-bold"
                                                    placeholder="50"
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
