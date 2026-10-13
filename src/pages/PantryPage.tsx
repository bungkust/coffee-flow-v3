import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { SearchBar } from '../components/SearchBar';
import { pantryService } from '../core/services';
import { PANTRY_CATEGORY_MAP } from '../features/pantry/domain/pantryCategories';
import type { PantryItem } from '../features/pantry/domain/entities';

type Tab = 'supplies' | 'gear';

export const PantryPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('supplies');
    const [items, setItems] = useState<PantryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBean, setSelectedBean] = useState<PantryItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const getStockPercent = (item: PantryItem) => Math.min(100, Math.max(0, item.quantity ?? 0));

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await pantryService.getPantryItems();
            setItems(data);
        } catch (error) {
            console.error('Failed to load pantry items:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        const text = `${item.name} ${item.brand || ''} ${item.description || ''} ${(item.tags_json || []).join(' ')}`.toLowerCase();
        return text.includes(searchQuery.toLowerCase());
    });

    const supplies = filteredItems.filter(i => !PANTRY_CATEGORY_MAP[i.category]?.isGear);
    const gear = filteredItems.filter(i => PANTRY_CATEGORY_MAP[i.category]?.isGear);

    // Grouping helpers
    const beans = supplies.filter(i => i.category === 'beans');
    const essentials = supplies.filter(i => i.category !== 'beans');

    const drippers = gear.filter(i => i.category === 'dripper');
    const brewers = gear.filter(i => ['machine', 'french_press', 'aeropress', 'scale', 'accessory'].includes(i.category));
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
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-32">
            {/* Sticky Header */}
            <PageHeader title="My Pantry" padding="px-5 pb-2" rowClassName="mb-3">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search inventory..."
                    className="mb-3"
                />
                {/* Segmented Button / Toggle Switch */}
                <div className="pb-3">
                    <SegmentedControl
                        name="pantry-filter"
                        value={activeTab}
                        options={[
                            { value: 'supplies', label: 'Supplies' },
                            { value: 'gear', label: 'Gear' }
                        ]}
                        onChange={setActiveTab}
                    />
                </div>
            </PageHeader>

            {/* Inventory List */}
            <main className="flex-1 px-5 pt-3 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
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
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedBean(item)}
                                                className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden"
                                            >
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
                                                        <span className="text-xs font-bold text-primary">{item.quantity != null ? `${item.quantity}${item.unit || ''}` : '0%'}</span>
                                                    </div>
                                                    {((item.quantity === undefined || item.quantity === null) || item.unit === '%') && (
                                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="bg-primary h-full rounded-full" style={{ width: `${getStockPercent(item)}%` }}></div>
                                                        </div>
                                                    )}
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
                                            <div key={item.id} onClick={() => setSelectedBean(item)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
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
                                                    <span className={`text-xs font-bold ${item.is_low_stock ? 'text-red-500' : 'text-gray-600'}`}>
                                                        {item.quantity != null ? `${item.quantity}${item.unit || ''}` : '0%'}
                                                    </span>
                                                    {((item.quantity === undefined || item.quantity === null) || item.unit === '%') && (
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className={`${item.is_low_stock ? 'bg-red-500' : 'bg-primary'} h-full rounded-full`} style={{ width: `${getStockPercent(item)}%` }}></div>
                                                        </div>
                                                    )}
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
                            {brewers.length > 0 && (
                                <div>
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2 pl-1">
                                        <Icon name="build" className="text-[16px]" /> Other Gear
                                    </h2>
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4">
                                        {brewers.map(item => (
                                            <div key={item.id} onClick={() => setSelectedBean(item)} className="py-4 flex items-center justify-between border-b last:border-0 border-gray-50 cursor-pointer hover:bg-gray-50">
                                                <div>
                                                    <p className="font-bold text-sm text-neutral-text">{item.name}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight mt-0.5">{item.category.replace('_', ' ')}</p>
                                                </div>
                                                <Icon name="chevron_right" className="text-gray-300" />
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
            <button
                onClick={() => navigate('/pantry/add')}
                className="fixed bottom-32 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 flex items-center justify-center hover:bg-primary-dark transition-colors active:scale-90 border-[3px] border-white cursor-pointer"
            >
                <Icon name="add" className="text-[32px]" />
            </button>

            {/* Bottom Navigation */}
            <BottomNav activeTab="pantry" />

            {/* Item Details Modal */}
            {selectedBean && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-t-3xl pt-8 pb-10 px-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-[#181411] mb-1">{selectedBean.name}</h2>
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{selectedBean.brand || 'Unknown Roastery'}</p>
                            </div>
                            <button
                                onClick={() => setSelectedBean(null)}
                                className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center -mt-2 -mr-2"
                            >
                                <Icon name="close" className="text-[20px]" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Tags Section */}
                            {selectedBean.tags_json && selectedBean.tags_json.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Profile & Specs</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedBean.tags_json.map((tag, idx) => (
                                            <span key={idx} className="bg-gray-50 border border-gray-100 text-gray-600 text-[11px] font-bold px-3 py-1.5 rounded-lg">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description Section */}
                            {selectedBean.description && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Tasting Notes</h4>
                                    <p className="text-sm text-[#181411] leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10">
                                        "{selectedBean.description}"
                                    </p>
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
                                    <Icon name="calendar_month" className="text-primary mb-2 text-[20px]" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Roast Date</span>
                                    <span className="text-sm font-bold text-[#181411]">
                                        {selectedBean.roast_date ? new Date(selectedBean.roast_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
                                    <Icon name="scale" className="text-primary mb-2 text-[20px]" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Stock Left</span>
                                    <span className="text-sm font-bold text-[#181411]">
                                        {selectedBean.quantity != null ? `${selectedBean.quantity}${selectedBean.unit || ''}` : '0%'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            className="w-full mt-8 bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                            onClick={() => navigate(`/pantry/${selectedBean.id}/edit`)}
                        >
                            Edit Item
                        </button>
                        <button
                            className="w-full mt-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-2xl transition-all"
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            Delete Item
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Item Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={async () => {
                    if (selectedBean) {
                        await pantryService.deletePantryItem(selectedBean.id);
                        setSelectedBean(null);
                        loadData();
                    }
                    setIsDeleteModalOpen(false);
                }}
                title="Delete Pantry Item?"
                message={`Are you sure you want to delete "${selectedBean?.name}" from your pantry?`}
                confirmText="Delete"
                cancelText="Cancel"
                type="warning"
            />
        </div>
    );
};
