import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { settingsService, brewService } from '../core/services';
import type { BrewingMethod } from '../shared/domain/entities';

type MethodCard = BrewingMethod & { image: string; category: string };

const CATEGORIES = [
    'Pressure Brewing Methods',
    'Drip, Flow & Gravity Brewing Methods',
    'Full Immersion (Steeping) Methods',
    'Vacuum, Special & Percolation Methods',
    'Hybrid & Portable Methods',
] as const;

const CATEGORY_ICONS: Record<string, string> = {
    'Pressure Brewing Methods': 'speed',
    'Drip, Flow & Gravity Brewing Methods': 'water_drop',
    'Full Immersion (Steeping) Methods': 'waves',
    'Vacuum, Special & Percolation Methods': 'science',
    'Hybrid & Portable Methods': 'tune',
};

const toCard = (m: BrewingMethod): MethodCard => ({
    ...m,
    category: m.category || getCategoryFallback(m.id),
    image: `/assets/methods/${m.id}.png`,
});

function getCategoryFallback(id: string): string {
    if (['espresso', 'moka_pot', 'aeropress', 'keurig'].includes(id)) return 'Pressure Brewing Methods';
    if (['v60', 'kalita', 'chemex', 'drip_machine', 'phin', 'south_indian_filter'].includes(id)) return 'Drip, Flow & Gravity Brewing Methods';
    if (['french_press', 'cold_brew', 'turkish', 'dallah', 'jebena', 'tubruk'].includes(id)) return 'Full Immersion (Steeping) Methods';
    if (['cold_drip', 'siphon', 'sock_coffee', 'percolator', 'clover'].includes(id)) return 'Vacuum, Special & Percolation Methods';
    return 'Hybrid & Portable Methods';
}

const MethodImage = ({ src, alt, icon, size = "md" }: { src: string; alt: string; icon?: string; size?: "sm" | "md" | "lg" }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !src) {
        const iconSize = size === "sm" ? "text-2xl" : size === "md" ? "text-3xl" : "text-5xl";
        return (
            <div className="flex items-center justify-center w-full h-full text-md-primary">
                <Icon name={icon || 'coffee'} className={iconSize} style={{ fontVariationSettings: "'FILL' 1" }} />
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

export const BrewMethodsPage = () => {
    const navigate = useNavigate();
    const [allMethods, setAllMethods] = useState<MethodCard[]>([]);
    const [availableMethods, setAvailableMethods] = useState<MethodCard[]>([]);
    const [userPreferredIds, setUserPreferredIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMethodModal, setSelectedMethodModal] = useState<MethodCard | null>(null);

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const dbMethods = await brewService.getAllMethods();
                const cards = dbMethods.map(toCard);
                setAllMethods(cards);

                const preferredIds = await settingsService.getUserPreferredMethods();
                if (preferredIds && preferredIds.length > 0) {
                    setUserPreferredIds(preferredIds);
                    setSelectedIds(preferredIds);
                    const idSet = new Set(preferredIds);
                    const filtered = cards.filter(m => idSet.has(m.id));
                    setAvailableMethods(filtered.length > 0 ? filtered : cards.slice(0, 6));
                } else {
                    const defaultIds = cards.slice(0, 6).map(m => m.id);
                    setUserPreferredIds(defaultIds);
                    setSelectedIds(defaultIds);
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
    }, []);

    const toggleMethod = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((item) => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSaveEquipment = async () => {
        if (selectedIds.length < 1) return;
        try {
            await settingsService.setUserPreferredMethods(selectedIds);
            setUserPreferredIds(selectedIds);
            const idSet = new Set(selectedIds);
            setAvailableMethods(allMethods.filter(m => idSet.has(m.id)));
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to save preferred methods:', err);
        }
    };

    const handleEditToggle = () => {
        setSelectedIds(userPreferredIds);
        setIsEditing(true);
    };

    const displayedMethods = isEditing ? allMethods : availableMethods;

    const filteredMethods = useMemo(() => {
        if (!searchQuery.trim()) return displayedMethods;
        const q = searchQuery.toLowerCase();
        return displayedMethods.filter(
            (m) =>
                m.name.toLowerCase().includes(q) ||
                (m.description && m.description.toLowerCase().includes(q)) ||
                (m.category && m.category.toLowerCase().includes(q))
        );
    }, [searchQuery, displayedMethods]);

    // Group methods by category for Edit mode only
    const groupedMethods = useMemo(() => {
        const groups: Record<string, MethodCard[]> = {};
        CATEGORIES.forEach((cat) => {
            groups[cat] = [];
        });
        filteredMethods.forEach((m) => {
            const cat = m.category && CATEGORIES.includes(m.category as any) ? m.category : getCategoryFallback(m.id);
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(m);
        });
        return groups;
    }, [filteredMethods]);

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
                                {isEditing ? 'Select Equipment' : 'Brewing Equipment'}
                            </h1>
                            <p className="typescale-body-small text-md-on-surface-variant">
                                {isEditing ? 'Choose equipment for your dashboard' : 'Select a method to browse recipes'}
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
                        placeholder="Search equipment..."
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

            {isEditing ? (
                /* EDIT MODE: Pick methods (minimum 1), grouped by extraction style */
                <main className="flex-1 px-5 pt-4">
                    <div className="mb-4 text-center bg-md-secondary-container/50 p-3 rounded-xl border border-md-outline-variant/20">
                        <p className="typescale-body-medium text-md-on-secondary-container font-medium">
                            Select <span className="text-md-primary font-bold">at least 1 item</span> for your equipment list. ({selectedIds.length} selected)
                        </p>
                    </div>

                    <div className="space-y-6 pb-20">
                        {CATEGORIES.map((catName) => {
                            const catItems = groupedMethods[catName] || [];
                            if (catItems.length === 0) return null;

                            return (
                                <section key={catName} className="space-y-2.5">
                                    <div className="flex items-center gap-2 border-b border-md-outline-variant/20 pb-1.5">
                                        <div className="size-6 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                                            <Icon name={CATEGORY_ICONS[catName] || 'coffee'} className="text-sm" />
                                        </div>
                                        <h2 className="typescale-label-large font-bold text-md-on-surface-variant uppercase tracking-wider">
                                            {catName}
                                        </h2>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {catItems.map((item) => {
                                            const isSelected = selectedIds.includes(item.id);
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => toggleMethod(item.id)}
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
                                                    <div className={`size-14 mb-2 rounded-lg flex items-center justify-center transition-colors overflow-hidden border border-md-outline-variant/20 ${
                                                        isSelected ? 'bg-md-primary-container' : 'bg-md-surface-container-highest'
                                                    }`}>
                                                        <MethodImage src={item.image} alt={item.name} icon={item.icon} size="sm" />
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
                                </section>
                            );
                        })}
                    </div>

                    <div className="fixed bottom-0 w-full bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 p-5 z-30 max-w-md mx-auto left-0 right-0">
                        <Button
                            variant="filled"
                            size="lg"
                            onClick={handleSaveEquipment}
                            disabled={selectedIds.length < 1}
                            className="w-full"
                        >
                            <span>Save Selection ({selectedIds.length})</span>
                            <Icon name="check" className="text-xl" />
                        </Button>
                    </div>
                </main>
            ) : (
                /* NORMAL MODE: Horizontal Row List Layout */
                <main className="flex-1 px-5 pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="typescale-title-medium font-bold text-md-on-surface">Your Equipment</h2>
                            <p className="typescale-body-small text-md-on-surface-variant">Tap any equipment to view details or recipes</p>
                        </div>
                        <button
                            onClick={handleEditToggle}
                            className="typescale-label-large bg-md-secondary-container text-md-on-secondary-container px-3.5 py-1.5 rounded-full hover:bg-md-secondary-container/80 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <Icon name="edit" className="text-base" />
                            Edit
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="size-9 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredMethods.map((method) => (
                                <div
                                    key={method.id}
                                    onClick={() => setSelectedMethodModal(method)}
                                    className="group flex items-center gap-4 p-4 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/30 hover:bg-md-surface-container-high hover:border-md-primary/40 transition-all active:scale-[0.98] cursor-pointer shadow-md-1"
                                >
                                    {/* Circular Left Image / Avatar Container */}
                                    <div className="size-14 rounded-full bg-md-surface-container-highest flex items-center justify-center overflow-hidden border border-md-outline-variant/20 p-1 shrink-0">
                                        <MethodImage src={method.image} alt={method.name} icon={method.icon} size="md" />
                                    </div>

                                    {/* Middle Text Details */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="typescale-title-medium font-bold text-md-on-surface line-clamp-1 mb-0.5">
                                            {method.name}
                                        </h3>
                                        <p className="typescale-body-small text-md-on-surface-variant line-clamp-2 leading-tight">
                                            {method.description}
                                        </p>
                                    </div>

                                    {/* Right Chevron */}
                                    <Icon name="chevron_right" className="text-md-on-surface-variant/40 text-xl group-hover:translate-x-0.5 transition-transform shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredMethods.length === 0 && !loading && (
                        <div className="text-center py-12 px-4 bg-md-surface-container-low rounded-xl border border-dashed border-md-outline-variant">
                            <Icon name="coffee_maker" className="text-4xl text-md-outline/50 mb-2 mx-auto" />
                            <p className="typescale-body-medium text-md-on-surface-variant">
                                {searchQuery ? 'No equipment matches your search.' : 'No equipment found.'}
                            </p>
                        </div>
                    )}

                    {/* Tools Section */}
                    <div className="mt-8 mb-4">
                        <span className="typescale-label-medium text-md-on-surface-variant font-bold uppercase tracking-wider mb-3 block">Other Tools</span>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => navigate('/quick-timer')}
                                className="flex items-center p-3.5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 hover:bg-md-surface-container-high active:scale-[0.98] transition-all cursor-pointer text-left w-full shadow-md-1"
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
                                className="flex items-center p-3.5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 hover:bg-md-surface-container-high active:scale-[0.98] transition-all cursor-pointer text-left w-full shadow-md-1"
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

            {/* Popup Detail Modal */}
            {selectedMethodModal && (
                <Modal
                    isOpen={!!selectedMethodModal}
                    onClose={() => setSelectedMethodModal(null)}
                    title={selectedMethodModal.name}
                    message={
                        <div className="space-y-4 text-left">
                            <div className="flex items-center gap-2">
                                <span className="typescale-label-medium bg-md-primary-container text-md-on-primary-container px-3 py-1 rounded-full font-semibold">
                                    {selectedMethodModal.category}
                                </span>
                            </div>

                            <div className="size-32 mx-auto rounded-full bg-md-surface-container-highest flex items-center justify-center overflow-hidden border border-md-outline-variant/30 p-2 shadow-md-1">
                                <MethodImage src={selectedMethodModal.image} alt={selectedMethodModal.name} icon={selectedMethodModal.icon} size="lg" />
                            </div>

                            <div className="bg-md-surface-container-low p-4 rounded-xl border border-md-outline-variant/30">
                                <p className="typescale-body-medium text-md-on-surface leading-relaxed">
                                    {selectedMethodModal.description || 'A classic coffee brewing method.'}
                                </p>
                            </div>
                        </div>
                    }
                    confirmText="Browse Recipes"
                    cancelText="Close"
                    onConfirm={() => {
                        const mId = selectedMethodModal.id;
                        setSelectedMethodModal(null);
                        navigate(`/recipes?method=${mId}`);
                    }}
                />
            )}

            {/* Navigation (Hide when editing) */}
            {!isEditing && <BottomNav activeTab="brewing" />}
        </div>
    );
};
