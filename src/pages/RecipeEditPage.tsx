import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { BottomNav } from '../components/BottomNav';
import { Dropdown } from '../components/Dropdown';
import { brewService } from '../core/services';
import type { Recipe, BrewStep } from '../shared/domain/entities';

export const RecipeEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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
                    const method_id = (location.state as { method_id?: string } | null)?.method_id || 'v60';
                    const newId = `${method_id}-custom-${Date.now()}`;
                    const now = new Date().toISOString();

                    if (prefill) {
                        setRecipe({
                            id: newId,
                            method_id: prefill.method_id || method_id,
                            name: prefill.name || '',
                            ratio: prefill.ratio || '1:15',
                            total_water: prefill.total_water || 250,
                            grind_size: prefill.grind_size || 'Medium',
                            temperature: prefill.temperature || 92,
                            difficulty: prefill.difficulty || 'Intermediate',
                            style: prefill.style || 'Balanced',
                            description_short: prefill.description_short || '',
                            description_detailed: prefill.description_detailed || '',
                            philosophy: prefill.philosophy || '',
                            best_for_tags: prefill.best_for_tags || [],
                            not_recommended_tags: prefill.not_recommended_tags || [],
                            is_custom: true,
                            created_at: now,
                            updated_at: now,
                            steps: prefill.steps && prefill.steps.length > 0 ? prefill.steps : [
                                { id: `${newId}-1`, recipe_id: newId, step_order: 1, label: 'Bloom', duration_seconds: 30, target_weight: 50, instruction: 'Pour water evenly', created_at: now, updated_at: now }
                            ]
                        });
                    } else {
                        setRecipe({
                            id: newId,
                            method_id,
                            name: '',
                            ratio: '1:15',
                            total_water: 250,
                            grind_size: 'Medium',
                            temperature: 92,
                            difficulty: 'Intermediate',
                            style: 'Balanced',
                            description_short: '',
                            description_detailed: '',
                            philosophy: '',
                            best_for_tags: [],
                            not_recommended_tags: [],
                            is_custom: true,
                            created_at: now,
                            updated_at: now,
                            steps: [
                                { id: `${newId}-1`, recipe_id: newId, step_order: 1, label: 'Bloom', duration_seconds: 30, target_weight: 50, instruction: 'Pour water evenly', created_at: now, updated_at: now }
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
    }, [id]);

    const handleSave = async () => {
        if (!recipe) return;
        if (!recipe.name.trim()) {
            setError('Recipe name is required.');
            return;
        }
        if (!recipe.steps || recipe.steps.length === 0) {
            setError('At least one step is required.');
            return;
        }
        setSaving(true);
        setError('');
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

    const addStep = () => {
        if (!recipe) return;
        const now = new Date().toISOString();
        const nextStepOrder = recipe.steps.length + 1;
        const newStep: BrewStep = {
            id: `${recipe.id}-${nextStepOrder}-${Date.now()}`,
            recipe_id: recipe.id,
            step_order: nextStepOrder,
            label: `Pour ${nextStepOrder}`,
            duration_seconds: 30,
            target_weight: (recipe.total_water || 250),
            instruction: 'Pour in spiral motion',
            created_at: now,
            updated_at: now
        };
        setRecipe({
            ...recipe,
            steps: [...recipe.steps, newStep]
        });
    };

    const updateStep = (index: number, updatedFields: Partial<BrewStep>) => {
        if (!recipe) return;
        const updatedSteps = [...recipe.steps];
        updatedSteps[index] = { ...updatedSteps[index], ...updatedFields };
        setRecipe({
            ...recipe,
            steps: updatedSteps
        });
    };

    const removeStep = (index: number) => {
        if (!recipe || recipe.steps.length <= 1) return;
        const updatedSteps = recipe.steps.filter((_, i) => i !== index).map((s, i) => ({
            ...s,
            step_order: i + 1
        }));
        setRecipe({
            ...recipe,
            steps: updatedSteps
        });
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!recipe) return null;

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                            aria-label="Go back"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <h1 className="typescale-headline-small font-bold text-md-on-surface">
                            {id === 'new' ? 'Create Recipe' : 'Edit Recipe'}
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-5 pt-4 space-y-6">
                {error && (
                    <div className="rounded-2xl border border-md-error/30 bg-md-error-container/30 px-4 py-3 typescale-body-medium font-bold text-md-error">
                        {error}
                    </div>
                )}

                {/* Basic Info */}
                <section className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Basic Information</h2>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Recipe Name</label>
                            <input
                                type="text"
                                value={recipe.name}
                                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                placeholder="e.g. Even Extraction Flow"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Ratio</label>
                                <input
                                    type="text"
                                    value={recipe.ratio}
                                    onChange={(e) => setRecipe({ ...recipe, ratio: e.target.value })}
                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                    placeholder="1:15"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Total Water (ml)</label>
                                <input
                                    type="number"
                                    value={recipe.total_water || ''}
                                    onChange={(e) => setRecipe({ ...recipe, total_water: parseInt(e.target.value) || undefined })}
                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                    placeholder="250"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Dropdown
                                    label="Difficulty"
                                    value={recipe.difficulty || ''}
                                    options={[
                                        { value: 'Beginner', label: 'Beginner' },
                                        { value: 'Intermediate', label: 'Intermediate' },
                                        { value: 'Advanced', label: 'Advanced' }
                                    ]}
                                    onChange={(val) => setRecipe({ ...recipe, difficulty: val as Recipe['difficulty'] })}
                                    placeholder="Select"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Style</label>
                                <input
                                    type="text"
                                    value={recipe.style || ''}
                                    onChange={(e) => setRecipe({ ...recipe, style: e.target.value })}
                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                    placeholder="Balanced / Round"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Temp (°C)</label>
                                <input
                                    type="number"
                                    value={recipe.temperature || ''}
                                    onChange={(e) => setRecipe({ ...recipe, temperature: parseInt(e.target.value) || undefined })}
                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                    placeholder="92"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Grind Size</label>
                                <input
                                    type="text"
                                    value={recipe.grind_size || ''}
                                    onChange={(e) => setRecipe({ ...recipe, grind_size: e.target.value })}
                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                    placeholder="Medium"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Details Section */}
                <section className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Details & Philosophy</h2>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Short Description</label>
                            <input
                                type="text"
                                value={recipe.description_short || ''}
                                onChange={(e) => setRecipe({ ...recipe, description_short: e.target.value })}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                placeholder="A brief summary..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Detailed Description</label>
                            <textarea
                                value={recipe.description_detailed || ''}
                                onChange={(e) => setRecipe({ ...recipe, description_detailed: e.target.value })}
                                rows={3}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 resize-none outline-none"
                                placeholder="Explain the brewing approach..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Philosophy</label>
                            <textarea
                                value={recipe.philosophy || ''}
                                onChange={(e) => setRecipe({ ...recipe, philosophy: e.target.value })}
                                rows={2}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 resize-none outline-none"
                                placeholder="Why this recipe works..."
                            />
                        </div>
                    </div>
                </section>

                {/* Tags Section */}
                <section className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Tags (Comma Separated)</h2>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="typescale-label-small font-bold text-md-on-surface-variant uppercase">Best For</label>
                            <input
                                type="text"
                                value={(recipe.best_for_tags || []).join(', ')}
                                onChange={(e) => setRecipe({ ...recipe, best_for_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-2.5 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                placeholder="Arabica, Light Roast, Washed"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="typescale-label-small font-bold text-md-on-surface-variant uppercase">Not Recommended For</label>
                            <input
                                type="text"
                                value={(recipe.not_recommended_tags || []).join(', ')}
                                onChange={(e) => setRecipe({ ...recipe, not_recommended_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-2.5 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                placeholder="Dark Roast, Robusta"
                            />
                        </div>
                    </div>
                </section>

                {/* Steps Section */}
                <section className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Brewing Steps</h2>
                        <button
                            onClick={addStep}
                            className="typescale-label-medium font-bold text-md-primary flex items-center gap-1 bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                        >
                            <Icon name="add" className="text-base" />
                            Add Step
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recipe.steps.map((step, index) => (
                            <div key={step.id} className="bg-md-surface-container-high border border-md-outline-variant/30 rounded-xl p-3.5 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="size-7 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center typescale-label-medium font-bold shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <input
                                            type="text"
                                            value={step.label}
                                            onChange={(e) => updateStep(index, { label: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 typescale-title-small font-bold text-md-on-surface focus:ring-0 placeholder:text-md-on-surface-variant/50 outline-none"
                                            placeholder="Step label..."
                                        />
                                        <textarea
                                            value={step.instruction || ''}
                                            onChange={(e) => updateStep(index, { instruction: e.target.value })}
                                            rows={2}
                                            className="w-full bg-md-surface-container-low border border-md-outline-variant/30 rounded-lg p-2.5 typescale-body-small text-md-on-surface focus:ring-1 focus:ring-md-primary/40 outline-none resize-none placeholder:text-md-on-surface-variant/50"
                                            placeholder="Step instruction..."
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="typescale-label-small font-bold text-md-on-surface-variant uppercase">Duration (s)</label>
                                                <input
                                                    type="number"
                                                    value={step.duration_seconds || ''}
                                                    onChange={(e) => updateStep(index, { duration_seconds: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-md-surface-container-low border border-md-outline-variant/30 rounded-lg p-2 typescale-title-small font-bold text-md-on-surface"
                                                    placeholder="30"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="typescale-label-small font-bold text-md-on-surface-variant uppercase">Target (g)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={step.target_weight || ''}
                                                    onChange={(e) => updateStep(index, { target_weight: parseFloat(e.target.value) || undefined })}
                                                    className="w-full bg-md-surface-container-low border border-md-outline-variant/30 rounded-lg p-2 typescale-title-small font-bold text-md-on-surface"
                                                    placeholder="50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeStep(index)}
                                        className="text-md-on-surface-variant/50 hover:text-md-error transition-colors p-1 cursor-pointer"
                                    >
                                        <Icon name="delete" className="text-xl" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Sticky Bottom Save Action */}
            <div className="fixed bottom-20 left-0 right-0 z-[60] mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                >
                    <Icon name="save" className="text-xl" />
                    <span>{saving ? 'Saving...' : 'Save Recipe'}</span>
                </Button>
            </div>

            <BottomNav activeTab="brewing" />
        </div>
    );
};
