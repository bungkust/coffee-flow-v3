import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { drinkService } from '../core/services';
import type { Drink } from '../shared/domain/entities';
import { parseList } from '../shared/utils/drinks';

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
            <PageHeader title={drink.name} onBack={() => navigate(-1)} titleClassName="line-clamp-1" />

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

            <SaveBar
                onClick={() => navigate(`/drink-log/${drink.id}`)}
                disabled={!isDone}
                icon={isDone ? 'check' : 'lock'}
                label={isDone ? 'Finish & Log Drink' : 'Complete Steps to Log'}
            />
        </div>
    );
};
