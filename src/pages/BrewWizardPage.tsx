import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { WizardRow } from '../components/WizardRow';
import { brewService, pantryService } from '../core/services';
import { suggestMethods } from '../shared/utils/beanMatching';
import { daysOffRoast, freshnessLabel } from '../shared/utils/beanFreshness';
import type { BrewingMethod, Recipe } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';

export const BrewWizardPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const beanId = searchParams.get('beanId') ?? '';
    const methodId = searchParams.get('methodId') ?? '';
    const step = beanId ? (methodId ? 3 : 2) : 1;

    const [beans, setBeans] = useState<PantryItem[]>([]);
    const [methods, setMethods] = useState<BrewingMethod[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [items, allMethods, allRecipes] = await Promise.all([
                    pantryService.getPantryItems(),
                    brewService.getAllMethods(),
                    brewService.getAllRecipes()
                ]);
                setBeans(items.filter(item => item.category === 'beans' && !item.deleted_at));
                setMethods(allMethods);
                setRecipes(allRecipes);
            } catch (error) {
                console.error('Failed to load brew wizard data:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const bean = beans.find(b => b.id === beanId);
    const method = methods.find(m => m.id === methodId);
    const suggestions = suggestMethods(bean?.tags_json ?? [], recipes);
    const methodRecipes = recipes.filter(recipe => recipe.method_id === methodId);

    const stepTitle = step === 1 ? 'Which bean?' : step === 2 ? 'Which method?' : 'Which recipe?';
    const context = step === 2 ? bean?.name : step === 3 && bean ? `${bean.name} · ${method?.name ?? ''}` : undefined;

    const beanSubtitle = (item: PantryItem) => {
        const days = daysOffRoast(item.roast_date);
        const parts = [
            days !== null ? `${days} days off roast · ${freshnessLabel(days)}` : null,
            (item.tags_json ?? []).slice(0, 2).join(' · ') || null
        ].filter(Boolean);
        return parts.join(' · ');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-16">
            <PageHeader title="New Brew" onBack={() => navigate(-1)} />

            <div className="px-5 py-4 border-b border-md-outline-variant/20 space-y-1">
                <div className="flex justify-center gap-1.5 mb-2" aria-hidden="true">
                    {[1, 2, 3].map(i => (
                        <span key={i} className={`size-1.5 rounded-full ${i <= step ? 'bg-md-primary' : 'bg-md-outline-variant/40'}`} />
                    ))}
                </div>
                <h1 className="typescale-headline-small font-bold text-md-on-surface text-center">{stepTitle}</h1>
                {context && <p className="typescale-body-small text-md-on-surface-variant text-center truncate">{context}</p>}
            </div>

            <main className="flex-1 px-5 pt-4 space-y-4">
                {step === 1 && (
                    beans.length > 0 ? (
                        beans.map(item => (
                            <WizardRow
                                key={item.id}
                                title={item.name}
                                subtitle={beanSubtitle(item)}
                                icon={item.icon}
                                onClick={() => navigate(`/brew-wizard?beanId=${item.id}`)}
                            />
                        ))
                    ) : (
                        <div className="rounded-xl bg-md-surface-container-low p-6 border border-dashed border-md-outline-variant text-center space-y-3">
                            <p className="typescale-body-medium text-md-on-surface-variant">Add a bean to your pantry to start brewing.</p>
                            <button
                                onClick={() => navigate('/pantry/add/beans')}
                                className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                            >
                                Add beans
                            </button>
                        </div>
                    )
                )}

                {step === 2 && bean && (
                    <>
                        {suggestions.length > 0 && (
                            <section className="space-y-2">
                                <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">
                                    Suggested for {bean.name}
                                </h2>
                                {suggestions.map(suggestion => {
                                    const m = methods.find(mm => mm.id === suggestion.methodId);
                                    if (!m) return null;
                                    return (
                                        <WizardRow
                                            key={suggestion.methodId}
                                            title={m.name}
                                            subtitle={suggestion.reason}
                                            icon={m.icon}
                                            image={`/assets/methods/${m.id}.png`}
                                            onClick={() => navigate(`/brew-wizard?beanId=${bean.id}&methodId=${m.id}`)}
                                        />
                                    );
                                })}
                            </section>
                        )}
                        <section className="space-y-2">
                            <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">
                                All methods
                            </h2>
                            {methods.map(m => (
                                <WizardRow
                                    key={m.id}
                                    title={m.name}
                                    subtitle={`${recipes.filter(r => r.method_id === m.id).length} recipes`}
                                    icon={m.icon}
                                    image={`/assets/methods/${m.id}.png`}
                                    onClick={() => navigate(`/brew-wizard?beanId=${bean.id}&methodId=${m.id}`)}
                                />
                            ))}
                        </section>
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
                                    onClick={() => navigate(`/recipes/${recipe.id}/prepare?beanId=${bean.id}`)}
                                />
                            ))
                        ) : (
                            <div className="rounded-xl bg-md-surface-container-low p-6 border border-dashed border-md-outline-variant text-center">
                                <p className="typescale-body-medium text-md-on-surface-variant">No recipes for this method yet.</p>
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
};
