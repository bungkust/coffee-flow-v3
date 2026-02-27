import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { settingsService } from '../core/services';

const DRINKS = [
    {
        id: 'espresso',
        name: 'Espresso',
        image: '/assets/drinks/espresso.png',
        ingredients: 'Ground Coffee, Water',
        time: '2m'
    },
    {
        id: 'cappuccino',
        name: 'Cappuccino',
        image: '/assets/drinks/cappuccino.png',
        ingredients: 'Espresso, Steamed Milk, Foam',
        time: '5m'
    },
    {
        id: 'latte',
        name: 'Latte',
        image: '/assets/drinks/latte.png',
        ingredients: 'Espresso, Steamed Milk',
        time: '4m'
    },
    {
        id: 'flat_white',
        name: 'Flat White',
        image: '/assets/drinks/flat_white.png',
        ingredients: 'Double Espresso, Microfoam',
        time: '4m'
    },
    {
        id: 'mocha',
        name: 'Mocha',
        image: '/assets/drinks/mocha.png',
        ingredients: 'Espresso, Chocolate, Milk',
        time: '6m'
    },
    {
        id: 'cold_brew',
        name: 'Cold Brew',
        image: '/assets/drinks/cold_brew.png',
        ingredients: 'Coarse Ground Coffee, Cold Water',
        time: '12h'
    },
    {
        id: 'americano',
        name: 'Americano',
        image: '/assets/drinks/americano.png',
        ingredients: 'Espresso, Hot Water',
        time: '3m'
    },
    {
        id: 'macchiato',
        name: 'Macchiato',
        image: '/assets/drinks/espresso.png', // Reusing espresso for now due to quota
        ingredients: 'Espresso, Foam',
        time: '3m'
    },
];

export const DrinkMenuPage = () => {
    const navigate = useNavigate();
    const [availableDrinks, setAvailableDrinks] = useState<typeof DRINKS>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchDrinks = async () => {
            try {
                const preferredDrinks = await settingsService.getUserPreferredDrinks();

                if (preferredDrinks && preferredDrinks.length > 0) {
                    const drinkIds = new Set(preferredDrinks);
                    const filtered = DRINKS.filter(drink => drinkIds.has(drink.id));
                    setAvailableDrinks(filtered.length > 0 ? filtered : DRINKS.slice(0, 4));
                } else {
                    // Fallback to first 4 drinks if none are saved
                    setAvailableDrinks(DRINKS.slice(0, 4));
                }
            } catch (error) {
                console.error("Failed to load preferred drinks:", error);
                setAvailableDrinks(DRINKS.slice(0, 4));
            } finally {
                setLoading(false);
            }
        };

        fetchDrinks();
    }, [isEditing]);

    const handleEditToggle = () => {
        if (!isEditing) {
            setSelectedDrinks(availableDrinks.map(d => d.id));
        }
        setIsEditing(!isEditing);
    };

    const toggleDrink = (id: string) => {
        if (selectedDrinks.includes(id)) {
            setSelectedDrinks(selectedDrinks.filter(i => i !== id));
        } else {
            setSelectedDrinks([...selectedDrinks, id]);
        }
    };

    const handleSaveDrinks = async () => {
        try {
            await settingsService.setUserPreferredDrinks(selectedDrinks);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save drinks", error);
        }
    };

    const filteredDisplayDrinks = availableDrinks.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.ingredients.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const editableDrinks = DRINKS.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl pb-32 transition-colors duration-300">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100 dark:border-white/5 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-3">
                        {isEditing && (
                            <button onClick={handleEditToggle} className="flex items-center text-neutral-text dark:text-white/60 hover:text-coffee-brown transition-colors">
                                <Icon name="arrow_back" className="text-2xl" />
                            </button>
                        )}
                        <h1 className="text-neutral-text dark:text-white tracking-tight text-xl font-bold leading-tight">
                            {isEditing ? 'Edit Drinks Menu' : 'Drinks Menu'}
                        </h1>
                    </div>
                </div>

                <div className="relative px-2 pb-2">
                    <span className="absolute inset-y-0 left-5 flex items-center text-gray-400">
                        <Icon name="search" className="text-[20px]" />
                    </span>
                    <input
                        className="w-full bg-white dark:bg-white/5 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 pl-10 pr-4 border-none shadow-sm focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all"
                        placeholder="Search espresso, latte..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            {isEditing ? (
                <div className="flex-1 flex flex-col pt-6 px-5 pb-24 relative">
                    <div className="mb-6 text-center space-y-1">
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                            Pick the drinks you want to see on your menu screen.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-20">
                        {editableDrinks.map((item) => {
                            const isSelected = selectedDrinks.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleDrink(item.id)}
                                    className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all active:scale-[0.98] border ${isSelected
                                        ? 'bg-primary/5 border-primary/50 shadow-sm'
                                        : 'bg-white dark:bg-[#2C241B] border-gray-100 dark:border-white/5 shadow-sm hover:border-primary/30'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 text-primary">
                                            <Icon name="check_circle" className="text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        </div>
                                    )}
                                    <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden mb-3 border border-gray-50 dark:border-white/5">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover p-1" />
                                    </div>
                                    <span className={`font-bold text-sm text-center ${isSelected
                                        ? 'text-primary'
                                        : 'text-neutral-text dark:text-gray-300'
                                        }`}>
                                        {item.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="fixed bottom-0 w-full bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-black/5 dark:border-white/5 p-6 z-30 max-w-md mx-auto left-0 right-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-none">
                        <button
                            onClick={handleSaveDrinks}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            <span>Save Menu</span>
                            <Icon name="check" className="text-xl" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 px-5 pt-6">
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Menu</p>
                        <button onClick={handleEditToggle} className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 cursor-pointer">
                            <Icon name="edit" className="text-[14px]" />
                            Edit
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredDisplayDrinks.map((drink) => (
                                <button
                                    key={drink.id}
                                    onClick={() => navigate(`/recipes?drink=${drink.id}`)}
                                    className="group flex items-center p-3 rounded-2xl bg-white dark:bg-[#2C241B] border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-all hover:border-primary/20 shadow-sm w-full text-left"
                                >
                                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-white/5 mr-4 transition-transform group-hover:scale-105">
                                        <img src={drink.image} alt={drink.name} className="w-full h-full object-cover p-1" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-lg text-neutral-text dark:text-white leading-tight">
                                                {drink.name}
                                            </h3>
                                            <span className="text-[11px] font-bold text-gray-400 group-hover:text-primary transition-colors">
                                                {drink.time}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                                            {drink.ingredients}
                                        </p>
                                    </div>
                                    <div className="ml-2 text-gray-300 dark:text-gray-600 transition-transform group-hover:translate-x-1">
                                        <Icon name="chevron_right" className="text-xl" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredDisplayDrinks.length === 0 && !loading && (
                        <div className="text-center py-12 px-4">
                            <Icon name="search_off" className="text-4xl text-gray-300 mb-3 mx-auto" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No drinks found matching your search.</p>
                        </div>
                    )}
                </div>
            )}

            {!isEditing && <BottomNav activeTab="drinks" />}
        </div>
    );
};
