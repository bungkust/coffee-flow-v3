import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';

export const DrinkLogPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [drink, setDrink] = useState<Drink | null>(null);
    const [rating, setRating] = useState(4);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;
        drinkService.getDrink(id).then(setDrink).catch((error) => console.error('Failed to load drink:', error));
    }, [id]);

    const handleSave = async () => {
        if (!drink) return;
        setSaving(true);
        try {
            await drinkService.logDrink(drink.id, rating, notes);
            navigate('/journal?tab=drinks');
        } catch (error) {
            console.error('Failed to save drink log:', error);
        } finally {
            setSaving(false);
        }
    };

    if (!drink) return <div className="flex min-h-screen items-center justify-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;

    return (
        <div className="flex min-h-screen w-full max-w-md flex-col bg-white font-display text-neutral-text shadow-2xl mx-auto">
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 pb-4 pt-12">
                <h1 className="text-xl font-bold">How was it?</h1>
                <p className="mt-1 text-xs font-medium text-gray-500">{drink.name}</p>
            </div>
            <main className="flex-1 px-6 py-8">
                <div className="mb-10 flex flex-col items-center">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                            const displayRating = Math.min(5, Math.max(0, rating));
                            return (
                                <button key={star} onClick={() => setRating(star)}>
                                    <Icon name="star" className={`text-[42px] ${displayRating >= star ? 'text-primary' : 'text-gray-200'}`} style={{ fontVariationSettings: displayRating >= star ? "'FILL' 1" : "'FILL' 0" }} />
                                </button>
                            );
                        })}
                    </div>
                </div>
                <label className="block">
                    <span className="mb-3 block text-lg font-bold">Notes</span>
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full resize-none rounded-2xl bg-gray-50 p-4 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Texture, balance, sweetness..." />
                </label>
            </main>
            <div className="sticky bottom-0 border-t border-gray-100 bg-white p-6">
                <button onClick={handleSave} disabled={saving} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save to Journal'}
                </button>
            </div>
        </div>
    );
};
