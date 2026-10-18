import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { useBrewStore } from '../state/useBrewStore';
import { TasteEditor } from '../components/TasteEditor';
import { TasteRatingSelector, getTasteRatingLabel } from '../components/TasteRatingSelector';
import { brewService } from '../core/services';
import { formatMethodName } from '../shared/utils/brewMath';
import { serializeFlavorTags, type TasteProfileValues } from '../shared/utils/tasteProfile';
import { useSafeBack, useBackHandler } from '../shared/utils/backNavigation';

export const BrewLogPage = () => {
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const { activeRecipe, selectedBeanId, selectedFilterId, coffeeConsumed, stopBrew, hydrateBrew } = useBrewStore();

    const [rating, setRating] = useState<number | undefined>(undefined);
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

    const handleSave = async () => {
        const payload = {
            rating,
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
                    rating,
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
            navigate('/journal?tab=brews', { replace: true });
        } catch (error) {
            console.error('Failed to save brew log:', error);
            stopBrew();
            navigate('/home', { replace: true });
        }
    };

    useBackHandler(!isDiscardModalOpen, () => {
        setIsDiscardModalOpen(true);
        return true;
    });

    const confirmDiscard = async () => {
        // The brew was journalled the moment the timer finished, so discarding means removing that entry.
        if (autoSavedLogId) {
            await brewService.deleteLog(autoSavedLogId).catch(console.error);
            sessionStorage.removeItem('coffee_flow_last_logged_id');
        }
        stopBrew();
        safeBack('/home');
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-36">
            {/* Header */}
            <PageHeader
                title="How was it?"
                subtitle={`${formatMethodName(activeRecipe.method_id)} • ${activeRecipe.name}`}
                onBack={() => setIsDiscardModalOpen(true)}
            />

            <main className="flex-1 px-5 py-5 space-y-6">
                {/* Overall Taste Rating */}
                <div className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="typescale-title-medium font-bold text-md-on-surface">Overall Impression</label>
                        {rating ? (
                            <span className="typescale-label-medium font-bold text-md-primary">
                                {getTasteRatingLabel(rating)}
                            </span>
                        ) : (
                            <span className="typescale-label-small font-medium text-md-on-surface-variant/60">
                                Optional
                            </span>
                        )}
                    </div>
                    <TasteRatingSelector value={rating} onChange={setRating} />
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
