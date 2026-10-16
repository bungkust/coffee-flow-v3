import { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon, SplashLogoIcon } from '../components/Icons';
import { brewService } from '../core/services';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';
import type { Recipe } from '../shared/domain/entities';
import { formatDuration, getBrewDuration } from '../shared/utils/brewMath';

import { SmartImportModal, type ImportableRecipe } from '../components/SmartImportModal';
import { PageHeader } from '../components/PageHeader';
import { SearchBar } from '../components/SearchBar';
import { StatCard } from '../components/StatCard';
import { SpeedDialFab } from '../components/SpeedDialFab';
import { useSafeBack } from '../shared/utils/backNavigation';

export const RecipeListPage = () => {
    const navigate = useNavigate();
    const safeBack = useSafeBack();
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
            <PageHeader
                title={methodFilter ? `${methodFilter} Recipes` : 'Recipes'}
                onBack={() => safeBack('/brew-methods')}
                titleClassName="capitalize truncate"
                rowClassName="mb-3"
            >
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={`Search ${methodFilter || ''} recipes...`}
                    className="mb-1"
                />
            </PageHeader>

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
                                <StatCard label="Time" value={formatDuration(getBrewDuration(recipe.steps))} />
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

            {/* Floating Speed Dial FAB */}
            <SpeedDialFab
                actions={[
                    {
                        label: 'Import Recipe',
                        customIcon: <SplashLogoIcon className="w-4 h-4 text-primary" />,
                        className: 'text-primary border-primary/10 hover:bg-primary/5',
                        onClick: () => setIsImportModalOpen(true),
                    },
                    {
                        label: 'New Recipe',
                        icon: 'edit',
                        onClick: () => navigate(`/recipes/new/edit?method=${methodFilter?.toUpperCase() || 'V60'}`),
                    },
                ]}
            />

            <BottomNav activeTab="brewing" />

            <SmartImportModal
                isOpen={isImportModalOpen}
                initialParsedRecipes={restoredQueue}
                showMethodPicker
                defaultMethodId={methodFilter || 'v60'}
                onClose={() => {
                    setIsImportModalOpen(false);
                    setRestoredQueue([]);
                    sessionStorage.removeItem('coffee_flow_import_queue');
                }}
                onImport={(importedData) => {
                    setIsImportModalOpen(false);
                    navigate(`/recipes/new/edit?method=${(methodFilter || importedData.method_id || 'v60').toUpperCase()}`, {
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
                        method_id: methodFilter || importedData.method_id || 'v60',
                        ratio: importedData.ratio || '1:15',
                        temperature: importedData.temperature ?? 93,
                        grind_size: importedData.grind_size || 'Medium',
                        difficulty: importedData.difficulty || 'Intermediate',
                        total_water: importedData.total_water ?? 225,
                        description_short: importedData.description_short || '',
                        description_detailed: importedData.description_detailed || '',
                        philosophy: importedData.philosophy || '',
                        source: importedData.source || undefined,
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


