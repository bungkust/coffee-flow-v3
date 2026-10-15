import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { SearchBar } from '../components/SearchBar';
import { drinkService } from '../core/services';
import type { Drink, DrinkBaseType } from '../shared/domain/entities';
import { parseList } from '../shared/utils/drinks';
import { DrinkSmartImportModal } from '../components/DrinkSmartImportModal';

export const DrinkListPage = () => {
    const navigate = useNavigate();
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
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

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
            setActiveMenuId(null);
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
        setActiveMenuId(null);
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

    const parseIngredientPreview = (ingredientsJson: string): string =>
        parseList(ingredientsJson)
            .slice(0, 3)
            .map((i: unknown) =>
                typeof i === 'object' && i !== null && 'name' in i
                    ? `${(i as { amount?: number; unit?: string; name: string }).amount ? `${(i as { amount?: number; unit?: string; name: string }).amount} ` : ''}${(i as { amount?: number; unit?: string; name: string }).unit ? `${(i as { amount?: number; unit?: string; name: string }).unit} ` : ''}${(i as { amount?: number; unit?: string; name: string }).name}`.trim()
                    : String(i)
            )
            .join(' • ');

    const chips = ['All', 'Favorites', 'Hot', 'Cold'];

    const title = baseType === 'non_coffee' ? '🍵 Non-Coffee Drinks' : '☕ Coffee Base Drinks';
    const subtitle =
        baseType === 'non_coffee'
            ? 'Matcha, Chocolate, Tea & Milk'
            : 'Espresso & Cold Brew Drinks';

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-32">
            {/* Header */}
            <PageHeader title={title} subtitle={subtitle} onBack={() => navigate('/drinks')} />

            {/* Sticky Search and Filter Controls */}
            <div className="sticky top-14 z-20 bg-md-surface/95 backdrop-blur-md pt-2 pb-3 px-5 border-b border-md-outline-variant/30 space-y-3">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={`Search ${baseType === 'non_coffee' ? 'non-coffee' : 'coffee'} recipes...`}
                />

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                    {chips.map((chip) => {
                        const active = activeChip === chip;
                        return (
                            <button
                                key={chip}
                                onClick={() => setActiveChip(chip)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    active
                                        ? 'bg-md-primary text-md-on-primary shadow-sm'
                                        : 'bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface'
                                }`}
                            >
                                {chip}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Drink Cards List */}
            <main className="flex-1 px-5 pt-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="size-8 border-3 border-md-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredDrinks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-md-surface-container-high flex items-center justify-center text-md-on-surface-variant mb-4">
                            <Icon
                                name={baseType === 'non_coffee' ? 'eco' : 'local_cafe'}
                                className="text-3xl"
                            />
                        </div>
                        <h3 className="text-base font-bold text-md-on-surface mb-1">No drinks found</h3>
                        <p className="text-xs text-md-on-surface-variant max-w-xs mb-6">
                            {searchQuery
                                ? 'No drinks match your current search or filters.'
                                : `Start creating your ${baseType === 'non_coffee' ? 'non-coffee' : 'coffee'} beverage menu.`}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                            <button
                                onClick={() => navigate('/drinks/new', { state: { prefill: { base_type: baseType } } })}
                                className="w-full py-2.5 px-4 rounded-xl bg-md-primary text-white text-xs font-bold flex items-center justify-center gap-2"
                            >
                                <Icon name="add" className="text-base" />
                                <span>Create New Drink</span>
                            </button>
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="w-full py-2.5 px-4 rounded-xl border border-md-outline text-md-primary text-xs font-bold flex items-center justify-center gap-2"
                            >
                                <Icon name="auto_awesome" className="text-base" />
                                <span>Smart Import</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    filteredDrinks.map((drink) => {
                        const isMenuOpen = activeMenuId === drink.id;
                        const isHot = drink.category.toLowerCase() === 'hot';
                        const ingredientSummary = parseIngredientPreview(drink.ingredients_json);

                        return (
                            <div
                                key={drink.id}
                                onClick={() => handleSelectDrink(drink)}
                                className="group relative bg-md-surface-container-low hover:bg-md-surface-container border border-md-outline-variant/30 rounded-2xl p-4 transition-all shadow-md-1 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                                    isHot
                                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200'
                                                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200'
                                                }`}
                                            >
                                                <Icon
                                                    name={isHot ? 'local_fire_department' : 'ac_unit'}
                                                    className="text-[12px]"
                                                />
                                                {drink.category}
                                            </span>
                                        </div>

                                        <h3 className="text-sm font-bold text-md-on-surface truncate">
                                            {drink.name}
                                        </h3>

                                        {ingredientSummary && (
                                            <p className="text-[11px] text-md-on-surface-variant truncate mt-1">
                                                {ingredientSummary}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons: Favorite + Kebab */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={(e) => handleToggleFavorite(e, drink.id)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-md-on-surface-variant hover:text-amber-500 hover:bg-md-surface-container-high transition-colors cursor-pointer"
                                            title={drink.is_favorite ? 'Remove favorite' : 'Add favorite'}
                                        >
                                            <Icon
                                                name="bookmark"
                                                className={`text-[18px] ${
                                                    drink.is_favorite ? 'text-amber-500' : 'text-md-on-surface-variant/40'
                                                }`}
                                                style={
                                                    drink.is_favorite
                                                        ? { fontVariationSettings: "'FILL' 1" }
                                                        : undefined
                                                }
                                            />
                                        </button>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => handleKebabClick(e, drink.id)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-high transition-colors cursor-pointer"
                                                title="Options"
                                            >
                                                <Icon name="more_vert" className="text-[18px]" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {isMenuOpen && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute right-0 top-9 z-30 w-44 rounded-2xl bg-md-surface border border-md-outline-variant/40 shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150"
                                                >
                                                    <button
                                                        onClick={(e) => handleClone(e, drink.id)}
                                                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-md-on-surface hover:bg-md-surface-container-high flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <Icon name="content_copy" className="text-[16px] text-md-on-surface-variant" />
                                                        <span>Duplicate</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/drinks/${drink.id}/edit`);
                                                        }}
                                                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-md-on-surface hover:bg-md-surface-container-high flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <Icon name="edit" className="text-[16px] text-md-on-surface-variant" />
                                                        <span>Edit Recipe</span>
                                                    </button>
                                                    <div className="h-px bg-md-outline-variant/30 my-1" />
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, drink)}
                                                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <Icon name="delete" className="text-[16px] text-red-500" />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Floating Action Button (FAB) Speed Dial */}
            <div className="fixed bottom-24 right-5 z-30 flex flex-col items-end gap-2.5">
                {isFabMenuOpen && (
                    <>
                        <button
                            onClick={() => {
                                setIsFabMenuOpen(false);
                                setIsImportModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-md-surface border border-md-outline-variant/40 shadow-lg text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-md-surface-container-high transition-all animate-in slide-in-from-bottom-2 duration-150"
                        >
                            <Icon name="auto_awesome" className="text-[16px]" />
                            <span>Smart Import</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsFabMenuOpen(false);
                                navigate('/drinks/new', {
                                    state: { prefill: { base_type: baseType } }
                                });
                            }}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-md-surface border border-md-outline-variant/40 shadow-lg text-xs font-bold text-md-primary hover:bg-md-surface-container-high transition-all animate-in slide-in-from-bottom-2 duration-150"
                        >
                            <Icon name="add" className="text-[16px]" />
                            <span>New Drink</span>
                        </button>
                    </>
                )}

                <button
                    onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                    className="w-14 h-14 rounded-full bg-md-primary hover:bg-md-primary/90 text-md-on-primary shadow-xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                    aria-label="Actions"
                >
                    <Icon
                        name={isFabMenuOpen ? 'close' : 'add'}
                        className={`text-2xl transition-transform ${isFabMenuOpen ? 'rotate-90' : ''}`}
                    />
                </button>
            </div>

            {/* Smart Import Modal */}
            <DrinkSmartImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                defaultBaseType={baseType}
                onImportToEdit={(imported) => {
                    navigate('/drinks/new', { state: { prefill: imported } });
                }}
                onSaveDirect={async (imported) => {
                    await drinkService.saveDrink(imported as Drink);
                    fetchDrinks();
                }}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Drink Recipe"
                message={
                    <p className="text-xs text-md-on-surface-variant leading-relaxed">
                        Are you sure you want to delete{' '}
                        <span className="font-bold text-md-on-surface">{drinkToDelete?.name}</span>? This will remove the
                        drink from your list, but past journal logs referencing it will be preserved.
                    </p>
                }
                onConfirm={confirmDelete}
                confirmText="Delete"
                type="warning"
            />

            {/* Bottom Navigation */}
            <BottomNav activeTab="brewing" />
        </div>
    );
};
