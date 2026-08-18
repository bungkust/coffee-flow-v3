import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
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
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                            aria-label="Go back"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <h1 className="typescale-headline-small font-bold text-md-on-surface">Edit Item</h1>
                    </div>
                </div>
            </header>

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
            </main>

            {/* Sticky Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                >
                    <Icon name="save" className="text-xl" />
                    <span>{saving ? 'Saving...' : 'Save Item'}</span>
                </Button>
            </div>
        </div>
    );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block space-y-1.5">
        <span className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant block">{label}</span>
        {children}
    </label>
);
