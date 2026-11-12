import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService, settingsService } from '../core/services';
import type { Recipe } from '../shared/domain/entities';
import { calculateCoffeeDose, formatDuration, formatMethodName, formatWeight, formatVolume, formatStepSeconds, getBrewDuration, getBrewSteps, getPourAmount, getStepIntervalInfo, type UnitSystem } from '../shared/utils/brewMath';
import { PageHeader } from '../components/PageHeader';
import { RecipeShareModal } from '../components/RecipeShareModal';
import { BrewModeSheet } from '../components/BrewModeSheet';
import { ScalePairingModal } from '../components/ScalePairingModal';
import { useScaleStore } from '../features/scale/state/useScaleStore';
import { useSafeBack } from '../shared/utils/backNavigation';

const sourceMeta = (url: string): { icon: string; label: string } => {
    const u = url.toLowerCase();
    if (u.includes('youtube.') || u.includes('youtu.be')) return { icon: 'play_circle', label: 'Watch on YouTube' };
    if (u.includes('tiktok.')) return { icon: 'music_note', label: 'Open on TikTok' };
    if (u.includes('instagram.')) return { icon: 'photo_camera', label: 'Open on Instagram' };
    try {
        return { icon: 'open_in_new', label: new URL(url).hostname.replace(/^www\./, '') };
    } catch {
        return { icon: 'open_in_new', label: 'Source' };
    }
};

export const RecipeDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const safeBack = useSafeBack();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
    const [showShareModal, setShowShareModal] = useState(false);
    const [showModeSheet, setShowModeSheet] = useState(false);
    const [showScalePairing, setShowScalePairing] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showStepDetails, setShowStepDetails] = useState(false);

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!id) return;
            try {
                const data = await brewService.getRecipe(id);
                setRecipe(data);
            } catch (err) {
                console.error('Error fetching recipe:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecipe();
        settingsService.getAppUnit().then(setUnitSystem);
    }, [id, location.key]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface p-6 text-center">
                <Icon name="error" className="text-5xl text-md-error mb-4" />
                <h2 className="typescale-title-large font-bold text-md-on-surface">Recipe not found</h2>
                <button
                    onClick={() => safeBack('/recipes')}
                    className="mt-4 text-md-primary font-bold hover:underline cursor-pointer"
                >
                    Back to previous page
                </button>
            </div>
        );
    }

    const totalTime = getBrewDuration(recipe.steps);
    const brewSteps = getBrewSteps(recipe.steps);
    const coffeeDose = calculateCoffeeDose(recipe.total_water, recipe.ratio);
    const hasValidRatio = coffeeDose > 0;
    const rawSource = recipe.source?.trim() || '';
    const urlMatch = rawSource.match(/https?:\/\/[^\s)"'\]]+/);
    const cleanUrl = urlMatch ? urlMatch[0] : (rawSource.startsWith('http') ? rawSource : null);
    const sourceInfo = cleanUrl ? sourceMeta(cleanUrl) : null;
    const bestForTags = recipe.best_for_tags || [];
    const notRecommendedTags = recipe.not_recommended_tags || [];
    const primaryDescription = recipe.description_short?.trim() || recipe.description_detailed?.trim() || '';
    const extraDetailed =
        recipe.description_short?.trim() &&
        recipe.description_detailed?.trim() &&
        recipe.description_detailed.trim() !== recipe.description_short.trim()
            ? recipe.description_detailed.trim()
            : '';
    const philosophyText = recipe.philosophy?.trim() || '';
    const hasExtraNotes = Boolean(extraDetailed || philosophyText);
    const hasStepExtras = brewSteps.some(
        (step) => Boolean(step.instruction?.trim()) || getStepIntervalInfo(step).restSeconds > 0
    );
    const baselineSpecs = [
        {
            icon: 'coffee',
            label: 'Coffee',
            value: hasValidRatio ? formatWeight(coffeeDose, unitSystem) : '—',
            extra: recipe.ratio ? `(${recipe.ratio})` : undefined,
        },
        {
            icon: 'water_drop',
            label: 'Water',
            value: recipe.total_water ? formatVolume(recipe.total_water, unitSystem) : '—',
        },
        {
            icon: 'thermostat',
            label: 'Temp',
            value: recipe.temperature ? `${recipe.temperature}°C` : '—',
        },
        {
            icon: 'grain',
            label: 'Grind',
            value: recipe.grind_size || '—',
        },
    ];

    return (
        <div className="flex flex-col min-h-dvh max-w-md mx-auto bg-md-surface text-md-on-surface font-sans relative overflow-x-hidden">
            {/* Header */}
            <PageHeader
                title="Recipe Details"
                onBack={() => safeBack('/recipes')}
                action={(
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setShowShareModal(true)}
                            className="size-11 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                            aria-label="Share recipe"
                            title="Share Recipe"
                        >
                            <Icon name="share" className="text-2xl" />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                            className="size-11 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                            aria-label="Edit recipe"
                            title="Edit Recipe"
                        >
                            <Icon name="edit" className="text-2xl" />
                        </button>
                    </div>
                )}
            />

            {/* Main Content */}
            <main className="flex-1 px-5 pt-4 pb-8 space-y-3.5">
                {/* Overview Card: Title first, clean metadata, concise actions & suitability */}
                <section className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3 overflow-hidden">
                    <div className="space-y-1">
                        <h2 className="typescale-title-large font-bold text-md-on-surface leading-snug">
                            {recipe.name}
                        </h2>
                        <p className="typescale-label-medium text-md-on-surface-variant font-medium">
                            {[formatMethodName(recipe.method_id), recipe.difficulty, recipe.style]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    </div>

                    {primaryDescription && (
                        <p className="typescale-body-medium text-md-on-surface leading-relaxed">
                            {primaryDescription}
                        </p>
                    )}

                    {(hasExtraNotes || cleanUrl || rawSource) && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 -my-1">
                            {hasExtraNotes && (
                                <button
                                    type="button"
                                    onClick={() => setShowNotes((prev) => !prev)}
                                    aria-expanded={showNotes}
                                    className="inline-flex items-center gap-1.5 min-h-[44px] text-md-primary typescale-label-medium font-semibold hover:underline transition-colors cursor-pointer"
                                >
                                    <Icon name={showNotes ? 'expand_less' : 'notes'} className="text-base" />
                                    <span>{showNotes ? 'Hide notes' : 'Notes & philosophy'}</span>
                                </button>
                            )}

                            {cleanUrl ? (
                                <a
                                    href={cleanUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 min-h-[44px] typescale-label-medium font-semibold text-md-primary hover:underline cursor-pointer max-w-full"
                                >
                                    <Icon name={sourceInfo?.icon || 'open_in_new'} className="text-base shrink-0" />
                                    <span className="truncate">{sourceInfo?.label || 'Source'}</span>
                                </a>
                            ) : rawSource ? (
                                <span className="inline-flex items-center min-h-[44px] typescale-body-small text-md-on-surface-variant break-words">
                                    Source: {rawSource}
                                </span>
                            ) : null}
                        </div>
                    )}

                    {showNotes && hasExtraNotes && (
                        <div className="space-y-2 pt-2.5 border-t border-md-outline-variant/20">
                            {extraDetailed && (
                                <p className="typescale-body-small text-md-on-surface-variant leading-relaxed">
                                    {extraDetailed}
                                </p>
                            )}
                            {philosophyText && (
                                <p className="typescale-body-small text-md-on-surface-variant italic leading-relaxed border-l-2 border-md-primary/40 pl-3">
                                    "{philosophyText}"
                                </p>
                            )}
                        </div>
                    )}

                    {(bestForTags.length > 0 || notRecommendedTags.length > 0) && (
                        <div className="pt-3 border-t border-md-outline-variant/20 space-y-2.5">
                            {bestForTags.length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="block typescale-label-small text-md-on-surface-variant font-bold uppercase tracking-wider">
                                        Best for
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {bestForTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2.5 py-1 bg-md-primary-container text-md-on-primary-container typescale-label-small font-semibold rounded-lg"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {notRecommendedTags.length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="block typescale-label-small text-md-error font-bold uppercase tracking-wider">
                                        Avoid
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {notRecommendedTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2.5 py-1 bg-md-error-container text-md-on-error-container typescale-label-small font-semibold rounded-lg"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Baseline Snapshot (Flat 2x2 key-value strip, no nested boxes) */}
                <section
                    aria-label="Baseline recipe specs"
                    className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/30 shadow-md-1 grid grid-cols-2 gap-x-4 gap-y-3"
                >
                    {baselineSpecs.map((spec) => (
                        <div key={spec.label} className="flex items-center gap-2.5 min-w-0">
                            <div className="size-8 rounded-xl bg-md-surface-container-high text-md-primary flex items-center justify-center shrink-0">
                                <Icon name={spec.icon} className="text-lg" />
                            </div>
                            <div className="min-w-0">
                                <span className="block typescale-label-small text-md-on-surface-variant uppercase tracking-wider font-semibold">
                                    {spec.label}
                                </span>
                                <span className="block typescale-title-small font-bold text-md-on-surface tabular-nums truncate">
                                    {spec.value}
                                    {spec.extra && (
                                        <span className="text-md-on-surface-variant font-medium ml-1">
                                            {spec.extra}
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Compact Brew Outline */}
                <section className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-2">
                    <div className="flex items-center justify-between gap-2 min-h-[44px] -my-1.5">
                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                                <Icon name="format_list_numbered" className="text-md-primary text-lg shrink-0" />
                                <h3 className="typescale-title-small font-bold text-md-on-surface">
                                    Brew Outline
                                </h3>
                            </div>
                            <span className="typescale-label-small text-md-on-surface-variant font-semibold tabular-nums">
                                · {brewSteps.length} {brewSteps.length === 1 ? 'step' : 'steps'} · ~{formatDuration(totalTime)}
                            </span>
                        </div>
                        {hasStepExtras && (
                            <button
                                type="button"
                                onClick={() => setShowStepDetails((prev) => !prev)}
                                aria-expanded={showStepDetails}
                                className="inline-flex items-center min-h-[44px] px-1 typescale-label-small font-bold text-md-primary hover:underline shrink-0 cursor-pointer"
                            >
                                {showStepDetails ? 'Compact' : 'Show details'}
                            </button>
                        )}
                    </div>

                    <ol className="divide-y divide-md-outline-variant/20">
                        {brewSteps.map((step, index) => {
                            const intervalInfo = getStepIntervalInfo(step);
                            const hasTarget = typeof step.target_weight === 'number' && step.target_weight > 0;
                            const pourAmount = hasTarget ? getPourAmount(brewSteps, index) : 0;

                            return (
                                <li key={step.id || index} className="py-2.5 first:pt-0.5 last:pb-0.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="size-6 rounded-full bg-md-surface-container-highest text-md-on-surface-variant typescale-label-small font-bold flex items-center justify-center shrink-0 tabular-nums">
                                                {index + 1}
                                            </span>
                                            <span className="typescale-body-medium font-semibold text-md-on-surface truncate">
                                                {step.label}
                                            </span>
                                        </div>
                                        <span className="typescale-label-medium font-semibold text-md-on-surface-variant tabular-nums shrink-0">
                                            {formatStepSeconds(step.duration_seconds)}
                                            {hasTarget ? ` · ${step.target_weight}g` : ''}
                                        </span>
                                    </div>

                                    {showStepDetails && (
                                        <div className="pl-[34px] mt-1.5 space-y-1">
                                            {(hasTarget || intervalInfo.restSeconds > 0) && (
                                                <p className="typescale-label-small font-semibold text-md-primary tabular-nums">
                                                    {[
                                                        hasTarget && pourAmount > 0 ? `+${pourAmount}g pour` : null,
                                                        hasTarget ? `Target ${step.target_weight}g` : null,
                                                        intervalInfo.restSeconds > 0 ? `Rest ${intervalInfo.restSeconds}s` : null,
                                                    ].filter(Boolean).join(' · ')}
                                                </p>
                                            )}
                                            {step.instruction && (
                                                <p className="typescale-body-small text-md-on-surface-variant leading-relaxed">
                                                    {step.instruction}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </section>
            </main>

            {/* Bottom Action CTA */}
            <div className="sticky bottom-0 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] z-20 mt-auto w-full">
                <button
                    onClick={() => setShowModeSheet(true)}
                    className="w-full bg-md-primary text-md-on-primary font-bold py-3.5 rounded-full shadow-md-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer typescale-title-medium hover:opacity-95"
                >
                    <Icon name="play_circle" className="text-2xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                    <span>Start Brewing</span>
                </button>
            </div>

            {/* Choose Brewing Mode Bottom Sheet */}
            <BrewModeSheet
                isOpen={showModeSheet}
                onClose={() => setShowModeSheet(false)}
                recipeName={recipe.name}
                onSelect={(mode) => {
                    setShowModeSheet(false);
                    if (mode === 'smart-scale' && useScaleStore.getState().connectionState !== 'connected') {
                        setShowScalePairing(true);
                        return;
                    }
                    navigate(`/recipes/${recipe.id}/prepare?mode=${mode}`);
                }}
            />

            {/* Scale Pairing Bottom Sheet (when Smart Scale is selected while disconnected) */}
            <ScalePairingModal
                isOpen={showScalePairing}
                onClose={() => setShowScalePairing(false)}
                onConnected={() => navigate(`/recipes/${recipe.id}/prepare?mode=smart-scale`)}
                onSkip={() => navigate(`/recipes/${recipe.id}/prepare?mode=smart-scale&skipPairing=1`)}
            />

            {/* Share Recipe Modal */}
            <RecipeShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                recipe={recipe}
                unitSystem={unitSystem}
            />
        </div>
    );
};
