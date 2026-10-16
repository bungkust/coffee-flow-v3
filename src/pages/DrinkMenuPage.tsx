import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { SearchBar } from '../components/SearchBar';
import { MethodImage } from '../components/MethodImage';
import { SpeedDialFab } from '../components/SpeedDialFab';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import { DrinkSmartImportModal } from '../components/DrinkSmartImportModal';

interface DrinkCategoryCard {
    id: 'coffee' | 'non_coffee';
    name: string;
    description: string;
    image: string;
    icon: string;
}

const DRINK_CATEGORIES: DrinkCategoryCard[] = [
    {
        id: 'coffee',
        name: 'Coffee Base Drinks',
        description: 'Espresso, Latte, Cappuccino, Americano, Dirty & Cold Brew specialties',
        image: '/assets/drinks/espresso.png',
        icon: 'local_cafe',
    },
    {
        id: 'non_coffee',
        name: 'Non-Coffee Drinks',
        description: 'Matcha, Chocolate, Artisanal Tea, and creamy Milk specialties',
        image: '/assets/drinks/non_coffee.png',
        icon: 'eco',
    },
];

export const DrinkMenuPage = () => {
    const navigate = useNavigate();
    const [allDrinks, setAllDrinks] = useState<Drink[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const fetchDrinks = async () => {
        try {
            setLoading(true);
            const drinks = await drinkService.getAllDrinks();
            setAllDrinks(drinks);
        } catch (error) {
            console.error('Failed to load drinks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrinks();
    }, []);

    const nonCoffeeCount = allDrinks.filter((d) => d.base_type === 'non_coffee').length;
    const coffeeCount = allDrinks.length - nonCoffeeCount;

    const getCount = (id: 'coffee' | 'non_coffee') =>
        id === 'coffee' ? coffeeCount : nonCoffeeCount;

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return DRINK_CATEGORIES;
        const q = searchQuery.toLowerCase();
        return DRINK_CATEGORIES.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-32">
            {/* Header matching BrewMethodsPage */}
            <PageHeader
                title="Beverages"
                subtitle="Select a category to browse recipes"
                className="space-y-3"
            >
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search beverage categories..."
                    clearable
                />
            </PageHeader>

            <main className="flex-1 px-5 pt-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="typescale-title-medium font-bold text-md-on-surface">Categories</h2>
                        <p className="typescale-body-small text-md-on-surface-variant">Tap a category to explore and brew recipes</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="size-9 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredCategories.map((category) => (
                            <div
                                key={category.id}
                                onClick={() => navigate(`/drinks/list?base=${category.id}`)}
                                className="group flex items-center gap-4 p-4 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/30 hover:bg-md-surface-container-high hover:border-md-primary/40 transition-all active:scale-[0.98] cursor-pointer shadow-md-1"
                            >
                                {/* Circular Left Image / Avatar Container */}
                                <div className="size-14 rounded-full bg-md-surface-container-highest flex items-center justify-center overflow-hidden border border-md-outline-variant/20 p-1 shrink-0">
                                    <MethodImage src={category.image} alt={category.name} icon={category.icon} size="md" />
                                </div>

                                {/* Middle Text Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="typescale-title-medium font-bold text-md-on-surface line-clamp-1">
                                            {category.name}
                                        </h3>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-md-secondary-container text-md-on-secondary-container shrink-0">
                                            {getCount(category.id)} recipes
                                        </span>
                                    </div>
                                    <p className="typescale-body-small text-md-on-surface-variant line-clamp-2 leading-tight">
                                        {category.description}
                                    </p>
                                </div>

                                {/* Right Chevron */}
                                <Icon
                                    name="chevron_right"
                                    className="text-md-on-surface-variant/40 text-xl group-hover:translate-x-0.5 transition-transform shrink-0"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Reusable Floating Speed Dial FAB */}
            <SpeedDialFab
                actions={[
                    {
                        label: 'Smart Import',
                        icon: 'auto_awesome',
                        className: 'text-primary border-primary/10 hover:bg-primary/5',
                        onClick: () => setIsImportModalOpen(true),
                    },
                    {
                        label: 'New Drink',
                        icon: 'edit',
                        onClick: () => navigate('/drinks/new/edit'),
                    },
                ]}
            />

            {/* Smart Import Modal */}
            <DrinkSmartImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportToEdit={(imported) => {
                    navigate('/drinks/new/edit', { state: { prefill: imported } });
                }}
                onSaveDirect={async (imported) => {
                    await drinkService.saveDrink(imported as Drink);
                    fetchDrinks();
                }}
            />

            {/* Bottom Navigation */}
            <BottomNav activeTab="brewing" />
        </div>
    );
};
