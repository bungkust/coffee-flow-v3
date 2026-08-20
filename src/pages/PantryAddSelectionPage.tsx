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
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        aria-label="Go back"
                    >
                        <Icon name="arrow_back" className="text-2xl" />
                    </button>
                    <h1 className="typescale-headline-small font-bold text-md-on-surface">Add Pantry Item</h1>
                </div>
            </header>

            {/* Tab Selection */}
            <div className="px-5 py-4 flex gap-3">
                <button
                    onClick={() => setActiveTab('supplies')}
                    className={`flex-1 py-3 typescale-label-medium font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                        activeTab === 'supplies'
                            ? 'bg-md-secondary-container text-md-on-secondary-container border-md-primary shadow-sm'
                            : 'bg-md-surface-container-low text-md-on-surface-variant border-md-outline-variant/30 hover:bg-md-surface-container-high'
                    }`}
                >
                    Supplies
                </button>
                <button
                    onClick={() => setActiveTab('gear')}
                    className={`flex-1 py-3 typescale-label-medium font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                        activeTab === 'gear'
                            ? 'bg-md-secondary-container text-md-on-secondary-container border-md-primary shadow-sm'
                            : 'bg-md-surface-container-low text-md-on-surface-variant border-md-outline-variant/30 hover:bg-md-surface-container-high'
                    }`}
                >
                    Gear
                </button>
            </div>

            {/* List */}
            <main className="flex-1 px-5 py-2 space-y-3">
                <p className="typescale-body-small font-medium text-md-on-surface-variant px-1">
                    What would you like to add to your pantry?
                </p>
                <div className="flex flex-col gap-3">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleSelect(cat.id)}
                            className="group flex items-center gap-4 p-4 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/30 hover:bg-md-surface-container-high hover:border-md-primary/40 transition-all active:scale-[0.98] cursor-pointer shadow-md-1 text-left"
                        >
                            <div className="size-14 rounded-full bg-md-surface-container-highest flex items-center justify-center text-md-primary shrink-0 border border-md-outline-variant/20">
                                <Icon name={cat.icon} className="text-2xl" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="typescale-title-medium font-bold text-md-on-surface line-clamp-1 mb-0.5">{cat.name}</h3>
                                <p className="typescale-body-small text-md-on-surface-variant line-clamp-1">{cat.desc}</p>
                            </div>
                            <Icon name="chevron_right" className="text-md-on-surface-variant/40 text-xl group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
};
