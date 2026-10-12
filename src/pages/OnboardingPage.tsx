import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { Dropdown } from '../components/Dropdown';
import { QuantityField } from '../components/QuantityField';
import { settingsService, pantryService, brewService } from '../core/services';
import { VARIETY_OPTIONS, PROCESS_OPTIONS, ROAST_LEVEL_OPTIONS, formatBeanTags, buildBlendTags, parseQuantity } from '../features/pantry/domain/beanOptions';
import type { UnitSystem } from '../shared/utils/brewMath';
import type { BrewingMethod } from '../shared/domain/entities';

const CATEGORIES = [
    'Pressure Brewing Methods',
    'Drip, Flow & Gravity Brewing Methods',
    'Full Immersion (Steeping) Methods',
    'Vacuum, Special & Percolation Methods',
    'Hybrid & Portable Methods',
] as const;

const CATEGORY_ICONS: Record<string, string> = {
    'Pressure Brewing Methods': 'speed',
    'Drip, Flow & Gravity Brewing Methods': 'water_drop',
    'Full Immersion (Steeping) Methods': 'waves',
    'Vacuum, Special & Percolation Methods': 'science',
    'Hybrid & Portable Methods': 'tune',
};

function getCategoryFallback(id: string): string {
    if (['espresso', 'moka_pot', 'aeropress', 'keurig'].includes(id)) return 'Pressure Brewing Methods';
    if (['v60', 'kalita', 'chemex', 'drip_machine', 'phin', 'south_indian_filter'].includes(id)) return 'Drip, Flow & Gravity Brewing Methods';
    if (['french_press', 'cold_brew', 'turkish', 'dallah', 'jebena', 'tubruk'].includes(id)) return 'Full Immersion (Steeping) Methods';
    if (['cold_drip', 'siphon', 'sock_coffee', 'percolator', 'clover'].includes(id)) return 'Vacuum, Special & Percolation Methods';
    return 'Hybrid & Portable Methods';
}

const MethodImage = ({ src, alt, icon }: { src: string; alt: string; icon?: string }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !src) {
        return (
            <div className="flex items-center justify-center w-full h-full text-md-primary">
                <Icon name={icon || 'coffee'} className="text-2xl" style={{ fontVariationSettings: "'FILL' 1" }} />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain p-1"
            onError={() => setFailed(true)}
        />
    );
};

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'name' | 'equipment' | 'beans'>('name');

    // Step 1 State
    const [name, setName] = useState('');
    const [brewingGoal, setBrewingGoal] = useState('');
    const [appUnit, setAppUnit] = useState<UnitSystem>('metric');

    // Step 2 State
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
    const [allMethods, setAllMethods] = useState<(BrewingMethod & { image: string; category: string })[]>([]);

    useEffect(() => {
        const loadMethods = async () => {
            try {
                const methods = await brewService.getAllMethods();
                const cards = methods.map((m: BrewingMethod) => ({
                    ...m,
                    category: m.category || getCategoryFallback(m.id),
                    image: `/assets/methods/${m.id}.png`
                }));
                setAllMethods(cards);
            } catch (err) {
                console.error('Failed to load methods in onboarding:', err);
            }
        };
        loadMethods();
    }, []);

    // Step 3 State
    const [beanName, setBeanName] = useState('');
    const [roastery, setRoastery] = useState('');
    const [beanQuantity, setBeanQuantity] = useState('');
    const [origin, setOrigin] = useState('');
    const [variety, setVariety] = useState('');
    const [process, setProcess] = useState('');
    const [altitude, setAltitude] = useState('');
    const [roastLevel, setRoastLevel] = useState<'light' | 'medium' | 'dark'>('medium');
    const [roastDate, setRoastDate] = useState('');
    const [tastingNotes, setTastingNotes] = useState('');

    const [beanType, setBeanType] = useState<'single_origin' | 'blend'>('single_origin');
    const [blendComponents, setBlendComponents] = useState<Array<{ type: string; origin: string; percentage: string }>>([
        { type: 'Arabica', origin: '', percentage: '' }
    ]);

    useEffect(() => {
        const checkDone = async () => {
            try {
                if (await settingsService.isOnboardingComplete()) {
                    navigate('/home', { replace: true });
                }
            } catch {
                // Ignore
            }
        };
        checkDone();
    }, [navigate]);

    const toggleEquipment = (id: string) => {
        if (selectedEquipment.includes(id)) {
            setSelectedEquipment(selectedEquipment.filter((item) => item !== id));
        } else {
            setSelectedEquipment([...selectedEquipment, id]);
        }
    };

    const handleNext = async () => {
        if (step === 'name') {
            if (!name.trim()) return;
            await settingsService.setUserName(name.trim());
            await settingsService.setUserBrewingGoal(brewingGoal);
            await settingsService.setAppUnit(appUnit);
            setStep('equipment');
        } else if (step === 'equipment') {
            if (selectedEquipment.length < 1) return;
            await settingsService.setUserPreferredMethods(selectedEquipment);
            setStep('beans');
        } else if (step === 'beans') {
            if (beanName.trim()) {
                await pantryService.addPantryItem(beanName.trim(), 'beans', {
                    brand: roastery.trim() || undefined,
                    roast_date: roastDate || undefined,
                    description: tastingNotes.trim() || undefined,
                    quantity: parseQuantity(beanQuantity),
                    unit: 'g',
                    tags_json: [
                        ...formatBeanTags({ origin, variety, process, altitude, roastLevel }),
                        ...buildBlendTags(beanType === 'blend' ? blendComponents : [])
                    ]
                });
            }
            navigate('/home');
        }
    };

    const handleBack = () => {
        if (step === 'beans') setStep('equipment');
        else if (step === 'equipment') setStep('name');
        else navigate('/');
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Step 1: Profile Input */}
            {step === 'name' && (
                <div className="flex flex-col min-h-screen w-full">
                    <header className="flex items-center justify-between px-5 pt-10 pb-3 border-b border-md-outline-variant/20">
                        <button
                            onClick={handleBack}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <div className="flex gap-1.5">
                            <div className="h-2 w-8 rounded-full bg-md-primary"></div>
                            <div className="h-2 w-2 rounded-full bg-md-outline-variant/40"></div>
                            <div className="h-2 w-2 rounded-full bg-md-outline-variant/40"></div>
                        </div>
                        <div className="size-10"></div>
                    </header>

                    <main className="flex-1 flex flex-col px-5 pt-4 pb-28 space-y-6">
                        <div className="text-center space-y-1">
                            <p className="typescale-label-medium font-bold text-md-primary tracking-widest uppercase">Step 1 — Profile</p>
                            <h1 className="typescale-headline-medium font-bold text-md-on-surface">Let's get to know you</h1>
                            <p className="typescale-body-medium text-md-on-surface-variant max-w-xs mx-auto">
                                Help us tailor your coffee journey.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Name Input Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                    <Icon name="person" className="text-base" /> What should we call you?
                                </label>
                                <input
                                    className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:ring-2 focus:ring-md-primary/40 typescale-body-large outline-none"
                                    placeholder="Your Name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            {/* Brewing Goal Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                    <Icon name="flag" className="text-base" /> What brings you here?
                                </label>
                                <div className="space-y-2">
                                    {['Improve my skills', 'Discover new beans', 'Track my brews', 'Just exploring'].map((goalOption) => (
                                        <button
                                            key={goalOption}
                                            onClick={() => setBrewingGoal(goalOption)}
                                            className={`w-full p-3.5 rounded-xl text-left transition-all flex items-center justify-between border cursor-pointer ${
                                                brewingGoal === goalOption
                                                    ? 'bg-md-secondary-container text-md-on-secondary-container border-md-primary shadow-sm'
                                                    : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface hover:bg-md-surface-container-highest'
                                            }`}
                                        >
                                            <span className="typescale-title-small font-semibold">{goalOption}</span>
                                            {brewingGoal === goalOption && <Icon name="check_circle" className="text-md-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Metrics Used Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                    <Icon name="straighten" className="text-base" /> Metrics Used
                                </label>
                                <div className="flex justify-between gap-3">
                                    <button
                                        onClick={() => setAppUnit('metric')}
                                        className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-between typescale-label-medium font-bold transition-all border cursor-pointer ${
                                            appUnit === 'metric'
                                                ? 'bg-md-secondary-container border-md-primary text-md-on-secondary-container shadow-sm'
                                                : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface-variant hover:bg-md-surface-container-highest'
                                        }`}
                                    >
                                        <span>Metric (g/ml)</span>
                                        {appUnit === 'metric' && <Icon name="check_circle" className="text-md-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }} />}
                                    </button>
                                    <button
                                        onClick={() => setAppUnit('imperial')}
                                        className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-between typescale-label-medium font-bold transition-all border cursor-pointer ${
                                            appUnit === 'imperial'
                                                ? 'bg-md-secondary-container border-md-primary text-md-on-secondary-container shadow-sm'
                                                : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface-variant hover:bg-md-surface-container-highest'
                                        }`}
                                    >
                                        <span>Imperial (oz)</span>
                                        {appUnit === 'imperial' && <Icon name="check_circle" className="text-md-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </main>

                    <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                        <Button
                            variant="filled"
                            size="lg"
                            onClick={handleNext}
                            disabled={!name.trim() || !brewingGoal}
                            className="w-full"
                        >
                            <span>Next</span>
                            <Icon name="arrow_forward" className="text-xl" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Equipment Selection */}
            {step === 'equipment' && (
                <div className="flex flex-col min-h-screen w-full">
                    <header className="flex items-center justify-between px-5 pt-10 pb-3 border-b border-md-outline-variant/20">
                        <button
                            onClick={handleBack}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <div className="flex gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-md-outline-variant/40"></div>
                            <div className="h-2 w-8 rounded-full bg-md-primary"></div>
                            <div className="h-2 w-2 rounded-full bg-md-outline-variant/40"></div>
                        </div>
                        <div className="size-10"></div>
                    </header>

                    <main className="flex-1 flex flex-col px-5 pt-4 pb-28 space-y-4">
                        <div className="text-center space-y-1">
                            <p className="typescale-label-medium font-bold text-md-primary tracking-widest uppercase">Step 2 — Equipment</p>
                            <h1 className="typescale-headline-medium font-bold text-md-on-surface">What do you brew with?</h1>
                            <p className="typescale-body-medium text-md-on-surface-variant">
                                Select <span className="text-md-primary font-bold">at least 1</span> item to proceed. ({selectedEquipment.length} selected)
                            </p>
                        </div>

                        <div className="space-y-6">
                            {CATEGORIES.map((catName) => {
                                const catItems = allMethods.filter(m => m.category === catName);
                                if (catItems.length === 0) return null;

                                return (
                                    <section key={catName} className="space-y-2.5">
                                        <div className="flex items-center gap-2 border-b border-md-outline-variant/20 pb-1.5">
                                            <div className="size-6 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                                                <Icon name={CATEGORY_ICONS[catName] || 'coffee'} className="text-sm" />
                                            </div>
                                            <h2 className="typescale-label-large font-bold text-md-on-surface-variant uppercase tracking-wider">
                                                {catName}
                                            </h2>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {catItems.map((item) => {
                                                const isSelected = selectedEquipment.includes(item.id);
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => toggleEquipment(item.id)}
                                                        className={`group relative flex flex-col items-center justify-center p-3.5 rounded-xl transition-all active:scale-[0.98] border cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-md-secondary-container border-md-primary text-md-on-secondary-container shadow-md-1'
                                                                : 'bg-md-surface-container-low border-md-outline-variant/30 text-md-on-surface hover:bg-md-surface-container-high'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 text-md-primary">
                                                                <Icon name="check_circle" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                                            </div>
                                                        )}
                                                        <div className={`size-14 mb-2 rounded-lg flex items-center justify-center transition-colors overflow-hidden border border-md-outline-variant/20 ${
                                                            isSelected ? 'bg-md-primary-container' : 'bg-md-surface-container-highest'
                                                        }`}>
                                                            <MethodImage src={item.image} alt={item.name} icon={item.icon} />
                                                        </div>
                                                        <span className={`typescale-title-small text-center line-clamp-1 ${
                                                            isSelected ? 'text-md-on-secondary-container font-bold' : 'text-md-on-surface font-semibold'
                                                        }`}>
                                                            {item.name}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    </main>

                    <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                        <Button
                            variant="filled"
                            size="lg"
                            onClick={handleNext}
                            disabled={selectedEquipment.length < 1}
                            className="w-full"
                        >
                            <span>Next Step</span>
                            <Icon name="arrow_forward" className="text-xl" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Bean Inventory */}
            {step === 'beans' && (
                <div className="flex flex-col min-h-screen w-full">
                    <header className="flex items-center justify-between px-5 pt-10 pb-3 border-b border-md-outline-variant/20">
                        <button
                            onClick={handleBack}
                            className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                        >
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <div className="flex gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-md-outline-variant/40"></div>
                            <div className="h-2 w-2 rounded-full bg-md-outline-variant/40"></div>
                            <div className="h-2 w-8 rounded-full bg-md-primary"></div>
                        </div>
                        <button onClick={() => navigate('/home')} className="typescale-label-large font-bold text-md-primary hover:underline cursor-pointer">
                            Skip
                        </button>
                    </header>

                    <main className="flex-1 flex flex-col px-5 pt-4 pb-28 space-y-4">
                        <div className="text-center space-y-1">
                            <p className="typescale-label-medium font-bold text-md-primary tracking-widest uppercase">Step 3 — Beans</p>
                            <h1 className="typescale-headline-medium font-bold text-md-on-surface">Current Beans</h1>
                            <p className="typescale-body-medium text-md-on-surface-variant">
                                Tell us what you're brewing. We'll personalize recipe suggestions.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Identity Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                                <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">Identity</h2>
                                <div className="flex justify-between gap-3 pb-1">
                                    <button
                                        onClick={() => setBeanType('single_origin')}
                                        className={`flex-1 py-2.5 px-3 rounded-full flex items-center justify-center typescale-label-medium font-bold transition-all border cursor-pointer ${
                                            beanType === 'single_origin'
                                                ? 'bg-md-secondary-container border-md-primary text-md-on-secondary-container shadow-sm'
                                                : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface-variant hover:bg-md-surface-container-highest'
                                        }`}
                                    >
                                        Single Origin
                                    </button>
                                    <button
                                        onClick={() => setBeanType('blend')}
                                        className={`flex-1 py-2.5 px-3 rounded-full flex items-center justify-center typescale-label-medium font-bold transition-all border cursor-pointer ${
                                            beanType === 'blend'
                                                ? 'bg-md-secondary-container border-md-primary text-md-on-secondary-container shadow-sm'
                                                : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface-variant hover:bg-md-surface-container-highest'
                                        }`}
                                    >
                                        Blend
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1" htmlFor="bean-name">
                                            Bean Name <span className="text-md-error">*</span>
                                        </label>
                                        <input
                                            className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:ring-2 focus:ring-md-primary/40 typescale-body-medium outline-none"
                                            id="bean-name"
                                            placeholder={beanType === 'single_origin' ? "e.g. Aroma Nativo" : "e.g. Holiday Blend"}
                                            type="text"
                                            value={beanName}
                                            onChange={(e) => setBeanName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant" htmlFor="roastery">
                                            Roastery
                                        </label>
                                        <input
                                            className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:ring-2 focus:ring-md-primary/40 typescale-body-medium outline-none"
                                            id="roastery"
                                            placeholder="e.g. Cap Kadal"
                                            type="text"
                                            value={roastery}
                                            onChange={(e) => setRoastery(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant" htmlFor="bean-quantity">
                                            Quantity / Amount
                                        </label>
                                        <QuantityField value={beanQuantity} onChange={setBeanQuantity} unit="g" placeholder="e.g. 250" />
                                    </div>
                                </div>
                            </div>

                            {/* Origin & Details Card */}
                            {beanType === 'single_origin' ? (
                                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                                    <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">Single Origin Details</h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5 col-span-2">
                                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant" htmlFor="origin">
                                                Origin
                                            </label>
                                            <input
                                                className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:ring-2 focus:ring-md-primary/40 typescale-body-medium outline-none"
                                                id="origin"
                                                placeholder="e.g. Temanggung"
                                                type="text"
                                                value={origin}
                                                onChange={(e) => setOrigin(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Dropdown
                                                label="Variety"
                                                value={variety}
                                                options={VARIETY_OPTIONS}
                                                onChange={setVariety}
                                                placeholder="Select"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Dropdown
                                                label="Process"
                                                value={process}
                                                options={PROCESS_OPTIONS}
                                                onChange={setProcess}
                                                placeholder="Select"
                                            />
                                        </div>
                                        <div className="space-y-1.5 col-span-2">
                                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant" htmlFor="altitude">
                                                Altitude
                                            </label>
                                            <input
                                                className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:ring-2 focus:ring-md-primary/40 typescale-body-medium outline-none"
                                                id="altitude"
                                                placeholder="e.g. 1700 masl"
                                                type="text"
                                                value={altitude}
                                                onChange={(e) => setAltitude(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                                    <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">Blend Components</h2>
                                    <div className="space-y-3">
                                        {blendComponents.map((comp, index) => (
                                            <div key={index} className="space-y-3 p-3.5 bg-md-surface-container-high rounded-xl border border-md-outline-variant/30 relative">
                                                {blendComponents.length > 1 && (
                                                    <button
                                                        onClick={() => setBlendComponents(c => c.filter((_, i) => i !== index))}
                                                        className="absolute top-2 right-2 text-md-error hover:opacity-80 p-1 cursor-pointer"
                                                    >
                                                        <Icon name="close" className="text-base" />
                                                    </button>
                                                )}
                                                <p className="typescale-label-small font-bold text-md-on-surface-variant uppercase">Component {index + 1}</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Dropdown
                                                            buttonClassName="py-2 rounded-lg"
                                                            label="Type"
                                                            value={comp.type}
                                                            options={VARIETY_OPTIONS.slice(0, 4)}
                                                            onChange={(val) => {
                                                                const newComps = [...blendComponents];
                                                                newComps[index].type = val;
                                                                setBlendComponents(newComps);
                                                            }}
                                                            placeholder="Select"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="typescale-label-small font-bold uppercase text-md-on-surface-variant">Percentage</label>
                                                        <div className="relative">
                                                            <input
                                                                className="w-full bg-md-surface-container-low text-md-on-surface rounded-lg py-2 pl-3 pr-8 border border-md-outline-variant/30 text-sm focus:ring-1 focus:ring-md-primary/40 outline-none"
                                                                type="text"
                                                                placeholder="e.g. 70"
                                                                value={comp.percentage}
                                                                onChange={e => {
                                                                    const newComps = [...blendComponents];
                                                                    newComps[index].percentage = e.target.value.replace(/\D/g, '');
                                                                    setBlendComponents(newComps);
                                                                }}
                                                            />
                                                            <span className="absolute right-3 top-2 text-md-on-surface-variant text-sm">%</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 col-span-2">
                                                        <label className="typescale-label-small font-bold uppercase text-md-on-surface-variant">Origin / Region</label>
                                                        <input
                                                            className="w-full bg-md-surface-container-low text-md-on-surface rounded-lg py-2 px-3 border border-md-outline-variant/30 text-sm focus:ring-1 focus:ring-md-primary/40 outline-none"
                                                            type="text"
                                                            placeholder="e.g. Temanggung"
                                                            value={comp.origin}
                                                            onChange={e => {
                                                                const newComps = [...blendComponents];
                                                                newComps[index].origin = e.target.value;
                                                                setBlendComponents(newComps);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {blendComponents.length < 5 && (
                                            <button
                                                onClick={() => setBlendComponents([...blendComponents, { type: '', origin: '', percentage: '' }])}
                                                className="w-full py-2.5 flex items-center justify-center gap-2 typescale-label-medium font-bold text-md-primary hover:bg-md-primary-container/30 rounded-xl transition-colors border border-dashed border-md-primary/40 cursor-pointer"
                                            >
                                                <Icon name="add" className="text-base" /> Add Component
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Roast Info Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                                <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">Roast Profile</h2>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Dropdown
                                            label="Roast Level"
                                            value={roastLevel}
                                            options={ROAST_LEVEL_OPTIONS}
                                            onChange={(val) => setRoastLevel(val as 'light' | 'medium' | 'dark')}
                                            placeholder="Select Level"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant" htmlFor="roast-date">
                                            Roast Date
                                        </label>
                                        <input
                                            className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:ring-2 focus:ring-md-primary/40 typescale-body-medium outline-none"
                                            id="roast-date"
                                            type="date"
                                            value={roastDate}
                                            onChange={(e) => setRoastDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tasting Notes Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-2">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2" htmlFor="tasting-notes">
                                    <Icon name="local_florist" className="text-base" /> Tasting Notes
                                </label>
                                <textarea
                                    className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:ring-2 focus:ring-md-primary/40 typescale-body-medium outline-none min-h-[80px] resize-none"
                                    id="tasting-notes"
                                    placeholder="e.g. Peach, Berries, Jasmine"
                                    value={tastingNotes}
                                    onChange={(e) => setTastingNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </main>

                    <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                        <Button
                            variant="filled"
                            size="lg"
                            onClick={handleNext}
                            className="w-full"
                        >
                            <span>Finish Setup</span>
                            <Icon name="check_circle" className="text-xl" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
