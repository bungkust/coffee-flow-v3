import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';

const parseList = (json: string): string[] => {
    try {
        return JSON.parse(json);
    } catch {
        return [];
    }
};

export const DrinkPreparationPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [drink, setDrink] = useState<Drink | null>(null);
    const [checked, setChecked] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (!id) return;
        drinkService.getDrink(id).then(setDrink).catch((error) => console.error('Failed to load drink:', error));
    }, [id]);

    if (!drink) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-md-surface">
                <div className="size-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const steps = parseList(drink.instructions_json);
    const isDone = steps.every((_, index) => checked[index]);

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-28">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 pb-3 px-5 border-b border-md-outline-variant/20">
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
            </header>

            <main className="flex-1 px-5 py-5 space-y-4">
                <p className="typescale-body-medium text-md-on-surface-variant">Work through each step, then log how it turned out.</p>
                <div className="space-y-3">
                    {steps.map((step, index) => (
                        <button
                            key={step}
                            onClick={() => setChecked((current) => ({ ...current, [index]: !current[index] }))}
                            className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all cursor-pointer shadow-md-1 ${
                                checked[index]
                                    ? 'bg-md-secondary-container text-md-on-secondary-container border-md-primary'
                                    : 'bg-md-surface-container-low text-md-on-surface border-md-outline-variant/30 hover:bg-md-surface-container-high'
                            }`}
                        >
                            <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                                checked[index] ? 'border-md-primary bg-md-primary text-md-on-primary' : 'border-md-outline-variant'
                            }`}>
                                {checked[index] && <Icon name="check" className="text-base font-bold" />}
                            </span>
                            <span className="typescale-body-medium font-bold flex-1">{step}</span>
                        </button>
                    ))}
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={() => navigate(`/drink-log/${drink.id}`)}
                    disabled={!isDone}
                    className="w-full"
                >
                    <Icon name={isDone ? "check" : "lock"} className="text-xl" />
                    <span>{isDone ? "Finish & Log Drink" : "Complete Steps to Log"}</span>
                </Button>
            </div>
        </div>
    );
};
