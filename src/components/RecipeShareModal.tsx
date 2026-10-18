import { useState, useEffect } from 'react';
import { Icon } from './Icons';
import { useBackHandler } from '../shared/utils/backNavigation';
import type { Recipe } from '../shared/domain/entities';
import type { UnitSystem } from '../shared/utils/brewMath';
import {
    formatRecipeShareText,
    renderRecipeCardBlob,
    downloadRecipeCard,
    shareRecipeCard,
    shareOrCopyRecipeText
} from '../shared/utils/recipeShare';

interface RecipeShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipe: Recipe;
    unitSystem?: UnitSystem;
}

const TABS = [
    { id: 'card', label: 'Aesthetic Card', icon: 'image' },
    { id: 'text', label: 'Text / WhatsApp', icon: 'chat' }
] as const;

export const RecipeShareModal = ({
    isOpen,
    onClose,
    recipe,
    unitSystem = 'metric'
}: RecipeShareModalProps) => {
    useBackHandler(isOpen, onClose);

    const [activeTab, setActiveTab] = useState<'card' | 'text'>('card');
    const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
    const [generatingCard, setGeneratingCard] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const shareText = formatRecipeShareText(recipe, unitSystem);

    useEffect(() => {
        if (!isOpen) {
            if (cardPreviewUrl) {
                URL.revokeObjectURL(cardPreviewUrl);
                setCardPreviewUrl(null);
            }
            setFeedback(null);
            return;
        }

        let isMounted = true;
        setGeneratingCard(true);

        renderRecipeCardBlob(recipe, unitSystem)
            .then((blob) => {
                if (isMounted) setCardPreviewUrl(URL.createObjectURL(blob));
            })
            .catch((err) => console.error('Failed to generate preview:', err))
            .finally(() => {
                if (isMounted) setGeneratingCard(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, recipe, unitSystem]);

    if (!isOpen) return null;

    const showFeedback = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 2500);
    };

    const runAction = async (fn: () => Promise<string>) => {
        try {
            const msg = await fn();
            if (msg) showFeedback(msg);
        } catch {
            showFeedback('Action failed');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/60 backdrop-blur-xs transition-opacity duration-200">
            <div className="bg-md-surface-container-high text-md-on-surface w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-md-3 border border-md-outline-variant/30 animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-md-outline-variant/20">
                    <div className="flex items-center gap-2">
                        <div className="size-9 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container">
                            <Icon name="share" className="text-xl" />
                        </div>
                        <div>
                            <h3 className="typescale-title-medium font-bold text-md-on-surface">Share Recipe</h3>
                            <p className="typescale-body-small text-md-on-surface-variant line-clamp-1">{recipe.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-9 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        title="Close"
                    >
                        <Icon name="close" className="text-xl" />
                    </button>
                </div>

                {/* Tab Switcher: Card vs Text */}
                <div className="grid grid-cols-2 p-1 my-3 bg-md-surface-container rounded-xl border border-md-outline-variant/20 shrink-0">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg typescale-label-medium font-bold transition-all cursor-pointer ${
                                activeTab === tab.id
                                    ? 'bg-md-primary text-md-on-primary shadow-xs'
                                    : 'text-md-on-surface-variant hover:text-md-on-surface'
                            }`}
                        >
                            <Icon name={tab.icon} className="text-lg" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Feedback Toast */}
                {feedback && (
                    <div className="mb-2 py-1.5 px-3 bg-md-primary/15 border border-md-primary/30 text-md-primary text-center rounded-lg typescale-label-medium font-bold animate-in fade-in">
                        {feedback}
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-0.5">
                    {activeTab === 'card' ? (
                        <div className="flex flex-col items-center">
                            {/* Card Graphic Preview */}
                            <div className="relative w-full aspect-[4/5] max-h-[340px] bg-neutral-900 rounded-2xl overflow-hidden border border-md-outline-variant/30 shadow-md flex items-center justify-center">
                                {generatingCard ? (
                                    <div className="flex flex-col items-center gap-2 text-md-on-surface-variant">
                                        <div className="size-8 border-3 border-md-primary border-t-transparent rounded-full animate-spin"></div>
                                        <span className="typescale-body-small">Generating visual card...</span>
                                    </div>
                                ) : cardPreviewUrl ? (
                                    <img
                                        src={cardPreviewUrl}
                                        alt="Recipe Card"
                                        className="w-full h-full object-contain select-none"
                                    />
                                ) : (
                                    <div className="text-md-on-surface-variant typescale-body-small">Card preview unavailable</div>
                                )}
                            </div>
                            <span className="typescale-label-small text-md-on-surface-variant/80 mt-2 text-center">
                                Ready for Instagram Story, Threads image, or WhatsApp status.
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="typescale-label-small font-bold uppercase tracking-wider text-md-on-surface-variant">
                                WhatsApp & Threads Formatted Preview
                            </label>
                            <pre className="w-full p-3.5 bg-md-surface-container rounded-xl border border-md-outline-variant/30 text-md-on-surface font-sans text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-[280px] overflow-y-auto select-all">
                                {shareText}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-md-outline-variant/20 mt-2 shrink-0">
                    <div className="grid grid-cols-2 gap-2.5">
                        {(activeTab === 'card'
                            ? [
                                { label: 'Save Card', icon: 'download', primary: false, run: async () => { await downloadRecipeCard(recipe, unitSystem); return 'Card image saved!'; } },
                                { label: 'Share Card', icon: 'ios_share', primary: true, run: async () => { const res = await shareRecipeCard(recipe, unitSystem); return res === 'shared' ? 'Opened share options' : 'Card image saved!'; } }
                              ]
                            : [
                                { label: 'Copy Text', icon: 'content_copy', primary: false, run: async () => { await navigator.clipboard.writeText(shareText); return 'Recipe text copied!'; } },
                                { label: 'Share Text', icon: 'share', primary: true, run: async () => { const res = await shareOrCopyRecipeText(recipe, unitSystem); return res === 'copied' ? 'Copied to clipboard!' : 'Opened share dialog'; } }
                              ]
                        ).map(btn => (
                            <button
                                key={btn.label}
                                onClick={() => runAction(btn.run)}
                                className={`py-3 px-3 rounded-full typescale-label-large font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                                    btn.primary
                                        ? 'bg-md-primary text-md-on-primary hover:bg-md-primary/90 shadow-md-1'
                                        : 'bg-md-surface-container-highest hover:bg-md-surface-container-highest/80 text-md-on-surface border border-md-outline-variant/30'
                                }`}
                            >
                                <Icon name={btn.icon} className="text-xl" />
                                <span>{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
