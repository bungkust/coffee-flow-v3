import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useBrewStore } from '../state/useBrewStore';
import { brewService } from '../core/services';

const PRESET_TAGS = ['Fruity', 'Nutty', 'Chocolatey', 'Floral', 'Spicy'];

export const BrewLogPage = () => {
    const navigate = useNavigate();
    const { activeRecipe, selectedBeanId, selectedFilterId, coffeeConsumed, stopBrew, hydrateBrew } = useBrewStore();

    const [rating, setRating] = useState(4);
    const [notes, setNotes] = useState('');
    const [profile, setProfile] = useState({
        sweetness: 75,
        acidity: 50,
        body: 30,
        bitterness: 20
    });
    const [selectedTags, setSelectedTags] = useState<string[]>(['Fruity']);
    const [customTagInput, setCustomTagInput] = useState('');

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
                4,
                '',
                profile,
                selectedTags,
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

    const tags = PRESET_TAGS;
    const customTags = selectedTags.filter(t => !PRESET_TAGS.includes(t));

    const handleToggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleAddCustomTag = () => {
        const trimmed = customTagInput.trim();
        if (trimmed && !selectedTags.includes(trimmed)) {
            setSelectedTags([...selectedTags, trimmed]);
        }
        setCustomTagInput('');
    };

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

    const getProfileLabel = (value: number) => {
        if (value < 20) return 'Very Low';
        if (value < 40) return 'Low';
        if (value < 60) return 'Balanced';
        if (value < 80) return 'Medium-High';
        return 'High';
    };

    const handleSave = async () => {
        try {
            if (autoSavedLogId) {
                const existing = await brewService.getLog(autoSavedLogId);
                if (existing) {
                    await brewService.updateLog({
                        ...existing,
                        rating,
                        notes,
                        sweetness: profile.sweetness,
                        acidity: profile.acidity,
                        body: profile.body,
                        bitterness: profile.bitterness,
                        flavor_tags: selectedTags.join(',')
                    });
                }
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
            navigate('/home');
        } catch (error) {
            console.error('Failed to save brew log:', error);
            stopBrew();
            navigate('/home');
        }
    };

    const confirmDiscard = () => {
        stopBrew();
        navigate('/home');
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex flex-col">
                    <h1 className="typescale-headline-small font-bold text-md-on-surface">
                        How was it?
                    </h1>
                    <p className="typescale-body-small text-md-on-surface-variant mt-0.5">{activeRecipe.method_id.toUpperCase()} • {activeRecipe.name}</p>
                </div>
            </header>

            <main className="flex-1 px-5 py-5 space-y-6">
                {/* Rating */}
                <div className="flex flex-col items-center justify-center p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="focus:outline-none group cursor-pointer"
                            >
                                <Icon
                                    name="star"
                                    className={`text-4xl transition-transform group-active:scale-110 ${Math.min(5, Math.max(0, rating)) >= star ? 'text-md-primary' : 'text-md-outline/40'}`}
                                    style={{ fontVariationSettings: Math.min(5, Math.max(0, rating)) >= star ? "'FILL' 1" : "'FILL' 0" }}
                                />
                            </button>
                        ))}
                    </div>
                    <p className="typescale-title-medium font-bold text-md-primary mt-2">{getRatingLabel(rating)}</p>
                </div>

                {/* Taste Profile */}
                <div className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-5">
                    <h2 className="typescale-title-medium font-bold text-md-on-surface">Taste Profile</h2>

                    {Object.entries(profile).map(([key, value]) => (
                        <div key={key} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="typescale-label-large font-bold text-md-on-surface capitalize">{key}</label>
                                <span className="typescale-label-small font-bold text-md-on-secondary-container bg-md-secondary-container px-2.5 py-0.5 rounded-full">
                                    {getProfileLabel(value)}
                                </span>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input
                                    className="w-full h-2 bg-md-surface-container-high rounded-lg appearance-none cursor-pointer accent-md-primary"
                                    max="100" min="0" type="range"
                                    value={value}
                                    onChange={(e) => setProfile({ ...profile, [key]: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-between typescale-label-small text-md-on-surface-variant/70 font-semibold uppercase tracking-wider">
                                <span>Low</span>
                                <span>High</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Flavor Tags */}
                <div className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <h2 className="typescale-title-medium font-bold text-md-on-surface">Flavor Tags</h2>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleToggleTag(tag)}
                                className={`px-3.5 py-1.5 rounded-full typescale-label-medium font-semibold transition-all cursor-pointer border ${selectedTags.includes(tag)
                                    ? 'bg-md-secondary-container border-md-primary text-md-on-secondary-container shadow-sm'
                                    : 'bg-md-surface-container-high text-md-on-surface-variant border-md-outline-variant/30 hover:bg-md-surface-container-highest'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                        {customTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleToggleTag(tag)}
                                className="px-3.5 py-1.5 rounded-full typescale-label-medium font-semibold transition-all border bg-md-primary-container/40 text-md-primary border-md-primary/30 hover:bg-md-primary-container cursor-pointer"
                            >
                                {tag}
                                <span className="ml-1 text-md-primary/70">&times;</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomTag(); }}
                            placeholder="Add custom tag..."
                            className="flex-1 rounded-full border border-md-outline-variant/30 bg-md-surface-container-high px-4 py-2 typescale-body-medium text-md-on-surface placeholder:text-md-on-surface-variant/70 outline-none focus:ring-2 focus:ring-md-primary/40"
                        />
                        <button
                            onClick={handleAddCustomTag}
                            disabled={!customTagInput.trim()}
                            className="rounded-full bg-md-secondary-container px-4 py-2 typescale-label-medium font-bold text-md-on-secondary-container hover:bg-md-secondary-container/80 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                            Add
                        </button>
                    </div>
                </div>

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
