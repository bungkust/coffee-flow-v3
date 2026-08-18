import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';

export const DrinkEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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

                    if (prefill) {
                        setDrink({
                            id: newId,
                            name: prefill.name || '',
                            category: prefill.category || 'hot',
                            ingredients_json: prefill.ingredients_json || '[]',
                            instructions_json: prefill.instructions_json || '[]',
                            version: 1,
                            created_at: now,
                            updated_at: now,
                        });
                    } else {
                        setDrink({
                            id: newId,
                            name: '',
                            category: 'hot',
                            ingredients_json: '[]',
                            instructions_json: '[]',
                            version: 1,
                            created_at: now,
                            updated_at: now,
                        });
                    }
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
            navigate('/drinks');
        } catch (err) {
            console.error('Error saving drink:', err);
            alert('Failed to save drink');
        } finally {
            setSaving(false);
        }
    };

    const addIngredient = () => {
        if (!drink) return;
        const current = JSON.parse(drink.ingredients_json || '[]');
        setDrink({ ...drink, ingredients_json: JSON.stringify([...current, '']) });
    };

    const updateIngredient = (index: number, value: string) => {
        if (!drink) return;
        const current = JSON.parse(drink.ingredients_json || '[]');
        current[index] = value;
        setDrink({ ...drink, ingredients_json: JSON.stringify(current) });
    };

    const removeIngredient = (index: number) => {
        if (!drink) return;
        const current = JSON.parse(drink.ingredients_json || '[]');
        if (current.length <= 1) return;
        current.splice(index, 1);
        setDrink({ ...drink, ingredients_json: JSON.stringify(current) });
    };

    const addInstruction = () => {
        if (!drink) return;
        const current = JSON.parse(drink.instructions_json || '[]');
        setDrink({ ...drink, instructions_json: JSON.stringify([...current, '']) });
    };

    const updateInstruction = (index: number, value: string) => {
        if (!drink) return;
        const current = JSON.parse(drink.instructions_json || '[]');
        current[index] = value;
        setDrink({ ...drink, instructions_json: JSON.stringify(current) });
    };

    const removeInstruction = (index: number) => {
        if (!drink) return;
        const current = JSON.parse(drink.instructions_json || '[]');
        if (current.length <= 1) return;
        current.splice(index, 1);
        setDrink({ ...drink, instructions_json: JSON.stringify(current) });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!drink) return null;

    const ingredients = JSON.parse(drink.ingredients_json || '[]');
    const instructions = JSON.parse(drink.instructions_json || '[]');

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl pb-32 font-display text-neutral-text">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-neutral-text hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <Icon name="arrow_back" className="text-[24px]" />
                    </button>
                    <h1 className="text-neutral-text tracking-tight text-xl font-bold leading-tight">
                        {id === 'new' ? 'Create Drink' : 'Edit Drink'}
                    </h1>
                </div>
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
                            <label className="block text-sm font-bold text-gray-700 mb-1">Drink Name</label>
                            <input
                                type="text"
                                value={drink.name}
                                onChange={(e) => setDrink({ ...drink, name: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="e.g. Caramel Macchiato"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                            <Dropdown
                                buttonClassName="py-3 bg-gray-50 border-gray-100"
                                value={drink.category}
                                options={[
                                    { value: 'hot', label: 'Hot' },
                                    { value: 'cold', label: 'Cold' }
                                ]}
                                onChange={(val) => setDrink({ ...drink, category: val as Drink['category'] })}
                                placeholder="Select"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Image</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    // Compress and convert to WebP
                                    const img = document.createElement('img');
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    
                                    img.onload = () => {
                                        // Max dimensions
                                        const MAX_WIDTH = 400;
                                        const MAX_HEIGHT = 400;
                                        let width = img.width;
                                        let height = img.height;
                                        
                                        // Scale down if needed
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
                                        
                                        // Convert to WebP with 80% quality
                                        const webpUrl = canvas.toDataURL('image/webp', 0.8);
                                        setDrink({ ...drink, image_url: webpUrl });
                                    };
                                    
                                    img.src = URL.createObjectURL(file);
                                }}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                            {drink.image_url && (
                                <div className="mt-2 relative">
                                    <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-100">
                                        <img src={drink.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <button
                                        onClick={() => setDrink({ ...drink, image_url: undefined })}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
                                    >
                                        <Icon name="close" className="text-[16px]" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Ingredients Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingredients</h2>
                        <button
                            onClick={addIngredient}
                            className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                            <Icon name="add" className="text-[16px]" />
                            Add Ingredient
                        </button>
                    </div>
                    <div className="space-y-3">
                        {ingredients.map((item: string, index: number) => (
                            <div key={index} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 relative group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {index + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateIngredient(index, e.target.value)}
                                        className="flex-1 bg-transparent border-none p-0 text-base font-bold text-[#181411] focus:ring-0 placeholder:text-gray-300"
                                        placeholder="e.g. 18g espresso, 120ml milk"
                                    />
                                    {ingredients.length > 1 && (
                                        <button
                                            onClick={() => removeIngredient(index)}
                                            className="text-gray-300 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Icon name="delete" className="text-[20px]" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Instructions Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Instructions</h2>
                        <button
                            onClick={addInstruction}
                            className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                            <Icon name="add" className="text-[16px]" />
                            Add Step
                        </button>
                    </div>
                    <div className="space-y-3">
                        {instructions.map((item: string, index: number) => (
                            <div key={index} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 relative group">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {index + 1}
                                    </div>
                                    <textarea
                                        value={item}
                                        onChange={(e) => updateInstruction(index, e.target.value)}
                                        rows={2}
                                        className="flex-1 bg-transparent border-none p-0 text-sm font-medium text-neutral-text focus:ring-0 placeholder:text-gray-300 resize-none"
                                        placeholder="Describe this step..."
                                    />
                                    {instructions.length > 1 && (
                                        <button
                                            onClick={() => removeInstruction(index)}
                                            className="text-gray-300 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Icon name="delete" className="text-[20px]" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Icon name="save" className="text-[24px]" />
                            <span>Save Drink</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default DrinkEditPage;