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
import { useBackHandler } from '../shared/utils/backNavigation';

export const BrewLogPage = () => {
    const navigate = useNavigate();
    const { activeRecipe, activeLogId, autoLogBrew, stopBrew, hydrateBrew } = useBrewStore();

    const [rating, setRating] = useState<number | undefined>(undefined);
    const [notes, setNotes] = useState('');
    const [profile, setProfile] = useState<TasteProfileValues>({});
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

    useEffect(() => {
        if (!activeRecipe) {
            const restored = hydrateBrew();
            if (!restored) {
                navigate('/home', { replace: true });
            }
            return;
        }

        // Auto-save to history immediately if not yet auto-saved
        if (!activeLogId) {
            void autoLogBrew();
        }
    }, [activeRecipe, activeLogId, autoLogBrew, hydrateBrew, navigate]);

    if (!activeRecipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

        const handleSave = async (redirectTo: string = '/journal?tab=brews') => {
            const dest = typeof redirectTo === 'string' ? redirectTo : '/journal?tab=brews';
            const payload = {
                rating,
                notes: notes.trim() || undefined,
                sweetness: profile.sweetness,
                acidity: profile.acidity,
                body: profile.body,
                bitterness: profile.bitterness,
                flavor_tags: serializeFlavorTags(selectedTags)
            };
            try {
                const logId = activeLogId || (await autoLogBrew());
                if (logId) {
                    await brewService.updateLog(logId, payload);
                }
            } catch (error) {
                console.error('Failed to save brew log:', error);
            } finally {
                stopBrew();
                navigate(dest, { replace: true });
            }
        };

        const handleBack = () => void handleSave('/home');

        useBackHandler(!isDiscardModalOpen, () => {
            void handleBack();
            return true;
        });

        const confirmDiscard = async () => {
            // The brew was journalled the moment the timer finished, so discarding means removing that entry.
            try {
                const logId = activeLogId || sessionStorage.getItem('coffee_flow_last_logged_id');
                if (logId) {
                    await brewService.deleteLog(logId).catch(console.error);
                }
            } finally {
                stopBrew();
                navigate('/home', { replace: true });
            }
        };

        return (
            <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-36">
                {/* Header */}
                <PageHeader
                    title="How was it?"
                    subtitle={`${formatMethodName(activeRecipe.method_id)} • ${activeRecipe.name}`}
                    onBack={handleBack}
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
                        onClick={() => void handleSave()}
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
