import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/Button';
import { settingsService, brewService } from '../core/services';
import type { BrewingMethod } from '../shared/domain/entities';

type MethodCard = BrewingMethod & { image: string };

const toCard = (m: BrewingMethod): MethodCard => ({
    ...m,
    image: `/assets/methods/${m.id}.png`,
});

export const BrewMethodsPage = () => {
    const navigate = useNavigate();
    const [allMethods, setAllMethods] = useState<MethodCard[]>([]);
    const [availableMethods, setAvailableMethods] = useState<MethodCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const dbMethods = await brewService.getAllMethods();
                const cards = dbMethods.map(toCard);
                setAllMethods(cards);

                const preferredIds = await settingsService.getUserPreferredMethods();

                if (preferredIds.length > 0) {
                    const idSet = new Set(preferredIds);
                    const filtered = cards.filter(m => idSet.has(m.id));
                    setAvailableMethods(filtered.length > 0 ? filtered : cards.slice(0, 6));
                } else {
                    setAvailableMethods(cards.slice(0, 6));
                }
            } catch (error) {
                console.error("Failed to load brewing methods:", error);
                setAvailableMethods([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMethods();
    }, [isEditing]);

    const filteredMethods = useMemo(() => {
        if (!searchQuery.trim()) return isEditing ? allMethods : availableMethods;
        const q = searchQuery.toLowerCase();
        const source = isEditing ? allMethods : availableMethods;
        return source.filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.description && m.description.toLowerCase().includes(q))
        );
    }, [searchQuery, isEditing, allMethods, availableMethods]);

    const handleEditToggle = () => {
        if (!isEditing) {
            setSelectedIds(availableMethods.map(m => m.id));
        }
        setIsEditing(!isEditing);
    };

    const toggleMethod = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSaveEquipment = async () => {
        try {
            await settingsService.setUserPreferredMethods(selectedIds);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save equipment", error);
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Sticky Top Header & Search */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {isEditing && (
                            <button
                                onClick={handleEditToggle}
                                className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors"
                            >
                                <Icon name="arrow_back" className="text-2xl" />
                            </button>
                        )}
                        <h1 className="typescale-headline-small font-bold text-md-on-surface">
                            {isEditing ? 'Edit Equipment' : 'Brew Methods'}
                        </h1>
                    </div>
                </div>
                <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center text-md-on-surface-variant">
                        <Icon name="search" className="text-xl" />
                    </span>
                    <input
                        className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-outline/60 rounded-full py-3 pl-11 pr-4 border-none shadow-none focus:outline-none focus:ring-2 focus:ring-md-primary typescale-body-large transition-all"
                        placeholder="Search methods or equipment..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            {/* Content */}
            {isEditing ? (
                <main className="flex-1 flex flex-col pt-5 px-5 pb-24 relative">
                    <div className="mb-5 text-center">
                        <p className="typescale-body-medium text-md-on-surface-variant">
                            Select <span className="text-md-primary font-bold">exactly 6</span> items to show on your dashboard. ({selectedIds.length}/6)
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pb-20">
                        {filteredMethods.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleMethod(item.id)}
                                    className={`group relative flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-[0.98] border cursor-pointer ${
                                        isSelected
                                            ? 'bg-md-secondary-container border-md-primary/40 text-md-on-secondary-container shadow-sm'
                                            : 'bg-md-surface-container-low border-md-outline-variant/40 text-md-on-surface hover:bg-md-surface-container-high'
                                    }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2.5 right-2.5 text-md-primary">
                                            <Icon name="check_circle" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        </div>
                                    )}
                                    <div className={`size-14 mb-2.5 rounded-lg flex items-center justify-center transition-colors overflow-hidden ${
                                        isSelected ? 'bg-md-primary-container' : 'bg-md-surface-container-highest'
                                    }`}>
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover p-1" />
                                    </div>
                                    <span className={`typescale-title-small text-center ${
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
                            onClick={handleSaveEquipment}
                            disabled={selectedIds.length !== 6}
                            className="w-full"
                        >
                            <span>Save Changes</span>
                            <Icon name="check" className="text-xl" />
                        </Button>
                    </div>
                </main>
            ) : (
                <main className="flex-1 px-5 pt-5">
                    <div className="flex justify-between items-center mb-4">
                        <span className="typescale-label-medium text-md-on-surface-variant font-bold uppercase tracking-wider">Your Equipment</span>
                        <button
                            onClick={handleEditToggle}
                            className="typescale-label-large text-md-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                            <Icon name="edit" className="text-base" />
                            Edit
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="size-8 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3.5">
                            {filteredMethods.map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => navigate(`/recipes?method=${method.id}`)}
                                    className="group flex flex-col items-center p-4 rounded-xl bg-md-surface-container-low text-md-on-surface border border-md-outline-variant/30 hover:border-md-primary/40 hover:bg-md-surface-container-high transition-all active:scale-[0.98] cursor-pointer shadow-md-1"
                                >
                                    <div className="size-16 rounded-lg bg-md-surface-container-highest flex items-center justify-center mb-3 transition-colors overflow-hidden border border-md-outline-variant/20 p-1">
                                        <img src={method.image} alt={method.name} className="w-full h-full object-cover" />
                                    </div>
                                    <h3 className="typescale-title-medium font-bold mb-1 text-center">{method.name}</h3>
                                    <p className="typescale-body-small text-md-on-surface-variant text-center line-clamp-2">{method.description}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredMethods.length === 0 && !loading && (
                        <div className="text-center py-10 px-4 bg-md-surface-container-low rounded-xl border border-dashed border-md-outline-variant">
                            <Icon name="coffee_maker" className="text-4xl text-md-outline/50 mb-2 mx-auto" />
                            <p className="typescale-body-medium text-md-on-surface-variant">
                                {searchQuery ? 'No methods match your search.' : 'No brewing equipment found in your pantry.'}
                            </p>
                            {!searchQuery && (
                                <button onClick={() => navigate('/pantry')} className="typescale-label-large text-md-primary font-bold mt-2 hover:underline">
                                    Add Equipment
                                </button>
                            )}
                        </div>
                    )}

                    <div className="mt-8 mb-2">
                        <span className="typescale-label-medium text-md-on-surface-variant font-bold uppercase tracking-wider mb-3 block">Other Tools</span>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => navigate('/quick-timer')}
                                className="flex items-center p-3.5 bg-md-surface-container-low rounded-xl border border-md-outline-variant/30 hover:bg-md-surface-container-high active:scale-[0.98] transition-all cursor-pointer text-left w-full shadow-md-1"
                            >
                                <div className="size-10 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center mr-3.5 shrink-0 font-bold">
                                    <Icon name="timer" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="typescale-title-medium font-semibold text-md-on-surface">Quick Timer</h4>
                                    <p className="typescale-body-small text-md-on-surface-variant">Just timing, no recipe</p>
                                </div>
                                <Icon name="chevron_right" className="text-md-on-surface-variant text-xl" />
                            </button>
                            <button
                                onClick={() => navigate('/ratio-calculator')}
                                className="flex items-center p-3.5 bg-md-surface-container-low rounded-xl border border-md-outline-variant/30 hover:bg-md-surface-container-high active:scale-[0.98] transition-all cursor-pointer text-left w-full shadow-md-1"
                            >
                                <div className="size-10 rounded-full bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center mr-3.5 shrink-0 font-bold">
                                    <Icon name="calculate" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="typescale-title-medium font-semibold text-md-on-surface">Ratio Calculator</h4>
                                    <p className="typescale-body-small text-md-on-surface-variant">Find your perfect strength</p>
                                </div>
                                <Icon name="chevron_right" className="text-md-on-surface-variant text-xl" />
                            </button>
                        </div>
                    </div>
                </main>
            )}

            {/* Navigation (Hide when editing) */}
            {!isEditing && <BottomNav activeTab="brewing" />}
        </div>
    );
};

