import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { Dropdown } from '../components/Dropdown';
import { Modal } from '../components/Modal';
import { drinkService, pantryService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';
import type { ExtraPantryItemUsage } from '../features/brew/application/DrinkService';
import { parseList, formatScaledIngredient } from '../shared/utils/drinks';

export const DrinkPreparationPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [drink, setDrink] = useState<Drink | null>(null);
    const [loading, setLoading] = useState(true);
    const [servings, setServings] = useState<number>(1);
    const [beans, setBeans] = useState<PantryItem[]>([]);
    const [milks, setMilks] = useState<PantryItem[]>([]);
    const [availableExtras, setAvailableExtras] = useState<PantryItem[]>([]);
    const [selectedBeanId, setSelectedBeanId] = useState<string>('');
    const [selectedMilkId, setSelectedMilkId] = useState<string>('');
    
    // Extra pantry items added dynamically
    const [extraItems, setExtraItems] = useState<ExtraPantryItemUsage[]>([]);
    const [isAddExtraModalOpen, setIsAddExtraModalOpen] = useState(false);
    const [tempExtraId, setTempExtraId] = useState<string>('');
    const [tempExtraAmount, setTempExtraAmount] = useState<string>('15');

    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            try {
                const [drinkData, pantryItems] = await Promise.all([
                    drinkService.getDrink(id),
                    pantryService.getPantryItems()
                ]);
                setDrink(drinkData);

                const availableBeans = pantryItems.filter((item) => item.category === 'beans');
                const availableMilks = pantryItems.filter((item) => item.category === 'milk');
                const extras = pantryItems.filter((item) =>
                    ['syrup', 'sugar', 'other_ingredient', 'other'].includes(item.category)
                );

                setBeans(availableBeans);
                setMilks(availableMilks);
                setAvailableExtras(extras);

                if (availableBeans.length > 0) setSelectedBeanId(availableBeans[0].id);
                if (availableMilks.length > 0) setSelectedMilkId(availableMilks[0].id);
            } catch (error) {
                console.error('Failed to load drink preparation:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const rawIngredients = useMemo(() => {
        return drink ? parseList(drink.ingredients_json) : [];
    }, [drink]);

    const scaledIngredients = useMemo(() => {
        return rawIngredients.map((ing) => formatScaledIngredient(ing, servings));
    }, [rawIngredients, servings]);

    const isCoffeeBase = (drink?.base_type || 'coffee') === 'coffee';
    const hasMilkIngredient = useMemo(() => {
        return rawIngredients.some((ing) => /milk|dairy|oat|soy|almond/i.test(ing));
    }, [rawIngredients]);

    // Handle adding an extra item
    const handleAddExtraItem = () => {
        if (!tempExtraId) return;
        const targetPantry = availableExtras.find(p => p.id === tempExtraId);
        if (!targetPantry) return;

        const amt = parseFloat(tempExtraAmount) || 15;
        setExtraItems(prev => {
            const exists = prev.some(e => e.pantryItemId === tempExtraId);
            return exists
                ? prev.map(e => e.pantryItemId === tempExtraId ? { ...e, amount: e.amount + amt } : e)
                : [...prev, { pantryItemId: targetPantry.id, name: targetPantry.name, amount: amt, unit: targetPantry.unit || 'g' }];
        });

        setIsAddExtraModalOpen(false);
        setTempExtraId('');
        setTempExtraAmount('15');
    };

    const handleRemoveExtraItem = (pantryItemId: string) => {
        setExtraItems(prev => prev.filter(e => e.pantryItemId !== pantryItemId));
    };

    // Dynamic mise en place checklist
    const dynamicChecklist = useMemo(() => {
        if (!drink) return [];
        const items: { id: string; label: string }[] = [];

        // Glassware / ice
        const isIced = /iced|cold|frappe/i.test(drink.name) || rawIngredients.some((i) => /ice/i.test(i));
        if (isIced) {
            items.push({ id: 'ice', label: `Fill ${servings > 1 ? `${servings} serving glasses` : 'serving glass'} with fresh ice` });
        } else {
            items.push({ id: 'glass', label: `Pre-warm ${servings > 1 ? `${servings} cups/glasses` : 'cup/glass'} with hot water` });
        }

        // Ingredients scaled
        scaledIngredients.forEach((ing, idx) => {
            items.push({ id: `ing_${idx}`, label: `Measure ${ing}` });
        });

        // Extra pantry items added
        extraItems.forEach((extra, idx) => {
            const scaledAmount = Math.round(extra.amount * servings * 10) / 10;
            items.push({ id: `extra_${idx}`, label: `Add extra: ${scaledAmount}${extra.unit || 'g'} ${extra.name}` });
        });

        // Machine / Tools setup
        if (isCoffeeBase) {
            items.push({ id: 'machine', label: 'Purge espresso machine group head & wipe portafilter dry' });
        }
        if (hasMilkIngredient) {
            items.push({ id: 'pitcher', label: 'Prepare clean milk pitcher & steam wand cloth' });
        }

        return items;
    }, [drink, rawIngredients, scaledIngredients, extraItems, servings, isCoffeeBase, hasMilkIngredient]);

    const toggleCheck = (itemId: string) => {
        setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const handleAdjustServings = (delta: number) => {
        setServings((prev) => Math.max(1, Math.min(6, prev + delta)));
    };

    const totalChecklistItems = dynamicChecklist.length;
    const checkedCount = dynamicChecklist.filter((item) => checkedItems[item.id]).length;
    const isReady = totalChecklistItems > 0 && checkedCount === totalChecklistItems;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!drink) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface p-6 text-center">
                <Icon name="error" className="text-5xl text-md-error mb-4" />
                <h2 className="typescale-title-large font-bold text-md-on-surface">Drink not found</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 text-md-primary font-bold hover:underline cursor-pointer"
                >
                    Back to previous page
                </button>
            </div>
        );
    }

    const proceedToFlow = () => {
        // Scale extraItems amounts by servings when passing to flow
        const scaledExtras = extraItems.map(extra => ({
            ...extra,
            amount: Math.round(extra.amount * servings * 10) / 10
        }));

        navigate(`/drinks/${drink.id}/flow`, {
            state: {
                servings,
                selectedBeanId: isCoffeeBase ? selectedBeanId : undefined,
                selectedMilkId: hasMilkIngredient ? selectedMilkId : undefined,
                extraPantryItems: scaledExtras,
            }
        });
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <PageHeader title="Preparation" onBack={() => navigate(-1)} />

            {/* Preparation Banner Title */}
            <div className="px-5 py-5 border-b border-md-outline-variant/20 bg-md-surface-container-low/60 space-y-1">
                <span className="typescale-label-medium font-bold text-md-primary uppercase tracking-wider">Mise En Place</span>
                <h1 className="typescale-headline-small font-bold text-md-on-surface leading-tight">{drink.name}</h1>
                <p className="typescale-body-small text-md-on-surface-variant">Scale servings and prep ingredients before crafting.</p>
            </div>

            <main className="flex-1 px-5 pt-4 space-y-5">
                {/* Servings Scaler Card */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">
                            Portion Scaler
                        </span>
                        <span className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1 rounded-full">
                            {servings} {servings > 1 ? 'Servings' : 'Serving'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-1">
                        <button
                            type="button"
                            onClick={() => handleAdjustServings(-1)}
                            disabled={servings <= 1}
                            className={`size-11 rounded-full border border-md-outline-variant/40 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all active:scale-95 flex items-center justify-center font-bold text-2xl cursor-pointer ${
                                servings <= 1 ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            aria-label="Decrease servings"
                        >
                            -
                        </button>
                        <div className="flex flex-col items-center flex-1">
                            <span className="typescale-headline-medium font-extrabold text-md-on-surface tracking-tight tabular-nums">
                                {servings}x
                            </span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 font-bold uppercase tracking-wider">
                                {servings > 1 ? `${servings} Cups / Glasses` : 'Standard Cup'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleAdjustServings(1)}
                            disabled={servings >= 6}
                            className={`size-11 rounded-full border border-md-outline-variant/40 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface transition-all active:scale-95 flex items-center justify-center font-bold text-2xl cursor-pointer ${
                                servings >= 6 ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            aria-label="Increase servings"
                        >
                            +
                        </button>
                    </div>

                    <div className="h-px bg-md-outline-variant/20" />
                    <div className="flex items-center justify-between text-xs text-md-on-surface-variant font-medium">
                        <span>Base: <strong className="text-md-on-surface capitalize">{drink.base_type || 'Coffee'}</strong></span>
                        <span>Ingredients: <strong className="text-md-on-surface">{rawIngredients.length + extraItems.length} items</strong></span>
                    </div>
                </div>

                {/* Pantry Bean Picker (If Coffee Base) */}
                {isCoffeeBase && (
                    <div>
                        {beans.length > 0 ? (
                            <Dropdown
                                label="Choose Beans from Pantry"
                                icon="inventory_2"
                                options={beans.map((b) => ({
                                    value: b.id,
                                    label: `${b.name} (${b.quantity ?? 0} ${b.unit || 'g'})`
                                }))}
                                value={selectedBeanId}
                                onChange={setSelectedBeanId}
                                placeholder="Select a coffee bean..."
                                className="w-full"
                            />
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                    <Icon name="inventory_2" className="text-base" /> Choose Beans from Pantry
                                </label>
                                <div className="p-4 bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl flex items-center justify-between shadow-md-1">
                                    <span className="typescale-body-medium text-md-on-surface-variant font-medium">No beans available</span>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/pantry/add/beans')}
                                        className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                                    >
                                        Add Beans
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Pantry Milk Picker (If Milk Ingredient present) */}
                {hasMilkIngredient && (
                    <div>
                        {milks.length > 0 ? (
                            <Dropdown
                                label="Choose Milk / Dairy from Pantry"
                                icon="local_cafe"
                                options={milks.map((m) => ({
                                    value: m.id,
                                    label: `${m.name} (${m.quantity ?? 0} ${m.unit || 'ml'})`
                                }))}
                                value={selectedMilkId}
                                onChange={setSelectedMilkId}
                                placeholder="Select milk / plant dairy..."
                                className="w-full"
                            />
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                    <Icon name="local_cafe" className="text-base" /> Choose Milk from Pantry
                                </label>
                                <div className="p-4 bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl flex items-center justify-between shadow-md-1">
                                    <span className="typescale-body-medium text-md-on-surface-variant font-medium">No milk available</span>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/pantry/add/milk')}
                                        className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                                    >
                                        Add Milk
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Extra Pantry Items Section */}
                <div className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1.5">
                            <Icon name="add_circle" className="text-md-primary text-base" /> Extra Pantry Add-ons
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsAddExtraModalOpen(true)}
                            className="typescale-label-small font-bold text-md-primary bg-md-primary-container/40 hover:bg-md-primary-container/70 px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <Icon name="add" className="text-sm" /> Add Extra
                        </button>
                    </div>

                    {extraItems.length > 0 ? (
                        <div className="space-y-2 pt-1">
                            {extraItems.map((extra) => (
                                <div
                                    key={extra.pantryItemId}
                                    className="flex items-center justify-between p-3 rounded-xl bg-md-surface-container-high/60 border border-md-outline-variant/20"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="size-7 rounded-lg bg-md-primary/10 text-md-primary flex items-center justify-center shrink-0">
                                            <Icon name="liquor" className="text-sm" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="typescale-body-small font-bold text-md-on-surface truncate">
                                                {extra.name}
                                            </p>
                                            <p className="typescale-label-small text-md-on-surface-variant">
                                                Base: {extra.amount}{extra.unit || 'g'} ({Math.round(extra.amount * servings * 10) / 10}{extra.unit || 'g'} for {servings}x)
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExtraItem(extra.pantryItemId)}
                                        className="size-8 rounded-full flex items-center justify-center text-md-on-surface-variant hover:text-md-error hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                                        aria-label={`Remove ${extra.name}`}
                                    >
                                        <Icon name="close" className="text-base" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="typescale-body-small text-md-on-surface-variant/80 italic pt-1">
                            No extra syrups, sweeteners, or toppings added. Tap "+ Add Extra" to customize.
                        </p>
                    )}
                </div>

                {/* Preparation Checklist */}
                <div className="pt-2">
                    <div className="flex items-center justify-between mb-3.5">
                        <h2 className="typescale-title-medium font-bold text-md-on-surface flex items-center gap-2">
                            <Icon name="checklist" className="text-md-primary" />
                            Preparation Checklist
                        </h2>
                        <span
                            className={`typescale-label-small font-bold px-2.5 py-0.5 rounded-full border ${
                                isReady
                                    ? 'bg-md-primary-container text-md-on-primary-container border-md-primary/20'
                                    : 'bg-md-surface-container-high text-md-on-surface-variant border-md-outline-variant/30'
                            }`}
                        >
                            {checkedCount}/{totalChecklistItems} Checked
                        </span>
                    </div>

                    <div className="space-y-2.5">
                        {dynamicChecklist.map((item) => (
                            <CheckItem
                                key={item.id}
                                label={item.label}
                                checked={Boolean(checkedItems[item.id])}
                                onToggle={() => toggleCheck(item.id)}
                            />
                        ))}
                    </div>
                </div>
            </main>

            {/* Modal to Add Extra Pantry Item */}
            <Modal
                isOpen={isAddExtraModalOpen}
                type="info"
                title="Add Extra from Pantry"
                confirmText="Add to Drink"
                cancelText="Cancel"
                onConfirm={handleAddExtraItem}
                onClose={() => setIsAddExtraModalOpen(false)}
                message={
                    <div className="space-y-4 text-left pt-2">
                        {availableExtras.length > 0 ? (
                            <>
                                <Dropdown
                                    label="Select Pantry Item"
                                    icon="inventory_2"
                                    options={availableExtras.map(p => ({
                                        value: p.id,
                                        label: `${p.name} (${p.category}) - ${p.quantity ?? 0}${p.unit || 'g'}`
                                    }))}
                                    value={tempExtraId}
                                    onChange={setTempExtraId}
                                    placeholder="Choose syrup, sugar, flavor..."
                                />

                                <div className="space-y-1.5">
                                    <label className="typescale-label-small font-bold uppercase tracking-wider text-md-on-surface-variant block">
                                        Amount per Serving
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={tempExtraAmount}
                                            onChange={(e) => setTempExtraAmount(e.target.value)}
                                            className="flex-1 bg-md-surface-container-high text-md-on-surface rounded-xl py-2.5 px-3.5 border border-md-outline-variant/40 focus:ring-2 focus:ring-md-primary/40 typescale-body-medium outline-none"
                                            placeholder="15"
                                        />
                                        <span className="typescale-body-medium font-bold text-md-on-surface-variant">
                                            {availableExtras.find(p => p.id === tempExtraId)?.unit || 'ml/g'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-4 rounded-xl bg-md-surface-container-high text-center space-y-2">
                                <p className="typescale-body-medium text-md-on-surface-variant">
                                    No syrups or extra ingredients found in your pantry.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/pantry/add/syrup')}
                                    className="typescale-label-medium font-bold text-md-primary hover:underline cursor-pointer"
                                >
                                    + Add Syrup to Pantry
                                </button>
                            </div>
                        )}
                    </div>
                }
            />

            {/* Sticky Action Button */}
            <SaveBar
                onClick={proceedToFlow}
                disabled={!isReady}
                p="p-4"
                icon={isReady ? 'play_arrow' : 'lock'}
                label={isReady ? 'Start Crafting Flow' : 'Complete Checklist to Start'}
            />
        </div>
    );
};

const CheckItem = ({
    label,
    checked,
    onToggle,
}: {
    label: string;
    checked: boolean;
    onToggle: () => void;
}) => (
    <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer w-full text-left shadow-md-1 ${
            checked
                ? 'bg-md-secondary-container text-md-on-secondary-container border-md-primary'
                : 'bg-md-surface-container-low text-md-on-surface border-md-outline-variant/30 hover:bg-md-surface-container-high'
        }`}
    >
        <div
            className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                checked
                    ? 'bg-md-primary border-md-primary text-md-on-primary'
                    : 'border-md-outline-variant text-transparent'
            }`}
        >
            <Icon name="check" className="text-base font-bold" />
        </div>
        <span
            className={`typescale-body-medium font-bold ${
                checked ? 'text-md-on-secondary-container' : 'text-md-on-surface'
            }`}
        >
            {label}
        </span>
    </button>
);
