import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { brewService, drinkService, pantryService } from '../core/services';
import { TasteEditor } from '../components/TasteEditor';
import { formatMethodName } from '../shared/utils/brewMath';
import { parseFlavorTags, serializeFlavorTags, type TasteProfileValues } from '../shared/utils/tasteProfile';
import type { BrewLogWithRecipe, DrinkLogWithDrink } from '../shared/domain/entities';

export const JournalDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') || 'brews';
    const navigate = useNavigate();

    const [log, setLog] = useState<BrewLogWithRecipe | DrinkLogWithDrink | null>(null);
    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [beanName, setBeanName] = useState<string | null>(null);
    const [profile, setProfile] = useState<TasteProfileValues>({});
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        if (!id) return;
        const getLog = () => type === 'brews' ? brewService.getLog(id) : drinkService.getLog(id);
        getLog().then((data) => {
            setLog(data);
            if (!data) return;
            setRating(data.rating || 0);
            setNotes(data.notes || '');
            const brewData = type === 'brews' ? (data as BrewLogWithRecipe) : null;
            if (brewData) {
                setProfile({ sweetness: brewData.sweetness, acidity: brewData.acidity, body: brewData.body, bitterness: brewData.bitterness });
                setTags(parseFlavorTags(brewData.flavor_tags));
            }
            const beanId = brewData?.bean_id;
            if (beanId) {
                pantryService.getPantryItems()
                    .then(items => setBeanName(items.find(item => item.id === beanId)?.name ?? null))
                    .catch(console.error);
            }
        });
    }, [id, type]);

    const handleSave = async () => {
        if (!log) return;
        setSaving(true);
        try {
            if (type === 'brews') {
                await brewService.updateLog(log.id, {
                    rating,
                    notes,
                    sweetness: profile.sweetness,
                    acidity: profile.acidity,
                    body: profile.body,
                    bitterness: profile.bitterness,
                    flavor_tags: serializeFlavorTags(tags)
                });
            } else {
                await drinkService.updateLog(log.id, rating, notes);
            }
            navigate(`/journal?tab=${type}`);
        } catch (error) {
            console.error('Failed to update log:', error);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!id) return;
        try {
            if (type === 'brews') await brewService.deleteLog(id);
            else await drinkService.deleteLog(id);
            navigate(`/journal?tab=${type}`);
        } catch (error) {
            console.error('Failed to delete log:', error);
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    if (!log) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const title = type === 'brews'
        ? ((log as BrewLogWithRecipe).recipe_name || 'Brew Log')
        : ((log as DrinkLogWithDrink).drink_name || 'Drink Log');

    const brewLog = type === 'brews' ? (log as BrewLogWithRecipe) : null;
    const brewedAt = new Date(brewLog ? brewLog.brewed_at : (log as DrinkLogWithDrink).logged_at)
        .toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const detailCells = (brewLog
        ? [
            { key: 'method', icon: 'coffee_maker', label: 'Method', value: formatMethodName(brewLog.method_id) },
            { key: 'ratio', icon: 'scale', label: 'Ratio', value: brewLog.ratio },
            { key: 'beans', icon: 'inventory_2', label: 'Beans', value: beanName ?? undefined },
            { key: 'brewed', icon: 'schedule', label: 'Brewed', value: brewedAt }
        ]
        : [
            { key: 'category', icon: 'local_cafe', label: 'Category', value: (log as DrinkLogWithDrink).category },
            { key: 'logged', icon: 'schedule', label: 'Logged', value: brewedAt }
        ]
    ).filter(cell => Boolean(cell.value));

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            <PageHeader
                title={title}
                onBack={() => navigate(-1)}
                titleClassName="truncate"
                action={(
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:text-md-error hover:bg-md-error-container/20 transition-colors cursor-pointer shrink-0"
                        title="Delete Entry"
                    >
                        <Icon name="delete" className="text-xl" />
                    </button>
                )}
            />

            <main className="flex-1 px-5 py-5 space-y-6">
                {detailCells.length > 0 && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-title-medium font-bold text-md-on-surface">{brewLog ? 'Brew Details' : 'Drink Details'}</h2>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                            {detailCells.map(cell => (
                                <div key={cell.key} className="min-w-0">
                                    <span className="flex items-center gap-1.5 typescale-label-small font-semibold uppercase tracking-wider text-md-on-surface-variant/70">
                                        <Icon name={cell.icon} className="text-base" />
                                        {cell.label}
                                    </span>
                                    <span className="mt-0.5 block truncate typescale-body-medium font-semibold text-md-on-surface">
                                        {cell.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3 text-center">
                    <span className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider block">Rating</span>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="p-1 transition-transform active:scale-95 cursor-pointer"
                            >
                                <Icon
                                    name="star"
                                    className={`text-3xl ${star <= rating ? 'text-amber-500' : 'text-md-outline-variant/40'}`}
                                    style={star <= rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {brewLog && (
                    <TasteEditor
                        profile={profile}
                        onProfileChange={setProfile}
                        tags={tags}
                        onTagsChange={setTags}
                    />
                )}

                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-2">
                    <label className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider block">Tasting Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={5}
                        className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl p-3.5 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none resize-none placeholder:text-md-on-surface-variant/50"
                        placeholder="Add tasting notes, acidity, body, or adjustments..."
                    />
                </div>

            </main>

            <SaveBar onClick={handleSave} saving={saving} label="Save Changes" />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Journal Entry?"
                message="Are you sure you want to delete this journal entry? This action cannot be undone."
                confirmText="Delete Entry"
                cancelText="Cancel"
                type="warning"
            />
        </div>
    );
};
