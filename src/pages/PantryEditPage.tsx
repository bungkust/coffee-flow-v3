import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { pantryService } from '../core/services';
import type { PantryItem } from '../features/pantry/domain/entities';

export const PantryEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [item, setItem] = useState<PantryItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

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

    const handleSave = async () => {
        if (!item) return;
        if (!item.name.trim()) {
            setError('Item name is required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await pantryService.updatePantryItem({
                ...item,
                updated_at: new Date().toISOString()
            });
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
            <div className="flex min-h-screen items-center justify-center bg-background-light">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background-light p-6 text-center">
                <Icon name="error" className="mb-4 text-5xl text-red-400" />
                <h1 className="text-xl font-bold text-neutral-text">Item not found</h1>
                <button onClick={() => navigate('/pantry')} className="mt-4 font-bold text-primary">
                    Back to pantry
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-auto min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-background-light font-display text-neutral-text shadow-2xl mx-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 pb-4 pt-12">
                <button onClick={() => navigate(-1)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50">
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <h1 className="text-lg font-bold">Edit Item</h1>
                <button onClick={handleSave} disabled={saving} className="font-bold text-primary disabled:opacity-50">
                    {saving ? 'Saving' : 'Save'}
                </button>
            </div>

            <main className="space-y-5 px-6 py-6">
                {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}

                <Field label="Name">
                    <input
                        value={item.name}
                        onChange={(event) => setItem({ ...item, name: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                    />
                </Field>
                <Field label="Brand / Roastery">
                    <input
                        value={item.brand || ''}
                        onChange={(event) => setItem({ ...item, brand: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                    />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Quantity">
                        <input
                            type="number"
                            min="0"
                            value={item.quantity ?? ''}
                            onChange={(event) => setItem({ ...item, quantity: event.target.value ? Number(event.target.value) : undefined })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                        />
                    </Field>
                    <Field label="Unit">
                        <select
                            value={item.unit || ''}
                            onChange={(event) => setItem({ ...item, unit: event.target.value as PantryItem['unit'] })}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
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
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                    />
                </Field>
            </main>
        </div>
    );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">{label}</span>
        {children}
    </label>
);
