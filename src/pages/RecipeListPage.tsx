import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../components/Icons';
import { brewService } from '../core/services';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';

export const RecipeListPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const methodFilter = searchParams.get('method');

    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeChip, setActiveChip] = useState('All');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<any>(null);

    const fetchRecipes = async () => {
        try {
            setLoading(true);
            let data = await brewService.getAllRecipes();
            if (methodFilter) {
                data = data.filter(r => r.method_id === methodFilter);
            }
            setRecipes(data);
        } catch (err) {
            console.error('Error fetching recipes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecipes();
    }, [methodFilter]);

    const filteredRecipes = useMemo(() => {
        return recipes.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesChip = activeChip === 'All' ||
                (activeChip === 'Personal' && r.is_custom) ||
                (activeChip === 'Community' && !r.is_custom);
            return matchesSearch && matchesChip;
        });
    }, [recipes, searchQuery, activeChip]);

    const handleSelectRecipe = (recipe: any) => {
        navigate(`/recipes/${recipe.id}`);
    };

    const handleKebabClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    const handleClone = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await brewService.cloneRecipe(id);
            setActiveMenuId(null);
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


    const handleDeleteClick = (e: React.MouseEvent, recipe: any) => {
        e.stopPropagation();
        setRecipeToDelete(recipe);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
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

    const chips = ['All', 'Personal', 'Community', 'Light Roast', 'Dark Roast'];

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl pb-32">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-neutral-text hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <Icon name="arrow_back" className="text-[24px]" />
                        </button>
                        <h1 className="text-neutral-text tracking-tight text-xl font-bold leading-tight capitalize">
                            {methodFilter ? `${methodFilter} Recipes` : 'Recipes'}
                        </h1>
                    </div>
                </div>
                <div className="relative mb-2">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <Icon name="search" className="text-[20px]" />
                    </span>
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white text-neutral-text placeholder-gray-400 rounded-xl py-2.5 pl-10 pr-4 border-none shadow-sm focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                        placeholder={`Search ${methodFilter || ''} recipes...`}
                        type="text"
                    />
                </div>
            </div>

            {/* Filter Chips */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar">
                {chips.map(chip => (
                    <button
                        key={chip}
                        onClick={() => setActiveChip(chip)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap transition-colors cursor-pointer ${activeChip === chip
                            ? 'bg-primary text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-primary/50 hover:text-primary'
                            }`}
                    >
                        {chip}
                    </button>
                ))}
            </div>

            {/* Recipe List */}
            <div className="flex-1 px-4 pt-2 pb-24 flex flex-col gap-3">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-white rounded-xl animate-pulse shadow-sm border border-gray-100"></div>
                    ))
                ) : filteredRecipes.length > 0 ? (
                    filteredRecipes.map(recipe => (
                        <div
                            key={recipe.id}
                            onClick={() => handleSelectRecipe(recipe)}
                            className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 active:scale-[0.99] transition-all relative cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-neutral-text text-base mb-0.5">{recipe.name}</h3>
                                    <p className="text-xs text-gray-500 font-medium">Synced from {recipe.method_id}</p>
                                </div>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => handleToggleFavorite(e, recipe.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent-light text-primary transition-colors cursor-pointer"
                                    >
                                        <Icon name="bookmark" className="text-[20px]" style={{ fontVariationSettings: recipe.is_favorite ? "'FILL' 1" : "'FILL' 0" }} />
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => handleKebabClick(e, recipe.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
                                        >
                                            <Icon name="more_vert" className="text-[20px]" />
                                        </button>

                                        {activeMenuId === recipe.id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-20"
                                                    onClick={() => setActiveMenuId(null)}
                                                />
                                                <div className="absolute right-0 top-10 w-36 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/recipes/${recipe.id}/edit`); }}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                    >
                                                        <Icon name="edit" className="text-[18px] text-gray-400" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleClone(e, recipe.id)}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                    >
                                                        <Icon name="content_copy" className="text-[18px] text-gray-400" />
                                                        Clone
                                                    </button>
                                                    <div className="h-[1px] bg-gray-50 my-1" />
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, recipe)}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
                                <StatCard label="Time" value="3:30" />
                                <StatCard label="Ratio" value={recipe.ratio} />
                                <StatCard label="Temp" value={`${recipe.temperature}°C`} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center">
                        <Icon name="coffee" className="text-5xl text-gray-200 mb-3" />
                        <p className="text-sm text-gray-400 font-medium">No recipes found matching your criteria.</p>
                    </div>
                )}
            </div>

            {/* Floating Add Button */}
            <button
                onClick={() => navigate(`/recipes/new/edit?method=${methodFilter || 'V60'}`)}
                className="fixed bottom-28 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 flex items-center justify-center hover:bg-primary-dark transition-colors active:scale-90 border-[3px] border-white cursor-pointer"
            >
                <Icon name="add" className="text-[32px]" />
            </button>

            <BottomNav activeTab="brewing" />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Recipe?"
                message={`Are you sure you want to delete "${recipeToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="error"
            />
        </div>
    );
};

const StatCard = ({ label, value }: { label: string, value: string }) => (
    <div className="flex-1 bg-accent-light/40 rounded-lg py-1.5 px-2 text-center border border-primary/10">
        <span className="block text-[10px] text-gray-500 uppercase tracking-wide font-bold">{label}</span>
        <span className="block text-xs font-bold text-primary">{value}</span>
    </div>
);
