import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { brewService, drinkService, pantryService } from '../core/services';
import { TasteEditor } from '../components/TasteEditor';
import { TasteRatingSelector, getTasteRatingLabel } from '../components/TasteRatingSelector';
import { formatMethodName } from '../shared/utils/brewMath';
import { parseFlavorTags, serializeFlavorTags, type TasteProfileValues } from '../shared/utils/tasteProfile';
import type { BrewLogWithRecipe, DrinkLogWithDrink } from '../shared/domain/entities';
import { useSafeBack } from '../shared/utils/backNavigation';

export const JournalDetailPage = () => {
    const { type: paramType, id } = useParams<{ type?: string; id: string }>();
    const [searchParams] = useSearchParams();
    const type = paramType || searchParams.get('type') || 'brews';
    const navigate = useNavigate();
    const safeBack = useSafeBack();

    const [log, setLog] = useState<BrewLogWithRecipe | DrinkLogWithDrink | null>(null);
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState<number | undefined>(undefined);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [beanName, setBeanName] = useState<string | null>(null);
    const [profile, setProfile] = useState<TasteProfileValues>({});
    const [tags, setTags] = useState<string[]>([]);
    const [recipeExists, setRecipeExists] = useState<boolean | null>(null);

    useEffect(() => {
        if (!log) return;
        if (type === 'brews') {
            const bLog = log as BrewLogWithRecipe;
            if (bLog.recipe_id) {
                brewService.getRecipe(bLog.recipe_id)
                    .then(r => setRecipeExists(!!r))
                    .catch(() => setRecipeExists(false));
            }
        } else {
            const dLog = log as DrinkLogWithDrink;
            if (dLog.drink_id) {
                drinkService.getDrink(dLog.drink_id)
                    .then(d => setRecipeExists(!!d))
                    .catch(() => setRecipeExists(false));
            }
        }
    }, [log, type]);

    const handleBrewAgain = async () => {
        const brewData = log as BrewLogWithRecipe | null;
        if (!brewData?.recipe_id) return;
        // Auto-save any notes/rating edits before navigating
        try {
            await brewService.updateLog(brewData.id, {
                rating,
                notes,
                sweetness: profile.sweetness,
                acidity: profile.acidity,
                body: profile.body,
                bitterness: profile.bitterness,
                flavor_tags: serializeFlavorTags(tags)
            });
        } catch (err) {
            console.warn('Auto-save before brew again failed', err);
        }
        const url = brewData.bean_id
            ? `/recipes/${brewData.recipe_id}/prepare?beanId=${brewData.bean_id}`
            : `/recipes/${brewData.recipe_id}/prepare`;
        navigate(url);
    };

    const handleMakeAgain = async () => {
        const drinkData = log as DrinkLogWithDrink | null;
        if (!drinkData?.drink_id) return;
        try {
            await drinkService.updateLog(drinkData.id, { notes, rating });
        } catch (err) {
            console.warn('Auto-save before make again failed', err);
        }
        const url = drinkData.bean_id
            ? `/drinks/${drinkData.drink_id}/prepare?beanId=${drinkData.bean_id}`
            : `/drinks/${drinkData.drink_id}/prepare`;
        navigate(url);
    };

    useEffect(() => {
        if (!id) return;
        const getLog = () => type === 'brews' ? brewService.getLog(id) : drinkService.getLog(id);
        getLog()
            .then((data) => {
                setLog(data);
                if (!data) return;
                setRating(data.rating ?? undefined);
                setNotes(data.notes || '');
                const brewData = type === 'brews' ? (data as BrewLogWithRecipe) : null;
                const drinkData = type !== 'brews' ? (data as DrinkLogWithDrink) : null;
                if (brewData) {
                    setProfile({ sweetness: brewData.sweetness, acidity: brewData.acidity, body: brewData.body, bitterness: brewData.bitterness });
                    setTags(parseFlavorTags(brewData.flavor_tags));
                } else if (drinkData?.flavor_tags) {
                    setTags(parseFlavorTags(drinkData.flavor_tags));
                }
                const beanId = brewData?.bean_id || drinkData?.bean_id;
                if (beanId) {
                    pantryService.getPantryItems()
                        .then(items => setBeanName(items.find(item => item.id === beanId)?.name ?? null))
                        .catch(console.error);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
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
                await drinkService.updateLog(log.id, {
                    notes,
                    rating
                });
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

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!log) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface p-6 text-center">
                <Icon name="error" className="text-5xl text-md-error mb-4" />
                <h2 className="typescale-title-large font-bold text-md-on-surface">Log entry not found</h2>
                <button
                    onClick={() => safeBack(`/journal?tab=${type}`)}
                    className="mt-4 text-md-primary font-bold hover:underline cursor-pointer"
                >
                    Back to Journal
                </button>
            </div>
        );
    }

    const title = type === 'brews'
        ? ((log as BrewLogWithRecipe).recipe_name || 'Brew Log')
        : ((log as DrinkLogWithDrink).drink_name || 'Drink Log');

    const brewLog = type === 'brews' ? (log as BrewLogWithRecipe) : null;
    const drinkLog = type !== 'brews' ? (log as DrinkLogWithDrink) : null;
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
            { key: 'category', icon: 'local_cafe', label: 'Category', value: drinkLog?.category },
            { key: 'beans', icon: 'inventory_2', label: 'Beans', value: drinkLog?.bean_name || beanName || undefined },
            { key: 'milk', icon: 'water_drop', label: 'Milk', value: drinkLog?.milk_name },
            { key: 'logged', icon: 'schedule', label: 'Logged', value: brewedAt }
        ]
    ).filter(cell => Boolean(cell.value));

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            <PageHeader
                title={title}
                onBack={() => safeBack(`/journal?tab=${type}`)}
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
                        <div className="flex items-center justify-between">
                            <h2 className="typescale-title-medium font-bold text-md-on-surface">{brewLog ? 'Brew Details' : 'Drink Details'}</h2>
                            {brewLog && (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/recipes/${brewLog.recipe_id}`)}
                                    className="typescale-label-small font-bold text-md-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                    <span>View Recipe</span>
                                    <Icon name="chevron_right" className="text-base" />
                                </button>
                            )}
                        </div>
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

                        {/* CTA button inside details card */}
                        {brewLog && (
                            <button
                                type="button"
                                onClick={handleBrewAgain}
                                disabled={recipeExists === false}
                                className="w-full mt-2 py-3 px-4 rounded-xl bg-md-primary text-md-on-primary font-bold typescale-label-large flex items-center justify-center gap-2 hover:bg-md-primary/90 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <Icon name="play_arrow" style={{ fontVariationSettings: "'FILL' 1" }} />
                                <span>{recipeExists === false ? 'Recipe Not Found' : 'Brew This Recipe Again'}</span>
                            </button>
                        )}
                        {drinkLog && drinkLog.drink_id && (
                            <button
                                type="button"
                                onClick={handleMakeAgain}
                                disabled={recipeExists === false}
                                className="w-full mt-2 py-3 px-4 rounded-xl bg-md-primary text-md-on-primary font-bold typescale-label-large flex items-center justify-center gap-2 hover:bg-md-primary/90 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <Icon name="local_cafe" style={{ fontVariationSettings: "'FILL' 1" }} />
                                <span>{recipeExists === false ? 'Drink Not Found' : 'Make This Drink Again'}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Overall Taste Rating */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="typescale-title-medium font-bold text-md-on-surface">Overall Impression</h2>
                        {rating ? (
                            <span className="typescale-label-medium font-bold text-md-primary">
                                {getTasteRatingLabel(rating)}
                            </span>
                        ) : (
                            <span className="typescale-label-small font-medium text-md-on-surface-variant/60">
                                Optional
                            </span>
                        )}
                    </div>
                    <TasteRatingSelector value={rating} onChange={setRating} />
                </div>

                {brewLog && (
                    <TasteEditor
                        profile={profile}
                        onProfileChange={setProfile}
                        tags={tags}
                        onTagsChange={setTags}
                    />
                )}

                {drinkLog && (drinkLog.sweetness != null || drinkLog.coffee_strength != null || drinkLog.creaminess != null || tags.length > 0) && (
                    <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                        <h2 className="typescale-title-medium font-bold text-md-on-surface">Sensory & Flavor</h2>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                                { label: 'Sweetness', val: drinkLog.sweetness },
                                { label: 'Strength', val: drinkLog.coffee_strength },
                                { label: 'Body', val: drinkLog.creaminess },
                            ].filter(m => m.val != null).map(m => (
                                <div key={m.label} className="p-2.5 rounded-xl bg-md-surface-container-high/60 border border-md-outline-variant/20">
                                    <span className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider block">{m.label}</span>
                                    <span className="text-sm font-bold text-md-on-surface mt-0.5 block">{m.val}/5</span>
                                </div>
                            ))}
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {tags.map(t => (
                                    <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-md-secondary-container text-md-on-secondary-container">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
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

            {/* Bottom Actions Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-4 border-t border-md-outline-variant/30">
                <div className="flex gap-3 w-full">
                    {brewLog ? (
                        <button
                            type="button"
                            onClick={handleBrewAgain}
                            disabled={recipeExists === false}
                            className="flex-1 py-3.5 px-4 rounded-full bg-md-primary text-md-on-primary font-bold typescale-label-large flex items-center justify-center gap-2 hover:bg-md-primary/90 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Icon name="play_arrow" style={{ fontVariationSettings: "'FILL' 1" }} />
                            <span>Brew Again</span>
                        </button>
                    ) : drinkLog?.drink_id ? (
                        <button
                            type="button"
                            onClick={handleMakeAgain}
                            disabled={recipeExists === false}
                            className="flex-1 py-3.5 px-4 rounded-full bg-md-primary text-md-on-primary font-bold typescale-label-large flex items-center justify-center gap-2 hover:bg-md-primary/90 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Icon name="local_cafe" style={{ fontVariationSettings: "'FILL' 1" }} />
                            <span>Make Again</span>
                        </button>
                    ) : null}

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className={`py-3.5 px-4 rounded-full font-bold typescale-label-large flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 ${
                            brewLog || drinkLog?.drink_id
                                ? 'flex-1 bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface border border-md-outline-variant/30'
                                : 'w-full bg-md-primary text-md-on-primary hover:bg-md-primary/90'
                        }`}
                    >
                        <Icon name="save" className="text-lg" />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>

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
