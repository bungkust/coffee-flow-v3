import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { settingsService } from '../core/services';
import { formatWeight, formatVolume, roundTo, type UnitSystem } from '../shared/utils/brewMath';

export const RatioCalculatorPage = () => {
    const navigate = useNavigate();
    const [coffee, setCoffee] = useState(18);
    const [ratio, setRatio] = useState(16);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
    const water = Math.round(Math.max(0, coffee) * Math.max(0, ratio));
    const coffeeLabel = formatWeight(roundTo(coffee, 1), unitSystem);
    const ratioLabel = Number.isInteger(ratio) ? ratio.toString() : ratio.toFixed(1);

    useEffect(() => {
        settingsService.getAppUnit().then(setUnitSystem);
    }, []);

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Header */}
            <PageHeader title="Ratio Calculator" onBack={() => navigate(-1)} />

            <main className="flex-1 px-5 py-6 space-y-5">
                <div className="rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low p-5 shadow-md-1 space-y-2">
                    <label className="typescale-label-medium text-md-on-surface-variant/80 font-bold uppercase tracking-wider block">Coffee Amount</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={coffee}
                            onChange={(event) => setCoffee(Math.max(0.1, Number(event.target.value) || 0.1))}
                            className="w-full rounded-xl bg-md-surface-container-high px-4 py-3 typescale-title-large font-bold text-md-on-surface outline-none focus:ring-2 focus:ring-md-primary/40 border border-md-outline-variant/30"
                        />
                        <span className="typescale-title-medium font-bold text-md-on-surface-variant">{unitSystem === 'metric' ? 'g' : 'oz'}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-md-outline-variant/30 bg-md-surface-container-low p-5 shadow-md-1 space-y-2">
                    <label className="typescale-label-medium text-md-on-surface-variant/80 font-bold uppercase tracking-wider block">Brew Ratio</label>
                    <div className="flex items-center gap-3">
                        <span className="typescale-title-medium font-bold text-md-on-surface-variant">1:</span>
                        <input
                            type="number"
                            min="1"
                            step="0.1"
                            value={ratio}
                            onChange={(event) => setRatio(Math.max(1, Number(event.target.value) || 1))}
                            className="w-full rounded-xl bg-md-surface-container-high px-4 py-3 typescale-title-large font-bold text-md-on-surface outline-none focus:ring-2 focus:ring-md-primary/40 border border-md-outline-variant/30"
                        />
                    </div>
                </div>

                <div className="rounded-2xl bg-md-primary text-md-on-primary p-6 shadow-md-2 space-y-1">
                    <p className="typescale-label-medium font-bold uppercase tracking-wider opacity-80">Target Water Amount</p>
                    <p className="typescale-headline-large font-extrabold">{formatVolume(water, unitSystem)}</p>
                    <p className="typescale-body-medium opacity-90 pt-1">{coffeeLabel} coffee at 1:{ratioLabel}</p>
                </div>
            </main>
        </div>
    );
};
