import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';

export const PantryAddSelectionPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'supplies' | 'gear'>('supplies');

    const suppliesCategories = [
        { id: 'beans', name: 'Coffee Beans', icon: 'coffee', desc: 'Single origins and blends' },
        { id: 'filter', name: 'Filters', icon: 'filter_list', desc: 'Paper, cloth, or metal filters' },
        { id: 'milk', name: 'Milk / Dairy', icon: 'water_drop', desc: 'Dairy and plant-based milks' },
        { id: 'syrup', name: 'Syrup & Flavoring', icon: 'liquor', desc: 'Vanilla, caramel, etc.' },
        { id: 'sugar', name: 'Sugar & Sweeteners', icon: 'cookie', desc: 'Raw sugar, stevia, etc.' },
        { id: 'other_ingredient', name: 'Other Ingredient', icon: 'blender', desc: 'Matcha, cocoa powder, etc.' },
    ];

    const gearCategories = [
        { id: 'machine', name: 'Espresso Machine', icon: 'coffee_maker', desc: 'Manual or semi-auto machines' },
        { id: 'dripper', name: 'Dripper', icon: 'filter_alt', desc: 'V60, Kalita, Chemex' },
        { id: 'french_press', name: 'French Press', icon: 'coffee', desc: 'Immersion brewers' },
        { id: 'aeropress', name: 'AeroPress', icon: 'compress', desc: 'Pressure brewers' },
        { id: 'grinder', name: 'Grinder', icon: 'settings', desc: 'Manual and electric grinders' },
        { id: 'scale', name: 'Scale', icon: 'scale', desc: 'Coffee scales' },
        { id: 'kettle', name: 'Kettle', icon: 'kettle', desc: 'Gooseneck & regular kettles' },
        { id: 'accessory', name: 'Accessory', icon: 'build', desc: 'WDT, tampers, carafes' },
    ];

    const categories = activeTab === 'supplies' ? suppliesCategories : gearCategories;

    const handleSelect = (categoryId: string) => {
        navigate(`/pantry/add/${categoryId}`);
    };

    return (
        <div className="flex h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 z-10 pt-12">
                <button
                    onClick={() => navigate('/pantry')}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-400 trasition-colors -ml-2"
                >
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <h1 className="text-lg font-bold text-neutral-text">Add Item</h1>
                <div className="w-10"></div>
            </div>

            {/* Tab Selection */}
            <div className="px-6 py-4 bg-white border-b border-gray-50 flex gap-4">
                <button
                    onClick={() => setActiveTab('supplies')}
                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-colors ${activeTab === 'supplies'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    Supplies
                </button>
                <button
                    onClick={() => setActiveTab('gear')}
                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-colors ${activeTab === 'gear'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    Gear
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 scrollbar-hide">
                <p className="text-sm font-semibold text-gray-500 mb-4 px-1">
                    What would you like to add to your pantry?
                </p>
                <div className="grid grid-cols-1 gap-3">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleSelect(cat.id)}
                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-primary/40 focus:border-primary transition-all text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                                    <Icon name={cat.icon} className="text-primary text-[24px]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-neutral-text text-base">{cat.name}</h3>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">{cat.desc}</p>
                                </div>
                            </div>
                            <Icon name="chevron_right" className="text-gray-300" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
