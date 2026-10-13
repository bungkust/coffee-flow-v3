import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { StarRating } from '../components/StarRating';
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
            await drinkService.logDrink(drink, rating, notes);
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
            <PageHeader title="How was it?" subtitle={drink.name} />

            <main className="flex-1 px-5 py-6 space-y-6">
                {/* Rating */}
                <div className="flex flex-col items-center justify-center p-6 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1">
                    <StarRating rating={rating} onChange={setRating} />
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
            <SaveBar onClick={handleSave} saving={saving} label="Save to Journal" icon="bookmark" iconStyle={{ fontVariationSettings: "'FILL' 1" }} />
        </div>
    );
};
