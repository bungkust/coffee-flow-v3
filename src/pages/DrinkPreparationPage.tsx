import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
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

    if (!drink) return <div className="flex min-h-screen items-center justify-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;

    const steps = parseList(drink.instructions_json);
    const isDone = steps.every((_, index) => checked[index]);

    return (
        <div className="flex min-h-screen w-full max-w-md flex-col bg-white pb-28 font-display text-neutral-text shadow-2xl mx-auto">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white px-6 pb-4 pt-12">
                <button onClick={() => navigate(-1)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-50">
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <h1 className="text-lg font-bold">{drink.name}</h1>
            </div>

            <main className="space-y-4 px-6 py-6">
                <p className="text-sm text-gray-500">Work through each step, then log how it turned out.</p>
                {steps.map((step, index) => (
                    <button
                        key={step}
                        onClick={() => setChecked((current) => ({ ...current, [index]: !current[index] }))}
                        className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${checked[index] ? 'border-primary/20 bg-primary/5' : 'border-gray-100 bg-white'}`}
                    >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${checked[index] ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                            {checked[index] && <Icon name="check" className="text-[16px]" />}
                        </span>
                        <span className="text-sm font-bold">{step}</span>
                    </button>
                ))}
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-white p-6 border-t border-gray-100">
                <button
                    onClick={() => navigate(`/drink-log/${drink.id}`)}
                    disabled={!isDone}
                    className={`w-full rounded-xl py-4 font-bold ${isDone ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                    Finish & Log Drink
                </button>
            </div>
        </div>
    );
};
