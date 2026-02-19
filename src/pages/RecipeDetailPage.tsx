import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { brewService } from '../core/services';
import type { Recipe } from '../shared/domain/entities';
import { BottomNav } from '../components/BottomNav';

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

    const handleStartBrewing = () => {
        // startBrew(recipe); // Moved to final step in preparation
        navigate(`/recipes/${recipe.id}/prepare`);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate time ranges for steps
    let currentTime = 0;
    const stepsWithTiming = recipe.steps.map(step => {
        const startTime = currentTime;
        currentTime += step.duration_seconds;
        return {
            ...step,
            timeLabel: `${formatTime(startTime)} - ${formatTime(currentTime)}`
        };
    });

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-white shadow-2xl pb-24 font-display text-[#181411]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md pt-12 pb-4 px-6 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-[#181411] hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <Icon name="arrow_back" className="text-[24px]" />
                    </button>
                    <span className="text-lg font-bold text-[#181411]">Recipe Details</span>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center justify-center w-10 h-10 rounded-full text-[#181411] hover:bg-gray-100 transition-colors cursor-pointer">
                        <Icon name="share" className="text-[22px]" />
                    </button>
                    <button
                        onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                        className="flex items-center justify-center w-10 h-10 -mr-2 rounded-full text-[#181411] hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <Icon name="edit" className="text-[22px]" />
                    </button>
                </div>
            </div>

            {/* Title Section */}
            <div className="px-6 py-6">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-primary uppercase tracking-wider">{recipe.method_id} Recipe</span>
                    <h1 className="text-3xl font-bold text-[#181411] leading-tight">{recipe.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-500 text-sm font-medium">By CoffeeFlow</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <div className="flex items-center gap-1">
                            <Icon name="star" className="text-[14px] text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }} />
                            <span className="text-sm font-semibold text-[#181411]">4.9</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Quad */}
            <div className="px-6 pb-8">
                <div className="grid grid-cols-4 gap-2">
                    <StatBox icon="coffee" value={`${recipe.ratio.split(':')[0]}g`} label="Coffee" />
                    <StatBox icon="water_drop" value={`${recipe.total_water}ml`} label="Water" />
                    <StatBox icon="thermostat" value={`${recipe.temperature}°C`} label="Temp" />
                    <StatBox icon="grain" value={recipe.grind_size || 'Medium'} label="Grind" />
                </div>
            </div>

            {/* Description */}
            <div className="px-6 pb-6 text-gray-600 text-sm leading-relaxed">
                <p>
                    A balanced and clear cup of coffee, following the world-champion inspired {recipe.name}.
                    Adjust your grind size to coarse to maintain clarity.
                </p>
            </div>

            {/* Steps Timeline */}
            <div className="flex-1 px-6 pb-32">
                <h2 className="text-lg font-bold text-[#181411] mb-5 flex items-center gap-2">
                    <Icon name="format_list_numbered" className="text-primary" />
                    Brewing Steps
                </h2>
                <div className="relative pl-4 border-l-2 border-gray-100 space-y-8 ml-2">
                    {stepsWithTiming.map((step, index) => (
                        <div key={step.id} className="relative pl-6">
                            <div className={`absolute -left-[25px] top-0 w-6 h-6 rounded-full ${index === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'} text-xs font-bold flex items-center justify-center border-4 border-white shadow-sm`}>
                                {index + 1}
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-bold text-[#181411]">{step.label}</h3>
                                    <p className="text-sm text-gray-500 mt-1">Wait for draw down after pouring.</p>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                    <span className="block text-sm font-bold text-primary">{step.timeLabel}</span>
                                    {step.target_weight && step.target_weight > 0 && (
                                        <span className="block text-xs font-semibold text-gray-400 mt-0.5">+{step.target_weight}g Water</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Final Step */}
                    <div className="relative pl-6">
                        <div className="absolute -left-[23px] top-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center border-4 border-white">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-base font-bold text-[#181411]">Enjoy</h3>
                                <p className="text-sm text-gray-500 mt-1">Total Brew Time: {formatTime(currentTime)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action Button */}
            <div className="fixed bottom-24 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent max-w-md mx-auto z-20">
                <button
                    onClick={handleStartBrewing}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                    <Icon name="play_circle" />
                    Start Brewing
                </button>
            </div>

            <BottomNav activeTab="brewing" />
        </div>
    );
};

const StatBox = ({ icon, value, label }: { icon: string, value: string, label: string }) => (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100">
        <Icon name={icon} className="text-primary mb-1 text-[20px]" />
        <span className="text-sm font-bold text-[#181411]">{value}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-0.5">{label}</span>
    </div>
);
