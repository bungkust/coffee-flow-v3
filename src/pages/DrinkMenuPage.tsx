import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon, SplashLogoIcon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/Button';
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

const DrinkImage = ({ src, alt }: { src: string; alt: string }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !src) {
        return (
            <div className="flex items-center justify-center w-full h-full text-md-primary">
                <Icon name="local_cafe" className="text-3xl" style={{ fontVariationSettings: "'FILL' 1" }} />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover rounded-full"
            onError={() => setFailed(true)}
        />
    );
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
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-24">
            {/* Sticky Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => (isEditing ? setIsEditing(false) : navigate(-1))}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                            aria-label="Go back"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <div>
                            <h1 className="typescale-headline-small font-bold text-md-on-surface">
                                {isEditing ? 'Select Drinks' : 'Drinks Menu'}
                            </h1>
                            <p className="typescale-body-small text-md-on-surface-variant">
                                {isEditing ? 'Choose drinks for your active menu' : 'Select a drink to view recipe'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-md-on-surface-variant text-xl" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search espresso, latte..."
                        className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 typescale-body-medium rounded-full pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-md-primary/40 border border-md-outline-variant/30 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant hover:text-md-on-surface cursor-pointer"
                        >
                            <Icon name="close" className="text-lg" />
                        </button>
                    )}
                </div>
            </header>

            {/* Content */}
            {isEditing ? (
                /* EDIT MODE: Pick active drinks */
                <main className="flex-1 px-5 pt-4">
                    <div className="mb-4 text-center bg-md-secondary-container/50 p-3 rounded-xl border border-md-outline-variant/20">
                        <p className="typescale-body-medium text-md-on-secondary-container font-medium">
                            Select drinks to feature on your menu screen. ({selectedDrinks.length} selected)
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-20">
                        {editableDrinks.map((item) => {
                            const isSelected = selectedDrinks.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleDrink(item.id)}
                                    className={`group relative flex flex-col items-center justify-center p-3.5 rounded-xl transition-all active:scale-[0.98] border cursor-pointer ${
                                        isSelected
                                            ? 'bg-md-secondary-container border-md-primary text-md-on-secondary-container shadow-md-1'
                                            : 'bg-md-surface-container-low border-md-outline-variant/30 text-md-on-surface hover:bg-md-surface-container-high'
                                    }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 text-md-primary">
                                            <Icon name="check_circle" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        </div>
                                    )}
                                    <div className={`size-14 mb-2 rounded-full flex items-center justify-center transition-colors overflow-hidden border border-md-outline-variant/20 p-1 ${
                                        isSelected ? 'bg-md-primary-container' : 'bg-md-surface-container-highest'
                                    }`}>
                                        <DrinkImage src={getDrinkImage(item)} alt={item.name} />
                                    </div>
                                    <span className={`typescale-title-small text-center line-clamp-1 ${
                                        isSelected ? 'text-md-on-secondary-container font-bold' : 'text-md-on-surface font-semibold'
                                    }`}>
                                        {item.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="fixed bottom-0 w-full bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 p-5 z-30 max-w-md mx-auto left-0 right-0">
                        <Button
                            variant="filled"
                            size="lg"
                            onClick={handleSaveDrinks}
                            disabled={selectedDrinks.length < 1}
                            className="w-full"
                        >
                            <span>Save Menu Selection ({selectedDrinks.length})</span>
                            <Icon name="check" className="text-xl" />
                        </Button>
                    </div>
                </main>
            ) : (
                /* NORMAL MODE: Clean Row List matching equipment page UI */
                <main className="flex-1 px-5 pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="typescale-title-medium font-bold text-md-on-surface">Active Menu</h2>
                            <p className="typescale-body-small text-md-on-surface-variant">Tap any drink to view recipe & preparation</p>
                        </div>
                        <button
                            onClick={handleEditToggle}
                            className="typescale-label-large bg-md-secondary-container text-md-on-secondary-container px-3.5 py-1.5 rounded-full hover:bg-md-secondary-container/80 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <Icon name="edit" className="text-base" />
                            Edit Menu
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="size-9 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredDisplayDrinks.map((drink) => {
                                const ingredientsList = parseList(drink.ingredients_json).join(', ');
                                return (
                                    <div
                                        key={drink.id}
                                        onClick={() => navigate(`/drinks/${drink.id}`)}
                                        className="group flex items-center gap-4 p-4 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/30 hover:bg-md-surface-container-high hover:border-md-primary/40 transition-all active:scale-[0.98] cursor-pointer shadow-md-1"
                                    >
                                        {/* Circular Left Image / Avatar Container */}
                                        <div className="size-14 rounded-full bg-md-surface-container-highest flex items-center justify-center overflow-hidden border border-md-outline-variant/20 p-1 shrink-0">
                                            <DrinkImage src={getDrinkImage(drink)} alt={drink.name} />
                                        </div>

                                        {/* Middle Text Details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="typescale-title-medium font-bold text-md-on-surface line-clamp-1 mb-0.5">
                                                {drink.name}
                                            </h3>
                                            <p className="typescale-body-small text-md-on-surface-variant line-clamp-2 leading-tight">
                                                {ingredientsList || 'Espresso drink recipe'}
                                            </p>
                                        </div>

                                        {/* Right Chevron */}
                                        <Icon name="chevron_right" className="text-md-on-surface-variant/40 text-xl group-hover:translate-x-0.5 transition-transform shrink-0" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredDisplayDrinks.length === 0 && !loading && (
                        <div className="text-center py-12 px-4 bg-md-surface-container-low rounded-xl border border-dashed border-md-outline-variant">
                            <Icon name="local_cafe" className="text-4xl text-md-outline/50 mb-2 mx-auto" />
                            <p className="typescale-body-medium text-md-on-surface-variant">
                                {searchQuery ? 'No drinks match your search.' : 'No drinks found.'}
                            </p>
                        </div>
                    )}
                </main>
            )}

            {/* Floating Speed Dial FAB */}
            <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3 max-w-md mx-auto">
                {isFabMenuOpen && (
                    <div className="flex flex-col items-end gap-2.5 mb-1 animate-in slide-in-from-bottom-4 fade-in duration-200">
                        <button
                            onClick={() => {
                                setIsFabMenuOpen(false);
                                setIsImportModalOpen(true);
                            }}
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-md-surface-container-high text-md-on-surface rounded-2xl shadow-md-2 border border-md-outline-variant/30 typescale-label-medium font-bold hover:bg-md-surface-container-highest active:scale-95 transition-all cursor-pointer"
                        >
                            <SplashLogoIcon className="w-4 h-4 text-md-primary" />
                            <span>Import Drink</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsFabMenuOpen(false);
                                navigate('/drinks/new/edit');
                            }}
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-md-surface-container-high text-md-on-surface rounded-2xl shadow-md-2 border border-md-outline-variant/30 typescale-label-medium font-bold hover:bg-md-surface-container-highest active:scale-95 transition-all cursor-pointer"
                        >
                            <Icon name="edit" className="text-lg text-md-on-surface-variant" />
                            <span>New Drink</span>
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                    className={`size-14 rounded-full text-md-on-primary shadow-md-3 flex items-center justify-center transition-all duration-300 active:scale-90 border-2 border-md-surface cursor-pointer ${
                        isFabMenuOpen ? 'bg-md-on-surface-variant rotate-45' : 'bg-md-primary hover:bg-md-primary/90'
                    }`}
                >
                    <Icon name="add" className="text-3xl" />
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
                    const data = importedData as Record<string, unknown>;
                    let ingredients: string[] = [];
                    let instructions: string[] = [];
                    
                    if (data.ingredients_json) {
                        try {
                            ingredients = JSON.parse((data.ingredients_json as string) || '[]');
                        } catch { ingredients = []; }
                    } else if (data.steps) {
                        const steps = (data.steps as Array<Record<string, unknown>>) || [];
                        ingredients = steps
                            .flatMap((step: Record<string, unknown>) => {
                                const instruction = (step.instruction as string) || '';
                                const matches = instruction.match(/(\d+(?:\.\d+)?)\s*(g|ml|shot|shots?)\s*(coffee|espresso|milk|water|syrup|cream|foam)/gi);
                                return matches || [];
                            })
                            .filter((v, i, a) => a.indexOf(v) === i);
                    }
                    
                    if (data.instructions_json) {
                        try {
                            instructions = JSON.parse((data.instructions_json as string) || '[]');
                        } catch { instructions = []; }
                    } else if (data.steps) {
                        const steps = (data.steps as Array<Record<string, unknown>>) || [];
                        instructions = steps
                            .map((step: Record<string, unknown>) => (step.instruction as string) || (step.label as string))
                            .filter(Boolean);
                    }
                    
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
