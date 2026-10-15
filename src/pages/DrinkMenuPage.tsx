import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { PageHeader } from '../components/PageHeader';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import { DrinkSmartImportModal } from '../components/DrinkSmartImportModal';

export const DrinkMenuPage = () => {
    const navigate = useNavigate();
    const [allDrinks, setAllDrinks] = useState<Drink[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
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

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-32">
            {/* Header */}
            <PageHeader
                title="Beverages"
                subtitle="Select base category to browse & craft drinks"
            />

            <main className="flex-1 px-5 pt-4 space-y-4">
                {/* Coffee Base Card */}
                <div
                    onClick={() => navigate('/drinks/list?base=coffee')}
                    className="group relative overflow-hidden bg-gradient-to-br from-amber-900/10 via-amber-800/5 to-transparent hover:from-amber-900/20 hover:via-amber-800/10 border border-amber-900/20 dark:border-amber-700/30 rounded-3xl p-6 transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99]"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-800 text-amber-100 flex items-center justify-center shadow-md shrink-0">
                            <Icon name="local_cafe" className="text-3xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                            {loading ? '...' : `${coffeeCount} recipes`}
                        </span>
                    </div>

                    <div className="mt-5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-md-on-surface tracking-tight">
                                ☕ Coffee Base
                            </h2>
                            <Icon
                                name="arrow_forward"
                                className="text-lg text-md-on-surface-variant group-hover:translate-x-1 transition-transform"
                            />
                        </div>
                        <p className="text-xs text-md-on-surface-variant mt-1.5 leading-relaxed">
                            All beverages built on espresso, cold brew, or filtered coffee bases like Latte,
                            Cappuccino, Americano, and Dirty.
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-900/10 dark:border-amber-700/20 flex items-center gap-2 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        <span>Espresso</span>
                        <span>•</span>
                        <span>Cold Brew</span>
                        <span>•</span>
                        <span>Americano</span>
                        <span>•</span>
                        <span>Mocha</span>
                    </div>
                </div>

                {/* Non-Coffee Card */}
                <div
                    onClick={() => navigate('/drinks/list?base=non_coffee')}
                    className="group relative overflow-hidden bg-gradient-to-br from-emerald-900/10 via-emerald-800/5 to-transparent hover:from-emerald-900/20 hover:via-emerald-800/10 border border-emerald-900/20 dark:border-emerald-700/30 rounded-3xl p-6 transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99]"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-emerald-100 flex items-center justify-center shadow-md shrink-0">
                            <Icon name="eco" className="text-3xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                            {loading ? '...' : `${nonCoffeeCount} recipes`}
                        </span>
                    </div>

                    <div className="mt-5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-md-on-surface tracking-tight">
                                🍵 Non-Coffee
                            </h2>
                            <Icon
                                name="arrow_forward"
                                className="text-lg text-md-on-surface-variant group-hover:translate-x-1 transition-transform"
                            />
                        </div>
                        <p className="text-xs text-md-on-surface-variant mt-1.5 leading-relaxed">
                            Matcha, chocolate, artisanal teas, and milk specialties without a coffee base.
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-900/10 dark:border-emerald-700/20 flex items-center gap-2 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                        <span>Matcha</span>
                        <span>•</span>
                        <span>Chocolate</span>
                        <span>•</span>
                        <span>Chai & Tea</span>
                        <span>•</span>
                        <span>Milk</span>
                    </div>
                </div>
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
                                navigate('/drinks/new');
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
                onImportToEdit={(imported) => {
                    navigate('/drinks/new', { state: { prefill: imported } });
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
