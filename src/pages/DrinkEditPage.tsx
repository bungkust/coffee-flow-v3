import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { drinkService } from '../core/services';
import type { Drink, DrinkBaseType } from '../shared/domain/entities';
import { useSafeBack } from '../shared/utils/backNavigation';

export const DrinkEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const location = useLocation();
    const prefill = (location.state as { prefill?: Partial<Drink> } | null)?.prefill;

    const [drink, setDrink] = useState<Drink | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDrink = async () => {
            if (!id) return;
            try {
                if (id === 'new') {
                    const newId = crypto.randomUUID();
                    const now = new Date().toISOString();
                    const p: Partial<Drink> = prefill || {};

                    setDrink({
                        id: newId,
                        name: p.name || '',
                        category: p.category || 'hot',
                        base_type: p.base_type || 'coffee',
                        ingredients_json: p.ingredients_json || '[]',
                        instructions_json: p.instructions_json || '[]',
                        created_at: now,
                        updated_at: now,
                    });
                } else {
                    const data = await drinkService.getDrink(id);
                    setDrink(data);
                }
            } catch (err) {
                console.error('Error fetching drink:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDrink();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSave = async () => {
        if (!drink) return;
        if (!drink.name.trim()) {
            setError('Drink name is required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await drinkService.saveDrink(drink);
            if (id === 'new') {
                navigate(`/drinks/list?base=${drink.base_type || 'coffee'}`);
            } else {
                safeBack(`/drinks/${drink.id}`);
            }
        } catch (err) {
            console.error('Error saving drink:', err);
            alert('Failed to save drink');
        } finally {
            setSaving(false);
        }
    };

    const updateList = (field: 'ingredients_json' | 'instructions_json', transform: (list: string[]) => string[]) => {
        if (!drink) return;
        const current = JSON.parse(drink[field] || '[]');
        setDrink({ ...drink, [field]: JSON.stringify(transform(current)) } as Drink);
    };

    const addIngredient = () => updateList('ingredients_json', list => [...list, '']);
    const updateIngredient = (index: number, value: string) =>
        updateList('ingredients_json', list => { list[index] = value; return list; });
    const removeIngredient = (index: number) =>
        updateList('ingredients_json', list => (list.length > 1 ? list.filter((_, i) => i !== index) : list));
    const addInstruction = () => updateList('instructions_json', list => [...list, '']);
    const updateInstruction = (index: number, value: string) =>
        updateList('instructions_json', list => { list[index] = value; return list; });
    const removeInstruction = (index: number) =>
        updateList('instructions_json', list => (list.length > 1 ? list.filter((_, i) => i !== index) : list));

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!drink) return null;

    const ingredients = JSON.parse(drink.ingredients_json || '[]');
    const instructions = JSON.parse(drink.instructions_json || '[]');

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <PageHeader title={id === 'new' ? 'Create Drink' : 'Edit Drink'} onBack={() => safeBack(id === 'new' ? '/drinks/list' : `/drinks/${id}`)} />

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
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Drink Name</label>
                            <input
                                type="text"
                                value={drink.name}
                                onChange={(e) => setDrink({ ...drink, name: e.target.value })}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                placeholder="e.g. Caramel Macchiato"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Dropdown
                                    label="Base Type"
                                    value={drink.base_type || 'coffee'}
                                    options={[
                                        { value: 'coffee', label: '☕ Coffee Base' },
                                        { value: 'non_coffee', label: '🍵 Non-Coffee' }
                                    ]}
                                    onChange={(val) => setDrink({ ...drink, base_type: val as DrinkBaseType })}
                                    placeholder="Select"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Dropdown
                                    label="Category"
                                    value={drink.category}
                                    options={[
                                        { value: 'hot', label: 'Hot' },
                                        { value: 'cold', label: 'Cold' }
                                    ]}
                                    onChange={(val) => setDrink({ ...drink, category: val as Drink['category'] })}
                                    placeholder="Select"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    const img = document.createElement('img');
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    
                                    img.onload = () => {
                                        const MAX_WIDTH = 400;
                                        const MAX_HEIGHT = 400;
                                        let width = img.width;
                                        let height = img.height;
                                        
                                        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                                            if (width > height) {
                                                height = (height * MAX_WIDTH) / width;
                                                width = MAX_WIDTH;
                                            } else {
                                                width = (width * MAX_HEIGHT) / height;
                                                height = MAX_HEIGHT;
                                            }
                                        }
                                        
                                        canvas.width = width;
                                        canvas.height = height;
                                        ctx?.drawImage(img, 0, 0, width, height);
                                        
                                        const webpUrl = canvas.toDataURL('image/webp', 0.8);
                                        setDrink({ ...drink, image_url: webpUrl });
                                    };
                                    
                                    img.src = URL.createObjectURL(file);
                                }}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-small file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:typescale-label-medium file:font-bold file:bg-md-primary-container file:text-md-on-primary-container hover:file:bg-md-primary-container/80"
                            />
                            {drink.image_url && (
                                <div className="mt-2 relative">
                                    <div className="w-full h-32 rounded-xl overflow-hidden border border-md-outline-variant/30">
                                        <img src={drink.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <button
                                        onClick={() => setDrink({ ...drink, image_url: undefined })}
                                        className="absolute top-2 right-2 size-8 rounded-full bg-md-error text-md-on-error flex items-center justify-center shadow-md-1 hover:opacity-90 cursor-pointer"
                                    >
                                        <Icon name="close" className="text-base" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Ingredients Section */}
                <section className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Ingredients</h2>
                        <button
                            onClick={addIngredient}
                            className="typescale-label-medium font-bold text-md-primary flex items-center gap-1 bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                        >
                            <Icon name="add" className="text-base" />
                            Add Ingredient
                        </button>
                    </div>
                    <div className="space-y-3">
                        {ingredients.map((item: string, index: number) => (
                            <div key={index} className="bg-md-surface-container-high border border-md-outline-variant/30 rounded-xl p-3.5 flex items-center gap-3">
                                <div className="size-7 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center typescale-label-medium font-bold shrink-0">
                                    {index + 1}
                                </div>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => updateIngredient(index, e.target.value)}
                                    className="flex-1 bg-transparent border-none p-0 typescale-body-medium font-bold text-md-on-surface focus:ring-0 placeholder:text-md-on-surface-variant/50 outline-none"
                                    placeholder="e.g. 18g espresso, 120ml milk"
                                />
                                {ingredients.length > 1 && (
                                    <button
                                        onClick={() => removeIngredient(index)}
                                        className="text-md-on-surface-variant/50 hover:text-md-error transition-colors p-1 cursor-pointer"
                                    >
                                        <Icon name="delete" className="text-xl" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Instructions Section */}
                <section className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Instructions</h2>
                        <button
                            onClick={addInstruction}
                            className="typescale-label-medium font-bold text-md-primary flex items-center gap-1 bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                        >
                            <Icon name="add" className="text-base" />
                            Add Step
                        </button>
                    </div>
                    <div className="space-y-3">
                        {instructions.map((item: string, index: number) => (
                            <div key={index} className="bg-md-surface-container-high border border-md-outline-variant/30 rounded-xl p-3.5 flex items-start gap-3">
                                <div className="size-7 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center typescale-label-medium font-bold shrink-0">
                                    {index + 1}
                                </div>
                                <textarea
                                    value={item}
                                    onChange={(e) => updateInstruction(index, e.target.value)}
                                    rows={2}
                                    className="flex-1 bg-transparent border-none p-0 typescale-body-medium text-md-on-surface focus:ring-0 placeholder:text-md-on-surface-variant/50 resize-none outline-none"
                                    placeholder="Describe this step..."
                                />
                                {instructions.length > 1 && (
                                    <button
                                        onClick={() => removeInstruction(index)}
                                        className="text-md-on-surface-variant/50 hover:text-md-error transition-colors p-1 cursor-pointer"
                                    >
                                        <Icon name="delete" className="text-xl" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Sticky Bottom Actions */}
            <SaveBar onClick={handleSave} saving={saving} label="Save Drink" />
        </div>
    );
};

export default DrinkEditPage;