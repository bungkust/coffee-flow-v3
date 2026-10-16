import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import { getDrinkImage, parseList } from '../shared/utils/drinks';
import { PageHeader } from '../components/PageHeader';

const formatIngredient = (item: unknown): string =>
    typeof item === 'object' && item !== null && 'name' in (item as Record<string, unknown>)
        ? `${(item as { amount?: number; unit?: string; name: string }).amount ?? ''} ${(item as { amount?: number; unit?: string; name: string }).unit ?? ''} ${(item as { amount?: number; unit?: string; name: string }).name}`.replace(/\s+/g, ' ').trim()
        : String(item);

export const DrinkDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [drink, setDrink] = useState<Drink | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDrink = async () => {
            if (!id) return;
            try {
                setDrink(await drinkService.getDrink(id));
            } catch (error) {
                console.error('Failed to load drink:', error);
            } finally {
                setLoading(false);
            }
        };
        loadDrink();
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!drink) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-md-surface p-6 text-center">
                <Icon name="error" className="mb-4 text-5xl text-md-error" />
                <h1 className="typescale-title-large font-bold text-md-on-surface">Drink not found</h1>
                <button onClick={() => navigate(-1)} className="mt-4 font-bold text-md-primary hover:underline cursor-pointer">Back to previous page</button>
            </div>
        );
    }

    const ingredients = parseList(drink.ingredients_json);
    const instructions = parseList(drink.instructions_json);

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <PageHeader
                title={drink.name}
                onBack={() => navigate(-1)}
                titleClassName="line-clamp-1"
                action={(
                    <button
                        onClick={() => navigate(`/drinks/${drink.id}/edit`)}
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        aria-label="Edit drink"
                    >
                        <Icon name="edit" className="text-2xl" />
                    </button>
                )}
            />

            <main className="flex-1 px-5 pt-4 space-y-4">
                <div className="overflow-hidden rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low shadow-md-1">
                    <img src={getDrinkImage(drink)} alt={drink.name} className="h-48 w-full object-cover" />
                    <div className="p-5 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-md-primary-container/40 px-3 py-1 typescale-label-medium font-bold uppercase tracking-wider text-md-primary">
                                {drink.category}
                            </span>
                            <span className={`rounded-full px-3 py-1 typescale-label-medium font-bold uppercase tracking-wider ${
                                (drink.base_type || 'coffee') === 'coffee'
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                            }`}>
                                {(drink.base_type || 'coffee') === 'coffee' ? '☕ Coffee Base' : '🍵 Non-Coffee'}
                            </span>
                        </div>
                        <p className="typescale-body-medium text-md-on-surface-variant leading-relaxed">Prepare this drink step by step, then save the result into your journal.</p>
                    </div>
                </div>

                <section className="rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low p-5 shadow-md-1 space-y-3">
                    <h2 className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Ingredients</h2>
                    <div className="space-y-2">
                        {ingredients.map((item, idx) => (
                            <p key={idx} className="typescale-body-medium font-medium text-md-on-surface flex items-center gap-2">
                                <span className="size-2 rounded-full bg-md-primary shrink-0" />
                                {formatIngredient(item)}
                            </p>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low p-5 shadow-md-1 space-y-3">
                    <h2 className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Steps</h2>
                    <div className="space-y-3">
                        {instructions.map((step, index) => (
                            <div key={step} className="flex gap-3 items-start">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-md-primary-container text-md-on-primary-container typescale-label-medium font-bold">{index + 1}</span>
                                <p className="typescale-body-medium text-md-on-surface leading-relaxed pt-0.5">{step}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={() => navigate(`/drinks/${drink.id}/prepare`)}
                    className="w-full"
                >
                    <Icon name="play_circle" className="text-xl" />
                    <span>Make Drink</span>
                </Button>
            </div>
        </div>
    );
};
