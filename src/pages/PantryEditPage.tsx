import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { TasteProfileFields } from '../components/TasteProfileFields';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { PantryItemLogs } from '../components/PantryItemLogs';
import { pantryService } from '../core/services';
import { PROCESS_OPTIONS, VARIETY_OPTIONS, SPECIES_OPTIONS, ROAST_LEVEL_OPTIONS, parseBeanTags, formatBeanTags } from '../features/pantry/domain/beanOptions';
import {
    PANTRY_CATEGORY_MAP,
    FILTER_SHAPE_OPTIONS,
    FILTER_MATERIAL_OPTIONS,
    MILK_TYPE_OPTIONS,
    SYRUP_FLAVOR_OPTIONS,
    SUGAR_TYPE_OPTIONS,
    OTHER_INGREDIENT_OPTIONS,
    DRIPPER_SHAPE_OPTIONS,
    GEAR_MATERIAL_OPTIONS,
    GRINDER_BURR_OPTIONS,
    GRINDER_DRIVE_OPTIONS,
    KETTLE_TYPE_OPTIONS,
    MACHINE_TYPE_OPTIONS,
    parseCategoryAttributes,
    formatCategoryAttributes,
    type CategoryAttributes
} from '../features/pantry/domain/pantryCategories';
import type { PantryItem } from '../features/pantry/domain/entities';
import { useSafeBack } from '../shared/utils/backNavigation';

export const PantryEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const [item, setItem] = useState<PantryItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [beanFields, setBeanFields] = useState({ species: '', origin: '', variety: '', process: '', altitude: '', roastLevel: '', producer: '', roastDate: '', sweet: '', acid: '', body: '', bitter: '' });
    const [categoryAttrs, setCategoryAttrs] = useState<CategoryAttributes>({});
    const [preservedTags, setPreservedTags] = useState<string[]>([]);

    useEffect(() => {
        const loadItem = async () => {
            if (!id) return;
            try {
                const data = await pantryService.getPantryItem(id);
                setItem(data);
            } catch (err) {
                console.error('Failed to load pantry item:', err);
            } finally {
                setLoading(false);
            }
        };
        loadItem();
    }, [id]);

    useEffect(() => {
        if (item) {
            if (item.category === 'beans') {
                const { fields } = parseBeanTags(item.tags_json || []);
                setBeanFields({ ...fields, roastDate: item.roast_date || '' });
            } else {
                const { attrs, preserved } = parseCategoryAttributes(item.tags_json || []);
                setCategoryAttrs(attrs);
                setPreservedTags(preserved);
            }
        }
    }, [item]);

    const handleSave = async () => {
        if (!item) return;
        if (!item.name.trim()) {
            setError('Item name is required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const isGear = PANTRY_CATEGORY_MAP[item.category]?.isGear;
            const updated: PantryItem = { ...item, updated_at: new Date().toISOString() };
            if (item.category === 'beans') {
                const { preserved } = parseBeanTags(item.tags_json || []);
                updated.roast_date = beanFields.roastDate.trim() || undefined;
                updated.tags_json = [...formatBeanTags(beanFields), ...preserved];
            } else {
                updated.tags_json = formatCategoryAttributes(categoryAttrs, preservedTags);
            }

            if (isGear) {
                updated.roast_date = undefined;
                updated.quantity = undefined;
                updated.unit = undefined;
            }

            await pantryService.updatePantryItem(updated);
            navigate('/pantry');
        } catch (err) {
            console.error('Failed to save pantry item:', err);
            setError('Failed to save item.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-md-surface p-6 text-center">
                <Icon name="error" className="mb-4 text-5xl text-md-error" />
                <h1 className="typescale-title-large font-bold text-md-on-surface">Item not found</h1>
                <button onClick={() => safeBack('/pantry')} className="mt-4 font-bold text-md-primary hover:underline cursor-pointer">
                    Back to pantry
                </button>
            </div>
        );
    }

    const isGear = PANTRY_CATEGORY_MAP[item.category]?.isGear;

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <PageHeader title={`Edit ${PANTRY_CATEGORY_MAP[item.category]?.name || 'Item'}`} onBack={() => safeBack('/pantry')} />

            <main className="flex-1 px-5 pt-4 space-y-6">
                {error && (
                    <div className="rounded-2xl border border-md-error/30 bg-md-error-container/30 px-4 py-3 typescale-body-medium font-bold text-md-error">
                        {error}
                    </div>
                )}

                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <Field label="Name">
                        <input
                            value={item.name}
                            onChange={(event) => setItem({ ...item, name: event.target.value })}
                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                        />
                    </Field>

                    <Field label={isGear ? 'Brand / Manufacturer' : 'Brand / Roastery'}>
                        <input
                            value={item.brand || ''}
                            onChange={(event) => setItem({ ...item, brand: event.target.value })}
                            placeholder={isGear ? 'e.g. Hario, Timemore, Fellow' : 'e.g. Oatside, Monin, Roastery'}
                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                        />
                    </Field>

                    {!isGear && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Quantity">
                                <input
                                    type="number"
                                    min="0"
                                    value={item.quantity ?? ''}
                                    onChange={(event) => setItem({ ...item, quantity: event.target.value ? Number(event.target.value) : undefined })}
                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                                />
                            </Field>

                            <Field label="Unit">
                                <select
                                    value={item.unit || ''}
                                    onChange={(event) => setItem({ ...item, unit: event.target.value as PantryItem['unit'] })}
                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                                >
                                    <option value="">None</option>
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="pcs">pcs</option>
                                    <option value="%">%</option>
                                </select>
                            </Field>
                        </div>
                    )}

                    <Field label={item.category === 'beans' ? 'Tasting Notes' : 'Notes & Description'}>
                        <textarea
                            value={item.description || ''}
                            onChange={(event) => setItem({ ...item, description: event.target.value })}
                            rows={3}
                            placeholder={item.category === 'beans' ? 'e.g. Jasmine, Peach, Honey...' : 'Any additional details...'}
                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40 resize-none"
                        />
                    </Field>
                </div>

                {/* Specific Category Fields */}
                {item.category === 'beans' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Bean Details</h2>

                        <Dropdown
                            label="Species"
                            value={beanFields.species}
                            options={SPECIES_OPTIONS}
                            onChange={(val) => setBeanFields({ ...beanFields, species: val })}
                            placeholder="Select"
                        />

                        <Field label="Origin">
                            <input
                                value={beanFields.origin}
                                onChange={(event) => setBeanFields({ ...beanFields, origin: event.target.value })}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Dropdown
                                label="Variety"
                                value={beanFields.variety}
                                options={VARIETY_OPTIONS}
                                onChange={(val) => setBeanFields({ ...beanFields, variety: val })}
                                placeholder="Select"
                            />
                            <Dropdown
                                label="Process"
                                value={beanFields.process}
                                options={PROCESS_OPTIONS}
                                onChange={(val) => setBeanFields({ ...beanFields, process: val })}
                                placeholder="Select"
                            />
                        </div>

                        <Field label="Altitude">
                            <input
                                value={beanFields.altitude}
                                onChange={(event) => setBeanFields({ ...beanFields, altitude: event.target.value })}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                            />
                        </Field>

                        <Field label="Producer">
                            <input
                                value={beanFields.producer}
                                onChange={(event) => setBeanFields({ ...beanFields, producer: event.target.value })}
                                placeholder="e.g. Argopuro Walida"
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                            />
                        </Field>

                        <TasteProfileFields
                            value={beanFields}
                            onChange={(field, val) => setBeanFields({ ...beanFields, [field]: val })}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Dropdown
                                label="Roast Level"
                                value={beanFields.roastLevel}
                                options={ROAST_LEVEL_OPTIONS}
                                onChange={(val) => setBeanFields({ ...beanFields, roastLevel: val })}
                                placeholder="Select"
                            />
                            <Field label="Roast Date">
                                <input
                                    type="date"
                                    value={beanFields.roastDate}
                                    onChange={(event) => setBeanFields({ ...beanFields, roastDate: event.target.value })}
                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                                />
                            </Field>
                        </div>
                    </div>
                )}

                {item.category === 'filter' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Filter Specifications</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <Dropdown
                                label="Shape / Size"
                                value={categoryAttrs.shape || ''}
                                options={FILTER_SHAPE_OPTIONS}
                                onChange={(val) => setCategoryAttrs({ ...categoryAttrs, shape: val })}
                                placeholder="Select"
                            />
                            <Dropdown
                                label="Material"
                                value={categoryAttrs.material || ''}
                                options={FILTER_MATERIAL_OPTIONS}
                                onChange={(val) => setCategoryAttrs({ ...categoryAttrs, material: val })}
                                placeholder="Select"
                            />
                        </div>
                    </div>
                )}

                {item.category === 'milk' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Milk Details</h2>
                        <Dropdown
                            label="Milk Type"
                            value={categoryAttrs.type || ''}
                            options={MILK_TYPE_OPTIONS}
                            onChange={(val) => setCategoryAttrs({ ...categoryAttrs, type: val })}
                            placeholder="Select"
                        />
                    </div>
                )}

                {item.category === 'syrup' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Syrup Details</h2>
                        <Dropdown
                            label="Flavor"
                            value={categoryAttrs.flavor || ''}
                            options={SYRUP_FLAVOR_OPTIONS}
                            onChange={(val) => setCategoryAttrs({ ...categoryAttrs, flavor: val })}
                            placeholder="Select"
                        />
                    </div>
                )}

                {item.category === 'sugar' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Sweetener Details</h2>
                        <Dropdown
                            label="Sweetener Type"
                            value={categoryAttrs.type || ''}
                            options={SUGAR_TYPE_OPTIONS}
                            onChange={(val) => setCategoryAttrs({ ...categoryAttrs, type: val })}
                            placeholder="Select"
                        />
                    </div>
                )}

                {item.category === 'other_ingredient' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Ingredient Details</h2>
                        <Dropdown
                            label="Ingredient Type"
                            value={categoryAttrs.type || ''}
                            options={OTHER_INGREDIENT_OPTIONS}
                            onChange={(val) => setCategoryAttrs({ ...categoryAttrs, type: val })}
                            placeholder="Select"
                        />
                    </div>
                )}

                {item.category === 'dripper' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Dripper Specifications</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <Dropdown
                                label="Shape"
                                value={categoryAttrs.shape || ''}
                                options={DRIPPER_SHAPE_OPTIONS}
                                onChange={(val) => setCategoryAttrs({ ...categoryAttrs, shape: val })}
                                placeholder="Select"
                            />
                            <Dropdown
                                label="Material"
                                value={categoryAttrs.material || ''}
                                options={GEAR_MATERIAL_OPTIONS}
                                onChange={(val) => setCategoryAttrs({ ...categoryAttrs, material: val })}
                                placeholder="Select"
                            />
                        </div>
                    </div>
                )}

                {item.category === 'grinder' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Grinder Specifications</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <Dropdown
                                label="Burr Type"
                                value={categoryAttrs.burr || ''}
                                options={GRINDER_BURR_OPTIONS}
                                onChange={(val) => setCategoryAttrs({ ...categoryAttrs, burr: val })}
                                placeholder="Select"
                            />
                            <Dropdown
                                label="Drive Mechanism"
                                value={categoryAttrs.drive || ''}
                                options={GRINDER_DRIVE_OPTIONS}
                                onChange={(val) => setCategoryAttrs({ ...categoryAttrs, drive: val })}
                                placeholder="Select"
                            />
                        </div>
                    </div>
                )}

                {item.category === 'kettle' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Kettle Specifications</h2>
                        <Dropdown
                            label="Kettle Type"
                            value={categoryAttrs.type || ''}
                            options={KETTLE_TYPE_OPTIONS}
                            onChange={(val) => setCategoryAttrs({ ...categoryAttrs, type: val })}
                            placeholder="Select"
                        />
                    </div>
                )}

                {item.category === 'machine' && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Machine Specifications</h2>
                        <Dropdown
                            label="Machine Type"
                            value={categoryAttrs.type || ''}
                            options={MACHINE_TYPE_OPTIONS}
                            onChange={(val) => setCategoryAttrs({ ...categoryAttrs, type: val })}
                            placeholder="Select"
                        />
                    </div>
                )}

                {['french_press', 'aeropress', 'scale', 'accessory'].includes(item.category) && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">Equipment Details</h2>
                        <Dropdown
                            label="Material / Build"
                            value={categoryAttrs.material || ''}
                            options={GEAR_MATERIAL_OPTIONS}
                            onChange={(val) => setCategoryAttrs({ ...categoryAttrs, material: val })}
                            placeholder="Select"
                        />
                    </div>
                )}

                {/* Stock Usage History (Only for Consumable Supplies) */}
                {!isGear && (
                    <div className="pt-2">
                        <h3 className="typescale-title-small font-bold text-md-on-surface mb-3 flex items-center gap-2">
                            <Icon name="history" className="text-md-primary" /> Stock History
                        </h3>
                        <PantryItemLogs itemId={item.id} unit={item.unit} />
                    </div>
                )}
            </main>

            {/* Sticky Bottom Actions */}
            <SaveBar onClick={handleSave} saving={saving} label="Save Item" />
        </div>
    );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block space-y-1.5">
        <span className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant block">{label}</span>
        {children}
    </label>
);
