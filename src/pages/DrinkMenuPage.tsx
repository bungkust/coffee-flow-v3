import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon, SplashLogoIcon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { drinkService, settingsService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import { SmartImportModal } from '../components/SmartImportModal';
import type { ImportableRecipe } from '../components/SmartImportModal';

const DRINK_IMAGES: Record<string, string> = {
    espresso: '/assets/drinks/espresso.png',
    cappuccino: '/assets/drinks/cappuccino.png',
    latte: '/assets/drinks/latte.png',
    flat_white: '/assets/drinks/flat_white.png',
    mocha: '/assets/drinks/mocha.png',
    cold_brew: '/assets/drinks/cold_brew.png',
    americano: '/assets/drinks/americano.png',
    macchiato: '/assets/drinks/espresso.png'
};

const getDrinkImage = (drink: { id: string; image_url?: string }) => drink.image_url || DRINK_IMAGES[drink.id] || '/assets/drinks/espresso.png';
const parseList = (json: string): string[] => {
    try {
        return JSON.parse(json);
    } catch {
        return [];
    }
};

export const DrinkMenuPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [allDrinks, setAllDrinks] = useState<Drink[]>([]);
    const [availableDrinks, setAvailableDrinks] = useState<Drink[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [restoredQueue, setRestoredQueue] = useState<ImportableRecipe[]>([]);

    useEffect(() => {
        const fetchDrinks = async () => {
            try {
                setLoading(true);
                const preferredDrinks = await settingsService.getUserPreferredDrinks();
                const drinks = await drinkService.getAllDrinks();
                setAllDrinks(drinks);

                if (preferredDrinks && preferredDrinks.length > 0) {
                    const drinkIds = new Set(preferredDrinks);
                    const filtered = drinks.filter(drink => drinkIds.has(drink.id));
                    setAvailableDrinks(filtered.length > 0 ? filtered : drinks);
                } else {
                    setAvailableDrinks(drinks);
                }
            } catch (error) {
                console.error("Failed to load preferred drinks:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDrinks();

        // Restore pending import queue if returning from DrinkEditPage
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
    }, [isEditing, location.pathname]);

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
        parseList(d.ingredients_json).join(' ').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const editableDrinks = allDrinks.filter(d =>
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
                                        <img src={getDrinkImage(item)} alt={item.name} className="w-full h-full object-cover p-1" />
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
                                    onClick={() => navigate(`/drinks/${drink.id}`)}
                                    className="group flex items-center p-3 rounded-2xl bg-white dark:bg-[#2C241B] border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-all hover:border-primary/20 shadow-sm w-full text-left"
                                >
                                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-white/5 mr-4 transition-transform group-hover:scale-105">
                                        <img src={getDrinkImage(drink)} alt={drink.name} className="w-full h-full object-cover p-1" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-lg text-neutral-text dark:text-white leading-tight">
                                                {drink.name}
                                            </h3>
                                            <span className="text-[11px] font-bold text-gray-400 group-hover:text-primary transition-colors">
                                                {drink.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                                            {parseList(drink.ingredients_json).join(', ')}
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
                            <span>Import Drink</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsFabMenuOpen(false);
                                navigate('/drinks/new/edit');
                            }}
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-gray-800 rounded-2xl shadow-xl border border-gray-100 text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                        >
                            <Icon name="edit" className="text-[18px] text-gray-500" />
                            <span>New Drink</span>
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
                    // Transform Recipe-like data to Drink format
                    const data = importedData as Record<string, unknown>;
                    
                    // Extract ingredients from steps or use ingredients_json if present
                    let ingredients: string[] = [];
                    let instructions: string[] = [];
                    
                    if (data.ingredients_json) {
                        try {
                            ingredients = JSON.parse((data.ingredients_json as string) || '[]');
                        } catch { ingredients = []; }
                    } else if (data.steps) {
                        // Extract ingredients from steps (look for quantities in instructions)
                        const steps = (data.steps as Array<Record<string, unknown>>) || [];
                        ingredients = steps
                            .flatMap((step: Record<string, unknown>) => {
                                const instruction = (step.instruction as string) || '';
                                // Extract quantities like "18g coffee", "120ml milk", "1 shot espresso"
                                const matches = instruction.match(/(\d+(?:\.\d+)?)\s*(g|ml|shot|shots?)\s*(coffee|espresso|milk|water|syrup|cream|foam)/gi);
                                return matches || [];
                            })
                            .filter((v, i, a) => a.indexOf(v) === i); // deduplicate
                    }
                    
                    if (data.instructions_json) {
                        try {
                            instructions = JSON.parse((data.instructions_json as string) || '[]');
                        } catch { instructions = []; }
                    } else if (data.steps) {
                        // Extract instructions from steps
                        const steps = (data.steps as Array<Record<string, unknown>>) || [];
                        instructions = steps
                            .map((step: Record<string, unknown>) => (step.instruction as string) || (step.label as string))
                            .filter(Boolean);
                    }
                    
                    // Determine category from method_id or name
                    const methodId = (data.method_id as string) || '';
                    const name = (data.name as string) || '';
                    const isCold = methodId === 'cold_brew' || name.toLowerCase().includes('cold') || name.toLowerCase().includes('iced') || name.toLowerCase().includes('frapp');
                    
                    const prefillDrink = {
                        name: (data.name as string) || 'Imported Drink',
                        category: isCold ? 'cold' : 'hot',
                        ingredients_json: JSON.stringify(ingredients.length > 0 ? ingredients : ['1 shot espresso', '120ml milk']),
                        instructions_json: JSON.stringify(instructions.length > 0 ? instructions : ['Prepare ingredients', 'Mix and serve']),
                        version: 1,
                    };
                    
                    setIsImportModalOpen(false);
                    navigate(`/drinks/new`, {
                        state: { prefill: prefillDrink }
                    });
                }}
                onSaveDirect={async (importedData) => {
                    const id = crypto.randomUUID();
                    const now = new Date().toISOString();
                    try {
                        const data = importedData as Record<string, unknown>;
                        const parsedIngredients = JSON.parse((data.ingredients_json as string) || '[]');
                        const parsedInstructions = JSON.parse((data.instructions_json as string) || '[]');
                        await drinkService.saveDrink({
                            id,
                            name: (data.name as string) || 'Imported Drink',
                            category: (data.category as string) === 'cold' ? 'cold' : 'hot',
                            ingredients_json: JSON.stringify(parsedIngredients),
                            instructions_json: JSON.stringify(parsedInstructions),
                            version: 1,
                            created_at: now,
                            updated_at: now,
                        });
                    } catch {
                        await drinkService.saveDrink({
                            id,
                            name: (importedData as Record<string, unknown>).name as string || 'Imported Drink',
                            category: 'hot',
                            ingredients_json: '[]',
                            instructions_json: '[]',
                            version: 1,
                            created_at: now,
                            updated_at: now,
                        });
                    }
                }}
            />
        </div>
    );
};
