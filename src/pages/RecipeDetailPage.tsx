import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService, settingsService } from '../core/services';
import type { Recipe } from '../shared/domain/entities';
import { calculateCoffeeDose, formatDuration, formatWeight, formatVolume, sumStepDuration, getPourAmount, getStepIntervalInfo, type UnitSystem } from '../shared/utils/brewMath';

export const RecipeDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

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
    }, [id]);

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
                    onClick={() => navigate(-1)}
                    className="mt-4 text-md-primary font-bold hover:underline cursor-pointer"
                >
                    Back to previous page
                </button>
            </div>
        );
    }

    const totalTime = sumStepDuration(recipe.steps);
    const coffeeDose = calculateCoffeeDose(recipe.total_water, recipe.ratio);
    const hasValidRatio = coffeeDose > 0;
    const bestForTags = recipe.best_for_tags || [];
    const notRecommendedTags = recipe.not_recommended_tags || [];

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <h1 className="typescale-headline-small font-bold text-md-on-surface line-clamp-1">
                            {recipe.name}
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                    >
                        <Icon name="edit" className="text-2xl" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-5 pt-4 space-y-4">
                {/* About Card */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="typescale-label-medium text-md-primary font-bold uppercase tracking-wider bg-md-primary-container/40 px-3 py-1 rounded-full">
                            {recipe.method_id}
                        </span>
                        {recipe.difficulty && (
                            <span className="typescale-label-medium px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-md-secondary-container text-md-on-secondary-container">
                                {recipe.difficulty}
                            </span>
                        )}
                        {recipe.style && (
                            <div className="flex items-center gap-1 bg-md-surface-container-high px-3 py-1 rounded-full text-md-on-surface-variant">
                                <Icon name="style" className="text-sm" />
                                <span className="typescale-label-medium font-bold">{recipe.style}</span>
                            </div>
                        )}
                    </div>

                    {recipe.description_short && (
                        <h2 className="typescale-title-medium font-bold text-md-on-surface leading-snug">
                            {recipe.description_short}
                        </h2>
                    )}

                    {recipe.description_detailed && (
                        <p className="typescale-body-medium text-md-on-surface-variant leading-relaxed">
                            {recipe.description_detailed}
                        </p>
                    )}

                    {recipe.philosophy && (
                        <div className="p-3.5 bg-md-surface-container-high rounded-xl border border-md-outline-variant/20">
                            <p className="typescale-body-small text-md-on-surface-variant italic leading-relaxed">
                                "{recipe.philosophy}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Stats Card */}
                <div className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/30 shadow-md-1">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name="coffee" className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">
                                {hasValidRatio ? formatWeight(coffeeDose, unitSystem) : '—'}
                            </span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">Coffee</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name="water_drop" className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">{recipe.total_water ? formatVolume(recipe.total_water, unitSystem) : '—'}</span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">Water</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name="thermostat" className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">{recipe.temperature ? `${recipe.temperature}°C` : '—'}</span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">Temp</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name="percent" className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">{recipe.ratio || '—'}</span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">Ratio</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name="timer" className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">{formatDuration(totalTime)}</span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">Target Time</span>
                        </div>
                    </div>
                </div>

                {/* Tags Card */}
                {(bestForTags.length > 0 || notRecommendedTags.length > 0) && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        {bestForTags.length > 0 && (
                            <div>
                                <h3 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Icon name="check_circle" className="text-base text-md-primary" /> Best For
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {bestForTags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-md-primary-container/40 text-md-primary typescale-label-medium font-bold rounded-full border border-md-primary/20">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {notRecommendedTags.length > 0 && (
                            <div>
                                <h3 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Icon name="cancel" className="text-base text-md-error" /> Not Recommended
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {notRecommendedTags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-md-error-container/30 text-md-error typescale-label-medium font-bold rounded-full border border-md-error/20">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Steps Section */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 mb-8">
                    <h3 className="typescale-label-large font-bold uppercase tracking-wider text-md-on-surface-variant mb-5 flex items-center gap-2">
                        <Icon name="format_list_numbered" className="text-md-primary text-xl" />
                        Brewing Steps
                    </h3>
                    <div className="relative pl-2 border-l-2 border-dashed border-md-outline-variant/40 space-y-8 ml-2">
                        {recipe.steps.map((step, index) => {
                            const intervalInfo = getStepIntervalInfo(step);
                            const isPour = typeof step.target_weight === 'number' && step.target_weight > 0;
                            return (
                                <div key={step.id} className="relative pl-6 space-y-1.5">
                                    <div className={`absolute -left-[17px] top-0 size-8 rounded-full typescale-label-medium font-bold flex items-center justify-center border-4 border-md-surface-container-low shadow-sm ${
                                        index === 0 ? 'bg-md-primary text-md-on-primary' : 'bg-md-surface-container-highest text-md-on-surface-variant'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="typescale-title-medium font-bold text-md-on-surface flex-1 min-w-0 leading-snug">{step.label}</h4>
                                        <span className="typescale-label-medium font-bold text-md-primary flex items-center gap-1 bg-md-primary-container/40 px-2.5 py-0.5 rounded-full shrink-0 border border-md-primary/20">
                                            <Icon name="timer" className="text-xs" />
                                            {step.duration_seconds}s
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                        {isPour && step.target_weight && (
                                            <>
                                                <span className="inline-flex items-center gap-1 typescale-label-small font-extrabold text-md-primary bg-md-primary-container/40 px-2.5 py-0.5 rounded-full border border-md-primary/20">
                                                    <Icon name="water_drop" className="text-xs" />
                                                    +{getPourAmount(recipe.steps, index)}g
                                                </span>
                                                <span className="inline-flex items-center gap-1 typescale-label-small font-bold text-md-on-surface-variant bg-md-surface-container-highest px-2.5 py-0.5 rounded-full border border-md-outline-variant/20">
                                                    <Icon name="scale" className="text-xs text-md-on-surface-variant/70" />
                                                    Target: {step.target_weight}g
                                                </span>
                                            </>
                                        )}
                                        {intervalInfo.restSeconds > 0 && (
                                            <span className="inline-flex items-center gap-1 typescale-label-small font-bold text-md-secondary bg-md-secondary-container/40 px-2.5 py-0.5 rounded-full border border-md-secondary/20">
                                                <Icon name="hourglass_empty" className="text-xs" />
                                                Rest: {intervalInfo.restSeconds}s
                                            </span>
                                        )}
                                    </div>
                                    {step.instruction && (
                                        <p className="typescale-body-small text-md-on-surface-variant leading-relaxed pt-0.5">{step.instruction}</p>
                                    )}
                                </div>
                            );
                        })}

                        {/* Finish Step */}
                        <div className="relative pl-6 pt-2">
                            <div className="absolute -left-[15px] top-2 size-6 rounded-full bg-md-primary-container flex items-center justify-center border-4 border-md-surface-container-low">
                                <div className="size-2.5 bg-md-primary rounded-full"></div>
                            </div>
                            <div>
                                <h4 className="typescale-title-medium font-bold text-md-on-surface">Enjoy!</h4>
                                <p className="typescale-body-small text-md-on-surface-variant mt-0.5 font-medium">Total Brew Time: ~{formatDuration(totalTime)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Action CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 max-w-md mx-auto z-20">
                <button
                    onClick={() => navigate(`/recipes/${recipe.id}/prepare`)}
                    className="w-full bg-md-primary text-md-on-primary font-bold py-3.5 rounded-full shadow-md-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer typescale-title-medium hover:bg-md-primary/90"
                >
                    <Icon name="play_circle" className="text-2xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                    Start Brewing
                </button>
            </div>
        </div>
    );
};
