import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { pantryService } from '../core/services';
import { seedInitialData } from '../core/database/seeding';
import type { PantryItem } from '../features/pantry/domain/entities';

type Tab = 'supplies' | 'gear';

export const PantryPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('supplies');
    const [items, setItems] = useState<PantryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // await seedInitialData(); // Removed auto-seeding per user request
            const data = await pantryService.getPantryItems();
            setItems(data);
        } catch (error) {
            console.error('Failed to load pantry items:', error);
        } finally {
            setLoading(false);
        }
    };

    const supplies = items.filter(i => ['beans', 'milk', 'syrup', 'filter', 'other'].includes(i.category));
    const gear = items.filter(i => ['dripper', 'grinder', 'kettle', 'scale', 'accessory'].includes(i.category));

    // Grouping helpers
    const beans = supplies.filter(i => i.category === 'beans');
    const essentials = supplies.filter(i => i.category !== 'beans');

    const drippers = gear.filter(i => i.category === 'dripper');
    const grinders = gear.filter(i => i.category === 'grinder');
    const kettles = gear.filter(i => i.category === 'kettle');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-light">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl font-display text-neutral-text pb-32">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-neutral-text tracking-tight text-xl font-bold leading-tight">
                            My Pantry
                        </h1>
                    </div>
                </div>
                <div className="relative mb-2">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <Icon name="search" className="text-[20px]" />
                    </span>
                    <input
                        className="w-full bg-white text-neutral-text placeholder-gray-400 rounded-xl py-2.5 pl-10 pr-4 border-none shadow-sm focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                        placeholder="Search inventory..."
                        type="text"
                    />
                </div>
                {/* Toggle Switch */}
                <div className="pt-2 pb-4">
                    <div className="flex h-10 w-full items-center justify-center rounded-lg bg-gray-50 p-1">
                        <label className="group relative flex flex-1 cursor-pointer items-center justify-center rounded-md py-1.5 transition-all">
                            <input
                                checked={activeTab === 'supplies'}
                                onChange={() => setActiveTab('supplies')}
                                className="peer sr-only" name="pantry-filter" type="radio" value="supplies"
                            />
                            <span className="z-10 text-sm font-semibold text-gray-500 peer-checked:text-primary transition-colors">Supplies</span>
                            <div className="absolute inset-0 z-0 scale-95 rounded-md bg-white shadow-sm opacity-0 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-200"></div>
                        </label>
                        <label className="group relative flex flex-1 cursor-pointer items-center justify-center rounded-md py-1.5 transition-all">
                            <input
                                checked={activeTab === 'gear'}
                                onChange={() => setActiveTab('gear')}
                                className="peer sr-only" name="pantry-filter" type="radio" value="gear"
                            />
                            <span className="z-10 text-sm font-semibold text-gray-500 peer-checked:text-primary transition-colors">Gear</span>
                            <div className="absolute inset-0 z-0 scale-95 rounded-md bg-white shadow-sm opacity-0 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-200"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Inventory List */}
            <main className="flex-1 px-4 pt-2 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 opacity-60">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                            <Icon name="inventory_2" className="text-5xl text-gray-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-neutral-text">Pantry is Empty</h3>
                            <p className="text-sm text-gray-500 max-w-[240px] mx-auto leading-relaxed">
                                Get started by adding beans, equipment, or essentials to your inventory.
                            </p>
                        </div>
                    </div>
                ) : (
                    activeTab === 'supplies' ? (
                        <section className="space-y-6">
                            {/* Beans Category */}
                            {beans.length > 0 && (
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2 pl-1">
                                        <Icon name="coffee" className="text-[16px]" /> Coffee Beans
                                    </h2>
                                    <div className="space-y-3">
                                        {beans.map(item => (
                                            <div key={item.id} className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-neutral-text text-base mb-0.5">{item.name}</h3>
                                                        <p className="text-xs text-gray-500 font-medium">{item.brand}</p>
                                                    </div>
                                                    {item.roast_date && (
                                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                                                            {new Date(item.roast_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Roast
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    <div className="flex justify-between items-end mb-1.5">
                                                        <span className="text-xs font-semibold text-gray-500">Remaining Stock</span>
                                                        <span className="text-xs font-bold text-primary">{item.remaining_stock}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="bg-primary h-full rounded-full" style={{ width: `${item.remaining_stock}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Supplies & Dairy */}
                            {essentials.length > 0 && (
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2 pl-1">
                                        <Icon name="category" className="text-[16px]" /> Essentials
                                    </h2>
                                    <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
                                        {essentials.map(item => (
                                            <div key={item.id} className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                        <Icon name={item.icon || 'inventory_2'} className="text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-neutral-text">{item.name}</p>
                                                        {item.is_low_stock ? (
                                                            <p className="text-[10px] text-red-500 uppercase font-bold tracking-tight flex items-center gap-0.5 mt-0.5">
                                                                <Icon name="warning" className="text-[12px] filled" /> Low Stock
                                                            </p>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight mt-0.5">{item.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-xs font-bold ${item.is_low_stock ? 'text-red-500' : 'text-gray-600'}`}>{item.remaining_stock}%</span>
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`${item.is_low_stock ? 'bg-red-500' : 'bg-primary'} h-full rounded-full`} style={{ width: `${item.remaining_stock}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    ) : (
                        <section className="space-y-6">
                            {/* Drippers Category */}
                            {drippers.length > 0 && (
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2 pl-1">
                                        <Icon name="coffee_maker" className="text-[16px]" /> Drippers
                                    </h2>
                                    <div className="space-y-3">
                                        {drippers.map(item => (
                                            <div key={item.id} className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 transition-all flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-neutral-text text-base mb-0.5">{item.name}</h3>
                                                    <p className="text-xs text-gray-500 font-medium">{item.description}</p>
                                                </div>
                                                {item.tags_json && item.tags_json.map((tag: string) => (
                                                    <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-md font-bold uppercase tracking-wide">{tag}</span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Grinders Category */}
                            {grinders.length > 0 && (
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2 pl-1">
                                        <Icon name="settings_input_component" className="text-[16px]" /> Grinders
                                    </h2>
                                    <div className="space-y-3">
                                        {grinders.map(item => (
                                            <div key={item.id} className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 transition-all flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-neutral-text text-base mb-0.5">{item.name}</h3>
                                                    <p className="text-xs text-gray-500 font-medium">{item.description}</p>
                                                </div>
                                                {item.tags_json && item.tags_json.map((tag: string) => (
                                                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-bold uppercase tracking-wide">{tag}</span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Kettles Category */}
                            {kettles.length > 0 && (
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2 pl-1">
                                        <Icon name="kettle" className="text-[16px]" /> Kettles
                                    </h2>
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4">
                                        {kettles.map(item => (
                                            <div key={item.id} className="py-4 flex items-center justify-between border-b last:border-0 border-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                        <Icon name="bolt" className="text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-neutral-text">{item.name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight mt-0.5">{item.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )
                )}
            </main>

            {/* Floating Add Button */}
            <button className="fixed bottom-28 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 flex items-center justify-center hover:bg-primary-dark transition-colors active:scale-90 border-[3px] border-white cursor-pointer">
                <Icon name="add" className="text-[32px]" />
            </button>

            {/* Bottom Navigation */}
            <BottomNav activeTab="pantry" />
        </div>
    );
};
