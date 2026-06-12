import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
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

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-background-light"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;

    if (!drink) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background-light p-6 text-center">
                <Icon name="error" className="mb-4 text-5xl text-red-400" />
                <h1 className="text-xl font-bold">Drink not found</h1>
                <button onClick={() => navigate('/drinks')} className="mt-4 font-bold text-primary">Back to drinks</button>
            </div>
        );
    }

    const ingredients = parseList(drink.ingredients_json);
    const instructions = parseList(drink.instructions_json);

    return (
        <div className="relative flex min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-background-light pb-28 font-display text-neutral-text shadow-2xl mx-auto">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-background-light/95 px-4 pb-3 pt-12 backdrop-blur-md">
                <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <h1 className="text-xl font-bold">{drink.name}</h1>
            </div>

            <main className="space-y-4 px-4 py-4">
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                    <img src={DRINK_IMAGES[drink.id] || DRINK_IMAGES.espresso} alt={drink.name} className="h-48 w-full object-cover" />
                    <div className="p-5">
                        <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary">{drink.category}</span>
                        <p className="mt-3 text-sm leading-relaxed text-gray-600">Prepare this drink step by step, then save the result into your journal.</p>
                    </div>
                </div>

                <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Ingredients</h2>
                    <div className="space-y-2">
                        {ingredients.map((item) => <p key={item} className="text-sm font-medium text-neutral-text">{item}</p>)}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Steps</h2>
                    <div className="space-y-3">
                        {instructions.map((step, index) => (
                            <div key={step} className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                                <p className="text-sm text-gray-600">{step}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-gradient-to-t from-background-light via-background-light/95 to-transparent p-4">
                <button onClick={() => navigate(`/drinks/${drink.id}/prepare`)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/25">
                    <Icon name="play_circle" />
                    Make Drink
                </button>
            </div>
        </div>
    );
};
