import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { Dropdown } from '../components/Dropdown';
import { Icon } from '../components/Icons';
import { drinkService, pantryService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';
import { useSafeBack } from '../shared/utils/backNavigation';

import type { ExtraPantryItemUsage } from '../features/brew/application/DrinkService';

const PRESET_DRINK_TAGS = [
    'Sweet', 'Creamy', 'Balanced', 'Silky', 'Rich', 'Bitter',
    'Nutty', 'Fruity', 'Floral', 'Caramel', 'Chocolatey', 'Refreshing'
];

interface LogLocationState {
    servings?: number;
    selectedBeanId?: string;
    selectedMilkId?: string;
    extraPantryItems?: ExtraPantryItemUsage[];
    durationSeconds?: number;
}

export const DrinkLogPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const location = useLocation();
    const logState = (location.state as LogLocationState) || {};

    const [drink, setDrink] = useState<Drink | null>(null);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Pantry integration
    const [beans, setBeans] = useState<PantryItem[]>([]);
    const [milks, setMilks] = useState<PantryItem[]>([]);
    const [selectedBeanId, setSelectedBeanId] = useState<string>(logState.selectedBeanId || '');
    const [selectedMilkId, setSelectedMilkId] = useState<string>(logState.selectedMilkId || '');

    // Sensory metrics (1-5)
    const [sweetness, setSweetness] = useState<number>(3);
    const [coffeeStrength, setCoffeeStrength] = useState<number>(3);
    const [creaminess, setCreaminess] = useState<number>(3);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        if (!id) return;
        drinkService
            .getDrink(id)
            .then(setDrink)
            .catch((error) => console.error('Failed to load drink:', error));

        pantryService.getPantryItems().then((items) => {
            const availableBeans = items.filter((i) => i.category === 'beans');
            const availableMilks = items.filter((i) => i.category === 'milk');
            setBeans(availableBeans);
            setMilks(availableMilks);

            if (logState.selectedBeanId) {
                setSelectedBeanId(logState.selectedBeanId);
            }
            if (logState.selectedMilkId) {
                setSelectedMilkId(logState.selectedMilkId);
            }
        }).catch(console.error);
    }, [id, logState.selectedBeanId, logState.selectedMilkId]);

    const handleSave = async () => {
        if (!drink) return;
        setSaving(true);
        try {
            await drinkService.logDrink(drink, {
                notes,
                beanId: selectedBeanId || undefined,
                milkId: selectedMilkId || undefined,
                sweetness,
                coffeeStrength: isCoffeeBase ? coffeeStrength : undefined,
                creaminess,
                flavorTags: selectedTags,
                extraPantryItems: logState.extraPantryItems,
            });
            navigate('/journal?tab=drinks', { replace: true });
        } catch (error) {
            console.error('Failed to save drink log:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    if (!drink) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isCoffeeBase = (drink.base_type || 'coffee') === 'coffee';

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <PageHeader title="How was it?" subtitle={drink.name} onBack={() => safeBack(id ? `/drinks/${id}` : '/drinks')} />

            <main className="flex-1 px-5 py-5 space-y-5">

                {/* Pantry Link Section */}
                {(beans.length > 0 || milks.length > 0) && (
                    <section className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3.5">
                        <div className="flex items-center gap-2 text-md-on-surface font-bold text-xs uppercase tracking-wider">
                            <Icon name="inventory_2" className="text-base text-md-primary" />
                            <span>Pantry Ingredients Used</span>
                        </div>

                        {isCoffeeBase && beans.length > 0 && (
                            <Dropdown
                                label="Coffee Beans"
                                value={selectedBeanId}
                                options={[
                                    { value: '', label: 'Select bean from pantry' },
                                    ...beans.map((b) => ({
                                        value: b.id,
                                        label: `${b.name} (${b.quantity ?? 0} ${b.unit || 'g'})`
                                    }))
                                ]}
                                onChange={setSelectedBeanId}
                                placeholder="Choose bean..."
                            />
                        )}

                        {milks.length > 0 && (
                            <Dropdown
                                label="Milk / Dairy"
                                value={selectedMilkId}
                                options={[
                                    { value: '', label: 'Select milk from pantry' },
                                    ...milks.map((m) => ({
                                        value: m.id,
                                        label: `${m.name} (${m.quantity ?? 0} ${m.unit || 'ml'})`
                                    }))
                                ]}
                                onChange={setSelectedMilkId}
                                placeholder="Choose milk..."
                            />
                        )}
                    </section>
                )}

                {/* Sensory Sliders */}
                <section className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant">
                        Sensory Evaluation
                    </h2>
                    {[
                        { key: 'sweetness', label: 'Sweetness', value: sweetness, onChange: setSweetness, color: 'bg-amber-600', desc: ['Barely', 'Subtle', 'Balanced', 'Sweet', 'Very Sweet'][sweetness - 1] },
                        ...(isCoffeeBase ? [{ key: 'strength', label: 'Coffee Strength', value: coffeeStrength, onChange: setCoffeeStrength, color: 'bg-amber-800', desc: ['Mild', 'Light-Med', 'Medium', 'Bold', 'Very Bold'][coffeeStrength - 1] }] : []),
                        { key: 'creaminess', label: 'Body / Texture', value: creaminess, onChange: setCreaminess, color: 'bg-sky-600', desc: ['Light / Tea-like', 'Smooth', 'Medium', 'Silky / Creamy', 'Heavy / Rich'][creaminess - 1] }
                    ].map((m) => (
                        <div key={m.key} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-md-on-surface">{m.label}</span>
                                <span className="text-[11px] text-md-on-surface-variant font-bold">{m.desc}</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => m.onChange(level)}
                                        className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            m.value === level
                                                ? `${m.color} text-white shadow-sm`
                                                : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'
                                        }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                {/* Flavor Tags */}
                <section className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-md-on-surface-variant">
                        Flavor Descriptors
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_DRINK_TAGS.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-md-primary text-md-on-primary shadow-sm'
                                            : 'bg-md-surface-container-high text-md-on-surface hover:bg-md-surface-container-highest'
                                    }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Notes Input */}
                <div className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-2">
                    <label className="text-xs font-bold text-md-on-surface-variant uppercase tracking-wider block" htmlFor="drink-notes">
                        Tasting Notes & Observations
                    </label>
                    <textarea
                        id="drink-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-md-outline-variant/30 bg-md-surface-container-high p-3.5 text-xs text-md-on-surface placeholder:text-md-on-surface-variant/70 focus:ring-2 focus:ring-md-primary/40 shadow-sm resize-none outline-none leading-relaxed"
                        placeholder="Texture, temperature balance, milk foam quality, pairing thoughts..."
                    />
                </div>
            </main>

            {/* Sticky Save CTA */}
            <SaveBar
                onClick={handleSave}
                saving={saving}
                label="Save to Journal"
                icon="bookmark"
                iconStyle={{ fontVariationSettings: "'FILL' 1" }}
            />
        </div>
    );
};
