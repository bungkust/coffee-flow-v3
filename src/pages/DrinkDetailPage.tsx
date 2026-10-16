import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import { getDrinkImage, parseList, parseIngredient } from '../shared/utils/drinks';
import { PageHeader } from '../components/PageHeader';
import { useSafeBack } from '../shared/utils/backNavigation';

export const DrinkDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const safeBack = useSafeBack();
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!drink) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-md-surface p-6 text-center">
                <Icon name="error" className="text-5xl text-md-error mb-4" />
                <h2 className="typescale-title-large font-bold text-md-on-surface">Drink not found</h2>
                <button
                    onClick={() => safeBack('/drinks')}
                    className="mt-4 text-md-primary font-bold hover:underline cursor-pointer"
                >
                    Back to previous page
                </button>
            </div>
        );
    }

    const ingredients = parseList(drink.ingredients_json);
    const instructions = parseList(drink.instructions_json);
    const isHot = drink.category.toLowerCase() === 'hot';
    const isCoffee = (drink.base_type || 'coffee') === 'coffee';

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header matching RecipeDetailPage */}
            <PageHeader
                title={drink.name}
                onBack={() => safeBack('/drinks')}
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

            {/* Main Content matching RecipeDetailPage */}
            <main className="flex-1 px-5 pt-4 space-y-4">
                {/* About Card matching RecipeDetailPage */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="typescale-label-medium text-md-primary font-bold uppercase tracking-wider bg-md-primary-container/40 px-3 py-1 rounded-full">
                            {isCoffee ? 'Coffee Base' : 'Non-Coffee'}
                        </span>
                        <span className="typescale-label-medium px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-md-secondary-container text-md-on-secondary-container flex items-center gap-1">
                            <Icon name={isHot ? 'local_fire_department' : 'ac_unit'} className="text-xs" />
                            {drink.category}
                        </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-md-outline-variant/20 shadow-sm">
                        <img
                            src={getDrinkImage(drink)}
                            alt={drink.name}
                            className="h-44 w-full object-cover"
                        />
                    </div>

                    <p className="typescale-body-medium text-md-on-surface-variant leading-relaxed">
                        Prepare this drink step by step, evaluate sensory notes, and automatically sync used pantry ingredients.
                    </p>
                </div>

                {/* Stats Card matching RecipeDetailPage */}
                <div className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/30 shadow-md-1">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name={isCoffee ? 'local_cafe' : 'eco'} className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">
                                {isCoffee ? 'Coffee' : 'Non-Coffee'}
                            </span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">
                                Base Type
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name={isHot ? 'local_fire_department' : 'ac_unit'} className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">
                                {drink.category}
                            </span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">
                                Serving
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name="format_list_bulleted" className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">
                                {ingredients.length} items
                            </span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">
                                Ingredients
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-md-surface-container-high border border-md-outline-variant/20">
                            <Icon name="timer" className="text-md-primary mb-1 text-xl" />
                            <span className="typescale-title-small font-bold text-md-on-surface">
                                {instructions.length} steps
                            </span>
                            <span className="typescale-label-small text-md-on-surface-variant/70 uppercase tracking-wider font-bold mt-0.5">
                                Preparation
                            </span>
                        </div>
                    </div>
                </div>

                {/* Ingredients Section */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                    <h3 className="typescale-label-large font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                        <Icon name="inventory_2" className="text-md-primary text-xl" />
                        Ingredients
                    </h3>
                    <div className="space-y-2 pt-1">
                        {ingredients.map((item, idx) => {
                            const parsed = parseIngredient(String(item));
                            const amountStr = parsed.amount !== null ? `${parsed.amount}${parsed.unit ? ` ${parsed.unit}` : ''}` : undefined;
                            return (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 rounded-xl bg-md-surface-container-high/60 border border-md-outline-variant/20"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <div className="size-2 rounded-full bg-md-primary shrink-0" />
                                        <span className="typescale-body-medium font-bold text-md-on-surface truncate">
                                            {parsed.name}
                                        </span>
                                    </div>
                                    {amountStr && (
                                        <span className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-2.5 py-0.5 rounded-full border border-md-primary/20 shrink-0">
                                            {amountStr}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Steps Section with Dotted Vertical Timeline matching RecipeDetailPage */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 mb-8">
                    <h3 className="typescale-label-large font-bold uppercase tracking-wider text-md-on-surface-variant mb-5 flex items-center gap-2">
                        <Icon name="format_list_numbered" className="text-md-primary text-xl" />
                        Preparation Steps
                    </h3>
                    <div className="relative pl-2 border-l-2 border-dashed border-md-outline-variant/40 space-y-8 ml-2">
                        {instructions.map((step, index) => (
                            <div key={index} className="relative pl-6 space-y-1.5">
                                <div
                                    className={`absolute -left-[17px] top-0 size-8 rounded-full typescale-label-medium font-bold flex items-center justify-center border-4 border-md-surface-container-low shadow-sm ${
                                        index === 0
                                            ? 'bg-md-primary text-md-on-primary'
                                            : 'bg-md-surface-container-highest text-md-on-surface-variant'
                                    }`}
                                >
                                    {index + 1}
                                </div>
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="typescale-title-medium font-bold text-md-on-surface flex-1 min-w-0 leading-snug">
                                        Step {index + 1}
                                    </h4>
                                </div>
                                <p className="typescale-body-small text-md-on-surface-variant leading-relaxed pt-0.5">
                                    {step}
                                </p>
                            </div>
                        ))}

                        {/* Finish Step matching RecipeDetailPage */}
                        <div className="relative pl-6 pt-2">
                            <div className="absolute -left-[15px] top-2 size-6 rounded-full bg-md-primary-container flex items-center justify-center border-4 border-md-surface-container-low">
                                <div className="size-2.5 bg-md-primary rounded-full" />
                            </div>
                            <div>
                                <h4 className="typescale-title-medium font-bold text-md-on-surface">Enjoy your drink!</h4>
                                <p className="typescale-body-small text-md-on-surface-variant mt-0.5 font-medium">
                                    Ready to serve and evaluate in your journal
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Action CTA matching RecipeDetailPage */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-md-surface/95 backdrop-blur-md border-t border-md-outline-variant/30 max-w-md mx-auto z-20">
                <button
                    onClick={() => navigate(`/drinks/${drink.id}/prepare`)}
                    className="w-full bg-md-primary text-md-on-primary font-bold py-3.5 rounded-full shadow-md-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer typescale-title-medium hover:bg-md-primary/90"
                >
                    <Icon name="play_circle" className="text-2xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                    Prepare Drink
                </button>
            </div>
        </div>
    );
};
