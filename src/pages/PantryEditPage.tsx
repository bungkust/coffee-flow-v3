import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { TasteProfileFields } from '../components/TasteProfileFields';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { pantryService } from '../core/services';
import { PROCESS_OPTIONS, VARIETY_OPTIONS, SPECIES_OPTIONS, ROAST_LEVEL_OPTIONS, parseBeanTags, formatBeanTags } from '../features/pantry/domain/beanOptions';
import type { PantryItem } from '../features/pantry/domain/entities';

export const PantryEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [item, setItem] = useState<PantryItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [beanFields, setBeanFields] = useState({ species: '', origin: '', variety: '', process: '', altitude: '', roastLevel: '', producer: '', roastDate: '', sweet: '', acid: '', body: '', bitter: '' });

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
        if (item && item.category === 'beans') {
            const { fields } = parseBeanTags(item.tags_json || []);
            setBeanFields({ ...fields, roastDate: item.roast_date || '' });
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
            const updated: PantryItem = { ...item, updated_at: new Date().toISOString() };
            if (item.category === 'beans') {
                const { preserved } = parseBeanTags(item.tags_json || []);
                updated.roast_date = beanFields.roastDate.trim() || undefined;
                updated.tags_json = [...formatBeanTags(beanFields), ...preserved];
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
                <button onClick={() => navigate('/pantry')} className="mt-4 font-bold text-md-primary hover:underline cursor-pointer">
                    Back to pantry
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <PageHeader title="Edit Item" onBack={() => navigate(-1)} />

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

                    <Field label="Brand / Roastery">
                        <input
                            value={item.brand || ''}
                            onChange={(event) => setItem({ ...item, brand: event.target.value })}
                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40"
                        />
                    </Field>

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

                    <Field label="Notes">
                        <textarea
                            value={item.description || ''}
                            onChange={(event) => setItem({ ...item, description: event.target.value })}
                            rows={4}
                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium outline-none focus:ring-2 focus:ring-md-primary/40 resize-none"
                        />
                    </Field>
                </div>

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
