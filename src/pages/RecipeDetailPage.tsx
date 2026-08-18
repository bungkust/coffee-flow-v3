import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService, settingsService } from '../core/services';
import type { Recipe } from '../shared/domain/entities';
import { calculateCoffeeDose, formatDuration, formatWeight, formatVolume, sumStepDuration, getPourAmount, type UnitSystem } from '../shared/utils/brewMath';

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
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-light">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-light p-6 text-center">
                <Icon name="error" className="text-5xl text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-neutral-text">Recipe not found</h2>
                <button
                    onClick={() => navigate('/recipes')}
                    className="mt-4 text-primary font-bold hover:underline"
                >
                    Back to recipes
                </button>
            </div>
        );
    }


    const stepsWithRunningTotal = recipe.steps.map(step => {
        return {
            ...step,
            isPour: typeof step.target_weight === 'number' && step.target_weight > 0
        };
    });

    const totalTime = sumStepDuration(recipe.steps);
    const coffeeDose = calculateCoffeeDose(recipe.total_water, recipe.ratio);
    const hasValidRatio = coffeeDose > 0;
    const bestForTags = recipe.best_for_tags || [];
    const notRecommendedTags = recipe.not_recommended_tags || [];

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl pb-28 font-display text-neutral-text">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100 transition-all">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-neutral-text hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <Icon name="arrow_back" className="text-[24px]" />
                        </button>
                        <h1 className="text-neutral-text tracking-tight text-xl font-bold leading-tight line-clamp-1">
                            {recipe.name}
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                        className="flex items-center justify-center w-10 h-10 -mr-2 rounded-full text-neutral-text hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <Icon name="edit" className="text-[24px]" />
                    </button>
                </div>
            </div>

            {/* Main Content Content */}
            <div className="flex flex-col px-4 pt-4 gap-4">

                {/* About Card */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded-md">{recipe.method_id}</span>
                            {recipe.difficulty && (
                                <span className={`text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wide ${recipe.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                                    recipe.difficulty === 'Intermediate' ? 'bg-orange-100 text-orange-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {recipe.difficulty}
                                </span>
                            )}
                            {recipe.style && (
                                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                                    <Icon name="style" className="text-[14px] text-gray-500" />
                                    <span className="text-xs font-bold text-gray-600">{recipe.style}</span>
                                </div>
                            )}
                        </div>

                        {recipe.description_short && (
                            <p className="text-lg font-bold text-neutral-text leading-tight">
                                {recipe.description_short}
                            </p>
                        )}

                        {recipe.description_detailed && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {recipe.description_detailed}
                            </p>
                        )}

                        {recipe.philosophy && (
                            <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-gray-600 text-xs italic leading-relaxed">
                                    "{recipe.philosophy}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Card */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-50">
                            <Icon name="coffee" className="text-primary mb-1 text-[20px]" />
                            <span className="text-sm font-bold text-neutral-text">
                                {hasValidRatio ? formatWeight(coffeeDose, unitSystem) : '—'}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mt-0.5">Coffee</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-50">
                            <Icon name="water_drop" className="text-primary mb-1 text-[20px]" />
                            <span className="text-sm font-bold text-neutral-text">{recipe.total_water ? formatVolume(recipe.total_water, unitSystem) : '—'}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mt-0.5">Water</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-50">
                            <Icon name="thermostat" className="text-primary mb-1 text-[20px]" />
                            <span className="text-sm font-bold text-neutral-text">{recipe.temperature ? `${recipe.temperature}°C` : '—'}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mt-0.5">Temp</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-50">
                            <Icon name="percent" className="text-primary mb-1 text-[20px]" />
                            <span className="text-sm font-bold text-neutral-text">{recipe.ratio || '—'}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mt-0.5">Ratio</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-50">
                            <Icon name="timer" className="text-primary mb-1 text-[20px]" />
                            <span className="text-sm font-bold text-neutral-text">{formatDuration(totalTime)}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mt-0.5">Target Time</span>
                        </div>
                    </div>
                </div>

                {/* Tags Card (Conditional) */}
                {(bestForTags.length > 0 || notRecommendedTags.length > 0) && (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        {bestForTags.length > 0 && (
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Icon name="check_circle" className="text-[14px]" /> Best For
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {bestForTags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {notRecommendedTags.length > 0 && (
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Icon name="cancel" className="text-[14px]" /> Not Recommended
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {notRecommendedTags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Steps Section */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-8">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-5 flex items-center gap-2">
                        <Icon name="format_list_numbered" className="text-primary text-[18px]" />
                        Brewing Steps
                    </h2>
                    <div className="relative pl-2 border-l-2 border-dashed border-gray-200 space-y-8 ml-2">
                        {stepsWithRunningTotal.map((step, index) => (
                            <div key={step.id} className="relative pl-6">
                                <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center border-4 border-white shadow-sm transition-transform hover:scale-110 ${index === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {index + 1}
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-base font-bold text-neutral-text">{step.label}</h3>
                                        {step.instruction && (
                                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{step.instruction}</p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                                        <span className="text-sm font-bold text-primary flex items-center gap-1">
                                            <Icon name="timer" className="text-[14px]" />
                                            {step.duration_seconds}s
                                        </span>
                                        {step.isPour && step.target_weight && (
                                            <span className="text-xs font-bold text-gray-400 mt-1 bg-gray-50 px-1.5 py-0.5 rounded-md">
                                                +{getPourAmount(recipe.steps, index)}g (Target: {step.target_weight}g)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Finish Step */}
                        <div className="relative pl-6 pt-2">
                            <div className="absolute -left-[15px] top-2 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white">
                                <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-neutral-text">Enjoy!</h3>
                                <p className="text-sm text-gray-500 mt-0.5 font-medium">Total Brew Time: ~{formatDuration(totalTime)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-light via-background-light/95 to-transparent max-w-md mx-auto z-20">
                <button
                    onClick={() => navigate(`/recipes/${recipe.id}/prepare`)}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer text-lg"
                >
                    <Icon name="play_circle" className="text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                    Start Brewing
                </button>
            </div>
        </div>
    );
};
