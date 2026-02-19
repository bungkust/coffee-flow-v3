import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService } from '../core/services';
import type { Recipe } from '../shared/domain/entities';

export const RecipeDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);

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
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center">
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


    // Re-calculate easier
    let runningTotal = 0;
    const stepsWithRunningTotal = recipe.steps.map(step => {
        const prevTotal = runningTotal;
        if (step.target_weight) {
            runningTotal = step.target_weight;
        }
        return {
            ...step,
            prevTotal,
            isPour: !!step.target_weight
        };
    });

    const totalTime = recipe.steps.reduce((acc, step) => acc + step.duration_seconds, 0);
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-white shadow-2xl pb-24 font-display text-[#181411]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md pt-12 pb-4 px-6 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-[#181411] hover:bg-gray-100 transition-colors"
                >
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <button
                    onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                    className="flex items-center justify-center w-10 h-10 -mr-2 rounded-full text-[#181411] hover:bg-gray-100 transition-colors"
                >
                    <Icon name="edit" className="text-[24px]" />
                </button>
            </div>

            <div className="px-6 pb-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-primary uppercase tracking-wider">{recipe.method_id} Recipe</span>
                        {recipe.difficulty && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${recipe.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                                recipe.difficulty === 'Intermediate' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {recipe.difficulty}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-[#181411] leading-tight">{recipe.name}</h1>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-3 mt-2">
                        {recipe.style && (
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                                <Icon name="style" className="text-[16px] text-gray-600" />
                                <span className="text-xs font-semibold text-gray-700">{recipe.style}</span>
                            </div>
                        )}
                        {/* Rating placeholder */}
                        <div className="flex items-center gap-1">
                            <Icon name="star" className="text-[16px] text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }} />
                            <span className="text-sm font-semibold text-[#181411]">4.8</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-6 pb-6">
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="coffee" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">
                            {Math.round((recipe.total_water || 0) / parseFloat(recipe.ratio.split(':')[1] || '15'))}g
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Coffee</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="water_drop" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">{recipe.total_water}ml</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Water</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="thermostat" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">{recipe.temperature}°C</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Temp</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="percent" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">{recipe.ratio}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Ratio</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <Icon name="timer" className="text-primary mb-1 text-[20px]" />
                        <span className="text-sm font-bold text-[#181411]">{formatTime(totalTime)}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">Target Time</span>
                    </div>
                </div>
            </div>

            {/* Tags Section */}
            <div className="px-6 pb-6 space-y-4">
                {recipe.best_for_tags && recipe.best_for_tags.length > 0 && (
                    <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Best For</h2>
                        <div className="flex flex-wrap gap-2">
                            {recipe.best_for_tags.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {recipe.not_recommended_tags && recipe.not_recommended_tags.length > 0 && (
                    <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Not Recommended</h2>
                        <div className="flex flex-wrap gap-2">
                            {recipe.not_recommended_tags.map(tag => (
                                <span key={tag} className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Review/Description Section */}
            <div className="px-6 pb-8">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">About Recipe</h2>
                <div className="space-y-4">
                    {recipe.description_short && (
                        <p className="text-base font-semibold text-[#181411] leading-snug">
                            {recipe.description_short}
                        </p>
                    )}
                    {recipe.description_detailed && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {recipe.description_detailed}
                        </p>
                    )}
                    {recipe.philosophy && (
                        <div className="p-4 bg-primary-light/30 rounded-xl border border-primary-light border-l-4 border-l-primary">
                            <p className="text-primary-dark text-sm italic leading-relaxed">
                                "{recipe.philosophy}"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Steps Section */}
            <div className="flex-1 px-6 pb-32">
                <h2 className="text-lg font-bold text-[#181411] mb-5 flex items-center gap-2">
                    <Icon name="format_list_numbered" className="text-primary" />
                    Brewing Steps
                </h2>
                <div className="relative pl-4 border-l-2 border-gray-100 space-y-8">
                    {stepsWithRunningTotal.map((step, index) => (
                        <div key={step.id} className="relative pl-6">
                            <div className={`absolute -left-[25px] top-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border-4 border-white shadow-sm ${index === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {index + 1}
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-bold text-[#181411]">{step.label}</h3>
                                    {step.instruction && (
                                        <p className="text-sm text-gray-500 mt-1">{step.instruction}</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                    <span className="block text-sm font-bold text-primary">{step.duration_seconds}s</span>
                                    {step.isPour && step.target_weight && (
                                        <span className="block text-xs font-semibold text-gray-400 mt-0.5">
                                            {step.target_weight > step.prevTotal ? `+${step.target_weight - step.prevTotal}g` : ''}
                                            (Total {step.target_weight}g)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Finish Step */}
                    <div className="relative pl-6">
                        <div className="absolute -left-[23px] top-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center border-4 border-white">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-base font-bold text-[#181411]">Enjoy</h3>
                                <p className="text-sm text-gray-500 mt-1">Total Brew Time: ~{formatTime(totalTime)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent max-w-md mx-auto">
                <button
                    onClick={() => navigate(`/recipes/${recipe.id}/prepare`)}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    <Icon name="play_circle" className="text-[24px]" />
                    Start Brewing
                </button>
            </div>
        </div>
    );
};
