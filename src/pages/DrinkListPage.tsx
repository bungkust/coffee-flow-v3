import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon, SplashLogoIcon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { SearchBar } from '../components/SearchBar';
import { StatCard } from '../components/StatCard';
import { SpeedDialFab } from '../components/SpeedDialFab';
import { drinkService } from '../core/services';
import type { Drink, DrinkBaseType } from '../shared/domain/entities';
import { parseList } from '../shared/utils/drinks';
import { useSafeBack } from '../shared/utils/backNavigation';
import { DrinkSmartImportModal } from '../components/DrinkSmartImportModal';

export const DrinkListPage = () => {
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const [searchParams] = useSearchParams();
    const baseParam = searchParams.get('base') as DrinkBaseType | null;
    const baseType: DrinkBaseType = baseParam === 'non_coffee' ? 'non_coffee' : 'coffee';

    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeChip, setActiveChip] = useState('All');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [drinkToDelete, setDrinkToDelete] = useState<Drink | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const fetchDrinks = useCallback(async () => {
        try {
            setLoading(true);
            const all = await drinkService.getAllDrinks(baseType);
            setDrinks(all);
        } catch (err) {
            console.error('Error fetching drinks:', err);
        } finally {
            setLoading(false);
        }
    }, [baseType]);

    useEffect(() => {
        fetchDrinks();
    }, [fetchDrinks]);

    const filteredDrinks = useMemo(() => {
        return drinks
            .filter((d) => {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    d.name.toLowerCase().includes(query) ||
                    (d.ingredients_json && d.ingredients_json.toLowerCase().includes(query));

                const matchesChip =
                    activeChip === 'All' ||
                    (activeChip === 'Favorites' && d.is_favorite) ||
                    (activeChip === 'Hot' && d.category.toLowerCase() === 'hot') ||
                    (activeChip === 'Cold' && d.category.toLowerCase() === 'cold');

                return matchesSearch && matchesChip;
            })
            .sort((a, b) => (b.is_favorite === a.is_favorite ? 0 : b.is_favorite ? 1 : -1));
    }, [drinks, searchQuery, activeChip]);

    const handleSelectDrink = (drink: Drink) => {
        navigate(`/drinks/${drink.id}`);
    };

    const handleKebabClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    const handleClone = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await drinkService.cloneDrink(id);
            setTimeout(() => setActiveMenuId(null), 50);
            fetchDrinks();
        } catch (err) {
            console.error('Failed to clone drink:', err);
        }
    };

    const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            setDrinks((current) =>
                current.map((d) => (d.id === id ? { ...d, is_favorite: !d.is_favorite } : d))
            );
            await drinkService.toggleFavorite(id);
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
            fetchDrinks();
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, drink: Drink) => {
        e.stopPropagation();
        e.preventDefault();
        setDrinkToDelete(drink);
        setIsDeleteModalOpen(true);
        setTimeout(() => setActiveMenuId(null), 50);
    };

    const confirmDelete = async () => {
        if (!drinkToDelete) return;
        try {
            await drinkService.deleteDrink(drinkToDelete.id);
            fetchDrinks();
        } catch (err) {
            console.error('Failed to delete drink:', err);
        } finally {
            setDrinkToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const chips = ['All', 'Favorites', 'Hot', 'Cold'];

    const title = baseType === 'non_coffee' ? 'Non-Coffee Drinks' : 'Coffee Base Drinks';

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-32">
            {/* Sticky Header matching RecipeListPage */}
            <PageHeader
                title={title}
                onBack={() => safeBack('/drinks')}
                titleClassName="truncate"
                rowClassName="mb-3"
            >
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={`Search ${baseType === 'non_coffee' ? 'non-coffee' : 'coffee'} recipes...`}
                    className="mb-1"
                />
            </PageHeader>

            {/* Filter Chips matching RecipeListPage */}
            <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {chips.map((chip) => (
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

            {/* Drink List */}
            <main className="flex-1 px-5 pt-2 pb-24 flex flex-col gap-3">
                {loading ? (
                    [1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-36 bg-md-surface-container-low rounded-xl animate-pulse border border-md-outline-variant/20"
                        />
                    ))
                ) : filteredDrinks.length > 0 ? (
                    filteredDrinks.map((drink) => {
                        const ingredients = parseList(drink.ingredients_json);

                        return (
                            <div
                                key={drink.id}
                                onClick={() => handleSelectDrink(drink)}
                                className={`group relative p-4 rounded-xl shadow-md-1 border transition-all duration-200 cursor-pointer ${
                                    drink.is_favorite
                                        ? 'bg-md-primary-container/20 border-md-primary/40'
                                        : 'bg-md-surface-container-low border-md-outline-variant/30 hover:bg-md-surface-container-high'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="min-w-0 pr-2">
                                        <h3 className="typescale-title-medium font-bold text-md-on-surface mb-0.5 truncate">
                                            {drink.name}
                                        </h3>
                                        <p className="typescale-body-small text-md-on-surface-variant font-medium truncate">
                                            {drink.base_type === 'non_coffee' ? 'Non-Coffee' : 'Coffee Base'} • {drink.category}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => handleToggleFavorite(e, drink.id)}
                                            className="size-9 flex items-center justify-center rounded-full text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                                            aria-label="Favorite drink"
                                        >
                                            <Icon
                                                name="bookmark"
                                                className={`text-xl ${drink.is_favorite ? 'text-md-primary' : 'text-md-outline'}`}
                                                style={{ fontVariationSettings: drink.is_favorite ? "'FILL' 1" : "'FILL' 0" }}
                                            />
                                        </button>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => handleKebabClick(e, drink.id)}
                                                className="size-9 flex items-center justify-center rounded-full text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                                                aria-label="More options"
                                            >
                                                <Icon name="more_vert" className="text-xl" />
                                            </button>

                                            {activeMenuId === drink.id && (
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
                                                                navigate(`/drinks/${drink.id}/edit`);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left typescale-body-medium font-semibold text-md-on-surface hover:bg-md-surface-container-highest flex items-center gap-2 transition-colors cursor-pointer"
                                                        >
                                                            <Icon name="edit" className="text-lg text-md-on-surface-variant" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleClone(e, drink.id)}
                                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                                                        >
                                                            <Icon name="content_copy" className="text-[18px] text-gray-400" />
                                                            Clone
                                                        </button>
                                                        <div className="h-[1px] bg-gray-50 my-1" />
                                                        <button
                                                            onClick={(e) => handleDeleteClick(e, drink)}
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

                                {/* 3 Metric StatCards matching RecipeListPage */}
                                <div className="flex gap-2 mt-3">
                                    <StatCard label="Type" value={drink.category} />
                                    <StatCard label="Base" value={drink.base_type === 'non_coffee' ? 'Non-Coffee' : 'Coffee'} />
                                    <StatCard label="Ingredients" value={`${ingredients.length} items`} />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white dark:bg-md-surface-container-low p-12 rounded-2xl border border-dashed border-gray-200 dark:border-md-outline-variant/30 text-center flex flex-col items-center justify-center">
                        <SplashLogoIcon className="w-12 h-12 text-gray-200 dark:text-md-outline-variant mb-3" />
                        <p className="text-sm text-gray-400 dark:text-md-on-surface-variant font-medium">
                            No drinks found matching your criteria.
                        </p>
                    </div>
                )}
            </main>

            {/* Reusable Floating Speed Dial FAB */}
            <SpeedDialFab
                actions={[
                    {
                        label: 'Import Drink',
                        customIcon: <SplashLogoIcon className="w-4 h-4 text-primary" />,
                        className: 'text-primary border-primary/10 hover:bg-primary/5',
                        onClick: () => setIsImportModalOpen(true),
                    },
                    {
                        label: 'New Drink',
                        icon: 'edit',
                        onClick: () =>
                            navigate('/drinks/new/edit', {
                                state: { prefill: { base_type: baseType } },
                            }),
                    },
                ]}
            />

            <BottomNav activeTab="brewing" />

            {/* Smart Import Modal */}
            <DrinkSmartImportModal
                isOpen={isImportModalOpen}
                defaultBaseType={baseType}
                onClose={() => setIsImportModalOpen(false)}
                onImportToEdit={(imported) => {
                    navigate('/drinks/new/edit', { state: { prefill: imported } });
                }}
                onSaveDirect={async (imported) => {
                    await drinkService.saveDrink(imported as Drink);
                    fetchDrinks();
                }}
            />

            {/* Modal Delete Confirmation matching RecipeListPage */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Drink?"
                message={`Are you sure you want to delete "${drinkToDelete?.name}"? This will hide the drink from your list, but your existing journal history will be kept.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="error"
            />
        </div>
    );
};
