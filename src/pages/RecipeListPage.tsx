import { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon, SplashLogoIcon } from '../components/Icons';
import { brewService } from '../core/services';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';
import type { Recipe } from '../shared/domain/entities';
import { formatDuration, sumStepDuration } from '../shared/utils/brewMath';

import { SmartImportModal, type ImportableRecipe } from '../components/SmartImportModal';

export const RecipeListPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const methodFilter = searchParams.get('method');

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeChip, setActiveChip] = useState('All');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [restoredQueue, setRestoredQueue] = useState<ImportableRecipe[]>([]);

    const fetchRecipes = useCallback(async () => {
        try {
            setLoading(true);
            let data = await brewService.getAllRecipes();
            if (methodFilter) {
                data = data.filter(r => r.method_id.toLowerCase() === methodFilter.toLowerCase());
            }
            setRecipes(data);
        } catch (err) {
            console.error('Error fetching recipes:', err);
        } finally {
            setLoading(false);
        }
    }, [methodFilter]);

    useEffect(() => {
        fetchRecipes();

        // Restore pending import queue if returning from RecipeEditPage
        const rawQueue = sessionStorage.getItem('coffee_flow_import_queue');
        if (rawQueue) {
            try {
                const queue = JSON.parse(rawQueue) as ImportableRecipe[];
                if (Array.isArray(queue) && queue.length > 0) {
                    setRestoredQueue(queue);
                    setIsImportModalOpen(true);
                }
            } catch {
                sessionStorage.removeItem('coffee_flow_import_queue');
            }
        }
    }, [fetchRecipes]);

    const filteredRecipes = useMemo(() => {
        return recipes
            .filter(r => {
                const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesChip = activeChip === 'All' ||
                    (activeChip === 'Personal' && r.is_custom) ||
                    (activeChip === 'Community' && !r.is_custom) ||
                    (activeChip === 'Favorites' && r.is_favorite) ||
                    (activeChip === 'Light Roast' && (r.best_for_tags || []).some(tag => tag.toLowerCase().includes('light'))) ||
                    (activeChip === 'Dark Roast' && (r.best_for_tags || []).some(tag => tag.toLowerCase().includes('dark')));
                return matchesSearch && matchesChip;
            })
            .sort((a, b) => (b.is_favorite === a.is_favorite ? 0 : b.is_favorite ? 1 : -1));
    }, [recipes, searchQuery, activeChip]);

    const handleSelectRecipe = (recipe: Recipe) => {
        navigate(`/recipes/${recipe.id}`);
    };

    const handleKebabClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    const handleClone = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await brewService.cloneRecipe(id);
            setTimeout(() => setActiveMenuId(null), 50);
            fetchRecipes();
        } catch (err) {
            console.error('Failed to clone recipe:', err);
        }
    };

    const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            // Optimistic update
            setRecipes(current =>
                current.map(r => r.id === id ? { ...r, is_favorite: !r.is_favorite } : r)
            );
            await brewService.toggleFavorite(id);
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
            // Revert on failure
            fetchRecipes();
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, recipe: Recipe) => {
        e.stopPropagation();
        e.preventDefault();
        setRecipeToDelete(recipe);
        setIsDeleteModalOpen(true);
        setTimeout(() => setActiveMenuId(null), 50);
    };

    const confirmDelete = async () => {
        if (!recipeToDelete) return;
        try {
            await brewService.deleteRecipe(recipeToDelete.id);
            fetchRecipes();
        } catch (err) {
            console.error('Failed to delete recipe:', err);
        } finally {
            setRecipeToDelete(null);
        }
    };

    const chips = ['All', 'Favorites', 'Personal', 'Community', 'Light Roast', 'Dark Roast'];

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-32">
            {/* Sticky Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                            aria-label="Go back"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <h1 className="typescale-headline-small font-bold text-md-on-surface capitalize truncate">
                            {methodFilter ? `${methodFilter} Recipes` : 'Recipes'}
                        </h1>
                    </div>
                </div>
                <div className="relative mb-1">
                    <span className="absolute inset-y-0 left-3.5 flex items-center text-md-on-surface-variant">
                        <Icon name="search" className="text-xl" />
                    </span>
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-outline/60 rounded-full py-3 pl-11 pr-4 border-none shadow-none focus:outline-none focus:ring-2 focus:ring-md-primary typescale-body-large transition-all"
                        placeholder={`Search ${methodFilter || ''} recipes...`}
                        type="text"
                    />
                </div>
            </header>

            {/* Filter Chips */}
            <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {chips.map(chip => (
                    <button
                        key={chip}
                        onClick={() => setActiveChip(chip)}
                        className={`h-8 px-4 rounded-full typescale-label-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            activeChip === chip
                                ? 'bg-md-secondary-container text-md-on-secondary-container font-semibold shadow-sm'
                                : 'bg-md-surface-container-low text-md-on-surface-variant border border-md-outline-variant/40 hover:bg-md-surface-container-high'
                        }`}
                    >
                        {chip}
                    </button>
                ))}
            </div>

            {/* Recipe List */}
            <main className="flex-1 px-5 pt-2 pb-24 flex flex-col gap-3">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-36 bg-md-surface-container-low rounded-xl animate-pulse border border-md-outline-variant/20"></div>
                    ))
                ) : filteredRecipes.length > 0 ? (
                    filteredRecipes.map(recipe => (
                        <div
                            key={recipe.id}
                            onClick={() => handleSelectRecipe(recipe)}
                            className={`group relative p-4 rounded-xl shadow-md-1 border transition-all duration-200 cursor-pointer ${
                                recipe.is_favorite
                                    ? 'bg-md-primary-container/20 border-md-primary/40'
                                    : 'bg-md-surface-container-low border-md-outline-variant/30 hover:bg-md-surface-container-high'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="typescale-title-medium font-bold text-md-on-surface mb-0.5">{recipe.name}</h3>
                                    <p className="typescale-body-small text-md-on-surface-variant font-medium">Synced from {recipe.method_id}</p>
                                </div>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => handleToggleFavorite(e, recipe.id)}
                                        className="size-9 flex items-center justify-center rounded-full text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                                        aria-label="Favorite recipe"
                                    >
                                        <Icon
                                            name="bookmark"
                                            className={`text-xl ${recipe.is_favorite ? 'text-md-primary' : 'text-md-outline'}`}
                                            style={{ fontVariationSettings: recipe.is_favorite ? "'FILL' 1" : "'FILL' 0" }}
                                        />
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => handleKebabClick(e, recipe.id)}
                                            className="size-9 flex items-center justify-center rounded-full text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                                            aria-label="More options"
                                        >
                                            <Icon name="more_vert" className="text-xl" />
                                        </button>

                                        {activeMenuId === recipe.id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-20"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setActiveMenuId(null);
                                                    }}
                                                />
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                    }}
                                                    className="absolute right-0 top-10 w-36 bg-md-surface-container-high text-md-on-surface rounded-md shadow-md-3 border border-md-outline-variant/30 py-1.5 z-30 animate-in fade-in duration-150"
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            setTimeout(() => setActiveMenuId(null), 50);
                                                            navigate(`/recipes/${recipe.id}/edit`);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left typescale-body-medium font-semibold text-md-on-surface hover:bg-md-surface-container-highest flex items-center gap-2 transition-colors cursor-pointer"
                                                    >
                                                        <Icon name="edit" className="text-lg text-md-on-surface-variant" />
                                                        Edit

                                                    </button>
                                                    <button
                                                        onClick={(e) => handleClone(e, recipe.id)}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                                                    >
                                                        <Icon name="content_copy" className="text-[18px] text-gray-400" />
                                                        Clone
                                                    </button>
                                                    <div className="h-[1px] bg-gray-50 my-1" />
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, recipe)}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                                    >
                                                        <Icon name="delete" className="text-[18px]" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                                <StatCard label="Time" value={formatDuration(sumStepDuration(recipe.steps))} />
                                <StatCard label="Ratio" value={recipe.ratio} />
                                <StatCard label="Temp" value={`${recipe.temperature}°C`} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center">
                        <SplashLogoIcon className="w-12 h-12 text-gray-200 mb-3" />
                        <p className="text-sm text-gray-400 font-medium">No recipes found matching your criteria.</p>
                    </div>
                )}
            </main>

            {/* Backdrop overlay when FAB menu is open */}
            {isFabMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-in fade-in duration-150"
                    onClick={() => setIsFabMenuOpen(false)}
                />
            )}

            {/* Floating Speed Dial FAB */}
            <div className="fixed bottom-28 right-6 z-40 flex flex-col items-end gap-3">
                {isFabMenuOpen && (
                    <div className="flex flex-col items-end gap-2.5 mb-1 animate-in slide-in-from-bottom-4 fade-in duration-200">
                        <button
                            onClick={() => {
                                setIsFabMenuOpen(false);
                                setIsImportModalOpen(true);
                            }}
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-primary rounded-2xl shadow-xl border border-primary/10 text-xs font-bold hover:bg-primary/5 active:scale-95 transition-all cursor-pointer"
                        >
                            <SplashLogoIcon className="w-4 h-4 text-primary" />
                            <span>Import Recipe</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsFabMenuOpen(false);
                                navigate(`/recipes/new/edit?method=${methodFilter?.toUpperCase() || 'V60'}`);
                            }}
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-gray-800 rounded-2xl shadow-xl border border-gray-100 text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                        >
                            <Icon name="edit" className="text-[18px] text-gray-500" />
                            <span>New Recipe</span>
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                    className={`w-14 h-14 rounded-full text-white shadow-lg shadow-primary/40 flex items-center justify-center transition-all duration-300 active:scale-90 border-[3px] border-white cursor-pointer ${isFabMenuOpen ? 'bg-gray-800 rotate-45' : 'bg-primary hover:bg-primary-dark'
                        }`}
                >
                    <Icon name="add" className="text-[32px]" />
                </button>
            </div>

            <BottomNav activeTab="brewing" />

            <SmartImportModal
                isOpen={isImportModalOpen}
                initialParsedRecipes={restoredQueue}
                onClose={() => {
                    setIsImportModalOpen(false);
                    setRestoredQueue([]);
                    sessionStorage.removeItem('coffee_flow_import_queue');
                }}
                onImport={(importedData) => {
                    setIsImportModalOpen(false);
                    navigate(`/recipes/new/edit?method=${(importedData.method_id || methodFilter || 'V60').toUpperCase()}`, {
                        state: { prefill: importedData }
                    });
                }}
                onSaveDirect={async (importedData) => {
                    const id = crypto.randomUUID();
                    const now = new Date().toISOString();
                    const steps = (importedData.steps || []).map((s, i) => ({
                        ...s,
                        id: s.id || crypto.randomUUID(),
                        recipe_id: id,
                        step_order: i + 1,
                        created_at: s.created_at || now,
                        updated_at: s.updated_at || now,
                    }));
                    const fullRecipe = {
                        id,
                        name: importedData.name || 'Imported Recipe',
                        method_id: importedData.method_id || 'v60',
                        ratio: importedData.ratio || '1:15',
                        temperature: importedData.temperature ?? 93,
                        grind_size: importedData.grind_size || 'Medium',
                        difficulty: importedData.difficulty || 'Intermediate',
                        total_water: importedData.total_water ?? 225,
                        description_short: importedData.description_short || '',
                        description_detailed: importedData.description_detailed || '',
                        philosophy: importedData.philosophy || '',
                        best_for_tags: importedData.best_for_tags || [],
                        not_recommended_tags: importedData.not_recommended_tags || [],
                        steps,
                        is_custom: true,
                        is_favorite: false,
                        created_at: now,
                        updated_at: now,
                    };
                    await brewService.saveRecipe(fullRecipe);
                    setIsImportModalOpen(false);
                    fetchRecipes();
                    navigate(`/recipes/${id}`);
                }}
            />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Recipe?"
                message={`Are you sure you want to delete "${recipeToDelete?.name}"? This will hide the recipe from your list, but your existing brew logs and history will be kept.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="error"
            />
        </div>
    );
};

const StatCard = ({ label, value }: { label: string, value: string }) => (
    <div className="flex-1 bg-md-surface-container-high rounded-md py-1.5 px-2 text-center border border-md-outline-variant/20">
        <span className="block typescale-label-small text-md-on-surface-variant font-bold uppercase tracking-wide">{label}</span>
        <span className="block typescale-label-large font-bold text-md-primary">{value}</span>
    </div>
);
