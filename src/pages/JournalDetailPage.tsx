import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { brewService, drinkService } from '../core/services';
import type { BrewLogWithRecipe, DrinkLogWithDrink } from '../shared/domain/entities';

export const JournalDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') || 'brews';
    const navigate = useNavigate();

    const [log, setLog] = useState<BrewLogWithRecipe | DrinkLogWithDrink | null>(null);
    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        if (type === 'brews') {
            brewService.getLog(id).then((data) => {
                setLog(data);
                if (data) {
                    setRating(data.rating || 0);
                    setNotes(data.notes || '');
                }
            });
        } else {
            drinkService.getLog(id).then((data) => {
                setLog(data);
                if (data) {
                    setRating(data.rating || 0);
                    setNotes(data.notes || '');
                }
            });
        }
    }, [id, type]);

    const handleSave = async () => {
        if (!log) return;
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

    const confirmDelete = async () => {
        if (!id || !type) return;
        try {
            if (type === 'brews') await brewService.deleteLog(id);
            else await drinkService.deleteLog(id);
            navigate(`/journal?tab=${type}`);
        } catch (error) {
            console.error('Failed to delete log:', error);
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    if (!log) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const brewLog = log as BrewLogWithRecipe;
    const drinkLog = log as DrinkLogWithDrink;
    const title = type === 'brews' ? (brewLog.recipe_name || 'Brew Log') : (drinkLog.drink_name || 'Drink Log');

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer shrink-0"
                            aria-label="Go back"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <h1 className="typescale-headline-small font-bold text-md-on-surface truncate">{title}</h1>
                    </div>
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:text-md-error hover:bg-md-error-container/20 transition-colors cursor-pointer shrink-0"
                        title="Delete Entry"
                    >
                        <Icon name="delete" className="text-xl" />
                    </button>
                </div>
            </header>

            <main className="flex-1 px-5 py-5 space-y-6">
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3 text-center">
                    <span className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider block">Rating</span>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="p-1 transition-transform active:scale-95 cursor-pointer"
                            >
                                <Icon
                                    name="star"
                                    className={`text-3xl ${star <= rating ? 'text-amber-500' : 'text-md-outline-variant/40'}`}
                                    style={star <= rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-2">
                    <label className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider block">Tasting Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={5}
                        className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl p-3.5 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none resize-none placeholder:text-md-on-surface-variant/50"
                        placeholder="Add tasting notes, acidity, body, or adjustments..."
                    />
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                >
                    <Icon name="save" className="text-xl" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Journal Entry?"
                message="Are you sure you want to delete this journal entry? This action cannot be undone."
                confirmText="Delete Entry"
                cancelText="Cancel"
                type="warning"
            />
        </div>
    );
};
