import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icons';
import { WizardRow } from './WizardRow';
import { brewService, pantryService, settingsService } from '../core/services';
import { suggestMethods } from '../shared/utils/beanMatching';
import { daysOffRoast, freshnessLabel } from '../shared/utils/beanFreshness';
import type { BrewingMethod, Recipe } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';

interface BrewWizardSheetProps {
    open: boolean;
    onClose: () => void;
}

/** Bottom-sheet brew wizard: bean → method → recipe, driven by component state. */
export const BrewWizardSheet = ({ open, onClose }: BrewWizardSheetProps) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [beanId, setBeanId] = useState('');
    const [methodId, setMethodId] = useState('');
    const [beans, setBeans] = useState<PantryItem[]>([]);
    const [methods, setMethods] = useState<BrewingMethod[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [preferredIds, setPreferredIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!open) return;
        setStep(1);
        setBeanId('');
        setMethodId('');
        setLoading(true);
        const load = async () => {
            try {
                const [items, allMethods, allRecipes, preferred] = await Promise.all([
                    pantryService.getPantryItems(),
                    brewService.getAllMethods(),
                    brewService.getAllRecipes(),
                    settingsService.getUserPreferredMethods()
                ]);
                setBeans(items.filter(item => item.category === 'beans' && !item.deleted_at));
                setMethods(allMethods);
                setRecipes(allRecipes);
                setPreferredIds(preferred);
            } catch (error) {
                console.error('Failed to load brew wizard data:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [open]);

    const bean = beans.find(b => b.id === beanId);
    const method = methods.find(m => m.id === methodId);
    const suggestions = suggestMethods(bean?.tags_json ?? [], recipes);
    const methodRecipes = recipes.filter(recipe => recipe.method_id === methodId);
    const equipment = preferredIds.flatMap(id => methods.filter(m => m.id === id));

    const stepTitle = step === 1 ? 'Which bean?' : step === 2 ? 'Which equipment?' : 'Which recipe?';
    const context = step === 2 ? bean?.name : step === 3 && bean ? `${bean.name} · ${method?.name ?? ''}` : undefined;

    const beanSubtitle = (item: PantryItem) => {
        const days = daysOffRoast(item.roast_date);
        const parts = [
            days !== null ? `${days} days off roast · ${freshnessLabel(days)}` : null,
            (item.tags_json ?? []).slice(0, 2).join(' · ') || null
        ].filter(Boolean);
        return parts.join(' · ');
    };

    const pickMethod = (id: string) => {
        setMethodId(id);
        setStep(3);
    };

    const goBack = () => {
        if (step === 3) {
            setMethodId('');
            setStep(2);
        } else if (step === 2) {
            setBeanId('');
            setStep(1);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="New Brew">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative flex w-full max-w-md flex-col max-h-[85vh] rounded-t-2xl bg-md-surface text-md-on-surface font-sans shadow-md-2">
                <div className="shrink-0 border-b border-md-outline-variant/20 px-5 pt-3 pb-3">
                    <button
                        onClick={step === 1 ? onClose : goBack}
                        className="size-8 -ml-2 mb-2 shrink-0 rounded-full flex items-center justify-center hover:bg-md-surface-container-high transition-colors cursor-pointer"
                        aria-label={step === 1 ? 'Close wizard' : 'Back'}
                    >
                        <Icon name={step === 1 ? 'close' : 'arrow_back'} className="text-xl" />
                    </button>
                    <h1 className="typescale-headline-small font-bold text-md-on-surface text-center">{stepTitle}</h1>
                    {context && <p className="typescale-body-small text-md-on-surface-variant text-center truncate">{context}</p>}
                    <div className="mt-3 flex gap-1.5" aria-hidden="true">
                        {[1, 2, 3].map(i => (
                            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-md-primary' : 'bg-md-outline-variant/40'}`} />
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                beans.length > 0 ? (
                                    beans.map(item => (
                                        <WizardRow
                                            key={item.id}
                                            title={item.name}
                                            subtitle={beanSubtitle(item)}
                                            icon={item.icon}
                                            onClick={() => {
                                                setBeanId(item.id);
                                                setMethodId('');
                                                setStep(2);
                                            }}
                                        />
                                    ))
                                ) : (
                                    <div className="rounded-xl bg-md-surface-container-low p-6 border border-dashed border-md-outline-variant text-center space-y-3">
                                        <p className="typescale-body-medium text-md-on-surface-variant">Add a bean to your pantry to start brewing.</p>
                                        <button
                                            onClick={() => {
                                                onClose();
                                                navigate('/pantry/add/beans');
                                            }}
                                            className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                                        >
                                            Add beans
                                        </button>
                                    </div>
                                )
                            )}

                            {step === 2 && bean && (
                                <>
                                    {equipment.length > 0 && (
                                        <section className="space-y-2">
                                            <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">
                                                Your equipment
                                            </h2>
                                            {equipment.map(m => (
                                                <WizardRow
                                                    key={m.id}
                                                    title={m.name}
                                                    subtitle={`${recipes.filter(r => r.method_id === m.id).length} recipes`}
                                                    icon={m.icon}
                                                    image={`/assets/methods/${m.id}.png`}
                                                    onClick={() => pickMethod(m.id)}
                                                />
                                            ))}
                                        </section>
                                    )}
                                    {suggestions.length > 0 && (
                                        <section className="space-y-2">
                                            <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">
                                                Suggested for {bean.name}
                                            </h2>
                                            {suggestions.slice(0, 2).map(suggestion => {
                                                const m = methods.find(mm => mm.id === suggestion.methodId);
                                                if (!m) return null;
                                                return (
                                                    <WizardRow
                                                        key={suggestion.methodId}
                                                        title={m.name}
                                                        subtitle={suggestion.reason}
                                                        icon={m.icon}
                                                        image={`/assets/methods/${m.id}.png`}
                                                        onClick={() => pickMethod(m.id)}
                                                    />
                                                );
                                            })}
                                        </section>
                                    )}
                                </>
                            )}

                            {step === 3 && method && bean && (
                                <section className="space-y-2">
                                    <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">
                                        {method.name} recipes
                                    </h2>
                                    {methodRecipes.length > 0 ? (
                                        methodRecipes.map(recipe => (
                                            <WizardRow
                                                key={recipe.id}
                                                title={recipe.name}
                                                subtitle={[recipe.ratio ? `Ratio ${recipe.ratio}` : null, recipe.grind_size, recipe.style].filter(Boolean).join(' · ')}
                                                icon={method.icon}
                                                image={`/assets/methods/${method.id}.png`}
                                                onClick={() => {
                                                    onClose();
                                                    navigate(`/recipes/${recipe.id}/prepare?beanId=${bean.id}`);
                                                }}
                                            />
                                        ))
                                    ) : (
                                        <div className="rounded-xl bg-md-surface-container-low p-6 border border-dashed border-md-outline-variant text-center">
                                            <p className="typescale-body-medium text-md-on-surface-variant">No recipes for this method yet.</p>
                                        </div>
                                    )}
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
