import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
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

    if (!drink) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <h1 className="typescale-headline-small font-bold text-md-on-surface">How was it?</h1>
                <p className="typescale-body-small text-md-on-surface-variant mt-0.5">{drink.name}</p>
            </header>

            <main className="flex-1 px-5 py-6 space-y-6">
                {/* Rating */}
                <div className="flex flex-col items-center justify-center p-6 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                            const displayRating = Math.min(5, Math.max(0, rating));
                            return (
                                <button key={star} onClick={() => setRating(star)} className="focus:outline-none group cursor-pointer">
                                    <Icon
                                        name="star"
                                        className={`text-4xl transition-transform group-active:scale-110 ${displayRating >= star ? 'text-md-primary' : 'text-md-outline/40'}`}
                                        style={{ fontVariationSettings: displayRating >= star ? "'FILL' 1" : "'FILL' 0" }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Notes Input */}
                <div className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-2">
                    <label className="typescale-title-medium font-bold text-md-on-surface block" htmlFor="drink-notes">
                        Notes
                    </label>
                    <textarea
                        id="drink-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={5}
                        className="w-full rounded-xl border border-md-outline-variant/30 bg-md-surface-container-high p-3.5 typescale-body-medium text-md-on-surface placeholder:text-md-on-surface-variant/70 focus:ring-2 focus:ring-md-primary/40 shadow-sm resize-none outline-none"
                        placeholder="Texture, balance, sweetness..."
                    />
                </div>
            </main>

            {/* Sticky Save CTA */}
            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                >
                    <Icon name="bookmark" style={{ fontVariationSettings: "'FILL' 1" }} className="text-xl" />
                    <span>{saving ? 'Saving...' : 'Save to Journal'}</span>
                </Button>
            </div>
        </div>
    );
};
