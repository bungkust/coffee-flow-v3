import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService, drinkService } from '../core/services';
import type { BrewLogWithRecipe, DrinkLogWithDrink } from '../shared/domain/entities';

type JournalLog = BrewLogWithRecipe | DrinkLogWithDrink;

export const JournalDetailPage = () => {
    const { type, id } = useParams<{ type: 'brews' | 'drinks'; id: string }>();
    const navigate = useNavigate();
    const [log, setLog] = useState<JournalLog | null>(null);
    const [rating, setRating] = useState(4);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadLog = async () => {
            if (!id || !type) return;
            const data = type === 'brews' ? await brewService.getLog(id) : await drinkService.getLog(id);
            setLog(data);
            setRating(data?.rating || 4);
            setNotes(data?.notes || '');
        };
        loadLog().catch((error) => console.error('Failed to load journal log:', error));
    }, [id, type]);

    const handleSave = async () => {
        if (!log || !type) return;
        setSaving(true);
        try {
            if (type === 'brews') {
                await brewService.updateLog({ ...(log as BrewLogWithRecipe), rating, notes });
            } else {
                await drinkService.updateLog({ ...(log as DrinkLogWithDrink), rating, notes });
            }
            navigate(`/journal?tab=${type}`);
        } catch (error) {
            console.error('Failed to update log:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !type || !confirm('Delete this journal entry?')) return;
        if (type === 'brews') await brewService.deleteLog(id);
        else await drinkService.deleteLog(id);
        navigate(`/journal?tab=${type}`);
    };

    if (!log) return <div className="flex min-h-screen items-center justify-center bg-background-light"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;

    const title = 'recipe_name' in log ? log.recipe_name : log.drink_name;
    const subtitle = 'method_id' in log ? log.method_id.toUpperCase() : log.category;

    return (
        <div className="flex min-h-screen w-full max-w-md flex-col bg-white font-display text-neutral-text shadow-2xl mx-auto">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white px-6 pb-4 pt-12">
                <button onClick={() => navigate(-1)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-50">
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <div>
                    <h1 className="text-lg font-bold">{title}</h1>
                    <p className="text-xs font-medium text-gray-500">{subtitle}</p>
                </div>
            </div>
            <main className="flex-1 space-y-8 px-6 py-8">
                <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                        const displayRating = Math.min(5, Math.max(0, rating));
                        return (
                            <button key={star} onClick={() => setRating(star)}>
                                <Icon name="star" className={`text-[40px] ${displayRating >= star ? 'text-primary' : 'text-gray-200'}`} style={{ fontVariationSettings: displayRating >= star ? "'FILL' 1" : "'FILL' 0" }} />
                            </button>
                        );
                    })}
                </div>
                <label className="block">
                    <span className="mb-3 block text-lg font-bold">Notes</span>
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={6} className="w-full resize-none rounded-2xl bg-gray-50 p-4 outline-none focus:ring-2 focus:ring-primary/20" />
                </label>
            </main>
            <div className="sticky bottom-0 space-y-3 border-t border-gray-100 bg-white p-6">
                <button onClick={handleSave} disabled={saving} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={handleDelete} className="w-full rounded-2xl bg-red-50 py-3 font-bold text-red-600">
                    Delete Entry
                </button>
            </div>
        </div>
    );
};
