import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { GEAR_CATEGORIES, SUPPLIES_CATEGORIES } from '../features/pantry/domain/pantryCategories';

export const PantryAddSelectionPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'supplies' | 'gear'>('supplies');

    const categories = activeTab === 'supplies' ? SUPPLIES_CATEGORIES : GEAR_CATEGORIES;

    const handleSelect = (categoryId: string) => {
        navigate(`/pantry/add/${categoryId}`);
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-24">
            {/* Header */}
            <PageHeader title="Add Pantry Item" onBack={() => navigate(-1)} />

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
