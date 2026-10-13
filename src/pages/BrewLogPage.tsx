import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { StarRating } from '../components/StarRating';
import { useBrewStore } from '../state/useBrewStore';
import { TasteEditor } from '../components/TasteEditor';
import { brewService } from '../core/services';
import { formatMethodName } from '../shared/utils/brewMath';
import { serializeFlavorTags, type TasteProfileValues } from '../shared/utils/tasteProfile';

export const BrewLogPage = () => {
    const navigate = useNavigate();
    const { activeRecipe, selectedBeanId, selectedFilterId, coffeeConsumed, stopBrew, hydrateBrew } = useBrewStore();

    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState('');
    const [profile, setProfile] = useState<TasteProfileValues>({});
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [autoSavedLogId, setAutoSavedLogId] = useState<string | null>(
        () => sessionStorage.getItem('coffee_flow_last_logged_id')
    );
    const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

    useEffect(() => {
        if (!activeRecipe) {
            const restored = hydrateBrew();
            if (!restored) {
                navigate('/home');
            }
            return;
        }

        // Auto-save to history immediately if not yet auto-saved
        if (!autoSavedLogId) {
            brewService.logBrew(
                activeRecipe.id,
                undefined,
                undefined,
                undefined,
                [],
                selectedBeanId || undefined,
                selectedFilterId || undefined,
                coffeeConsumed || undefined
            ).then((id) => {
                setAutoSavedLogId(id);
                sessionStorage.setItem('coffee_flow_last_logged_id', id);
            }).catch(console.error);
        }
    }, [activeRecipe, hydrateBrew, navigate]);

    if (!activeRecipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const getRatingLabel = (r: number) => {
        const labels: Record<number, string> = {
            1: '1.0 - Poor',
            2: '2.0 - Fair',
            3: '3.0 - Good',
            4: '4.0 - Very Good',
            5: '5.0 - Excellent'
        };
        return labels[r] || '';
    };

    const handleSave = async () => {
        const payload = {
            rating: rating || undefined,
            notes,
            sweetness: profile.sweetness,
            acidity: profile.acidity,
            body: profile.body,
            bitterness: profile.bitterness,
            flavor_tags: serializeFlavorTags(selectedTags)
        };
        try {
            if (autoSavedLogId) {
                await brewService.updateLog(autoSavedLogId, payload);
            } else {
                await brewService.logBrew(
                    activeRecipe.id,
                    rating || undefined,
                    notes,
                    profile,
                    selectedTags,
                    selectedBeanId || undefined,
                    selectedFilterId || undefined,
                    coffeeConsumed || undefined
                );
            }
            sessionStorage.removeItem('coffee_flow_last_logged_id');
            stopBrew();
            navigate('/home');
        } catch (error) {
            console.error('Failed to save brew log:', error);
            stopBrew();
            navigate('/home');
        }
    };

    const confirmDiscard = async () => {
        // The brew was journalled the moment the timer finished, so discarding means removing that entry.
        if (autoSavedLogId) {
            await brewService.deleteLog(autoSavedLogId).catch(console.error);
            sessionStorage.removeItem('coffee_flow_last_logged_id');
        }
        stopBrew();
        navigate('/home');
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-36">
            {/* Header */}
            <PageHeader title="How was it?" subtitle={`${formatMethodName(activeRecipe.method_id)} • ${activeRecipe.name}`} />

            <main className="flex-1 px-5 py-5 space-y-6">
                {/* Rating */}
                <div className="flex flex-col items-center justify-center p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1">
                    <StarRating rating={rating} onChange={setRating} />
                    <p className="typescale-title-medium font-bold text-md-primary mt-2">{getRatingLabel(rating)}</p>
                </div>

                {/* Taste Profile & Flavor Tags */}
                <TasteEditor
                    profile={profile}
                    onProfileChange={setProfile}
                    tags={selectedTags}
                    onTagsChange={setSelectedTags}
                />

                {/* Notes */}
                <div className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-2">
                    <label className="typescale-title-medium font-bold text-md-on-surface block" htmlFor="notes">Tasting Notes</label>
                    <textarea
                        className="w-full rounded-xl border border-md-outline-variant/30 bg-md-surface-container-high p-3.5 typescale-body-medium text-md-on-surface placeholder:text-md-on-surface-variant/70 focus:ring-2 focus:ring-md-primary/40 shadow-sm resize-none outline-none"
                        id="notes"
                        placeholder="The blueberry notes really came through as it cooled down..."
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                </div>
            </main>

            {/* Bottom Controls */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 max-w-md mx-auto z-20 space-y-2">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={handleSave}
                    className="w-full"
                >
                    <Icon name="bookmark" style={{ fontVariationSettings: "'FILL' 1" }} className="text-xl" />
                    <span>Save to Journal</span>
                </Button>
                <button
                    onClick={() => setIsDiscardModalOpen(true)}
                    className="w-full py-2.5 typescale-label-large font-bold text-md-on-surface-variant hover:text-md-error transition-colors cursor-pointer"
                >
                    Discard
                </button>
            </div>

            {/* Discard Confirmation Modal */}
            <Modal
                isOpen={isDiscardModalOpen}
                onClose={() => setIsDiscardModalOpen(false)}
                onConfirm={confirmDiscard}
                title="Discard Brew Log?"
                message="Are you sure you want to discard this brew log? Your rating and notes will not be saved."
                confirmText="Discard Log"
                cancelText="Keep Editing"
                type="warning"
            />
        </div>
    );
};
