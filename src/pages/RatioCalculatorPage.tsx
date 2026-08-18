import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
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
        <div className="flex min-h-screen w-full max-w-md flex-col bg-background-light font-display text-neutral-text shadow-2xl mx-auto">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-6 pb-4 pt-12">
                <button onClick={() => navigate(-1)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-50">
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <h1 className="text-xl font-bold">Ratio Calculator</h1>
            </div>
            <main className="space-y-6 px-6 py-8">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Coffee</label>
                    <div className="flex items-center gap-3">
                        <input type="number" min="0.1" step="0.1" value={coffee} onChange={(event) => setCoffee(Math.max(0.1, Number(event.target.value) || 0.1))} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                        <span className="font-bold text-gray-400">{unitSystem === 'metric' ? 'g' : 'oz'}</span>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Ratio</label>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-400">1:</span>
                        <input type="number" min="1" step="0.1" value={ratio} onChange={(event) => setRatio(Math.max(1, Number(event.target.value) || 1))} className="w-full rounded-xl bg-gray-50 px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                </div>
                <div className="rounded-xl bg-primary p-6 text-white shadow-lg shadow-primary/20">
                    <p className="text-sm font-semibold opacity-80">Target Water</p>
                    <p className="mt-1 text-5xl font-extrabold">{formatVolume(water, unitSystem)}</p>
                    <p className="mt-3 text-sm opacity-80">{coffeeLabel} coffee at 1:{ratioLabel}</p>
                </div>
            </main>
        </div>
    );
};
