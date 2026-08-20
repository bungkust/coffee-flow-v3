import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';

const DRINK_IMAGES: Record<string, string> = {
    espresso: '/assets/drinks/espresso.png',
    cappuccino: '/assets/drinks/cappuccino.png',
    latte: '/assets/drinks/latte.png',
    flat_white: '/assets/drinks/flat_white.png',
    mocha: '/assets/drinks/mocha.png',
    cold_brew: '/assets/drinks/cold_brew.png',
    americano: '/assets/drinks/americano.png',
    macchiato: '/assets/drinks/espresso.png'
};

const parseList = (json: string): string[] => {
    try {
        return JSON.parse(json);
    } catch {
        return [];
    }
};

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
                        <h1 className="typescale-headline-small font-bold text-md-on-surface line-clamp-1">{drink.name}</h1>
                    </div>
                    <button
                        onClick={() => navigate(`/drinks/${drink.id}/edit`)}
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        aria-label="Edit drink"
                    >
                        <Icon name="edit" className="text-2xl" />
                    </button>
                </div>
            </header>

            <main className="flex-1 px-5 pt-4 space-y-4">
                <div className="overflow-hidden rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low shadow-md-1">
                    <img src={drink.image_url || DRINK_IMAGES[drink.id] || DRINK_IMAGES.espresso} alt={drink.name} className="h-48 w-full object-cover" />
                    <div className="p-5 space-y-2">
                        <span className="rounded-full bg-md-primary-container/40 px-3 py-1 typescale-label-medium font-bold uppercase tracking-wider text-md-primary">{drink.category}</span>
                        <p className="typescale-body-medium text-md-on-surface-variant leading-relaxed">Prepare this drink step by step, then save the result into your journal.</p>
                    </div>
                </div>

                <section className="rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low p-5 shadow-md-1 space-y-3">
                    <h2 className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Ingredients</h2>
                    <div className="space-y-2">
                        {ingredients.map((item) => (
                            <p key={item} className="typescale-body-medium font-medium text-md-on-surface flex items-center gap-2">
                                <span className="size-2 rounded-full bg-md-primary shrink-0" />
                                {item}
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
