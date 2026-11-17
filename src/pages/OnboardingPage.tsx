import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { MethodImage } from '../components/MethodImage';
import { QuantityField } from '../components/QuantityField';
import { SaveBar } from '../components/SaveBar';
import { TasteProfileFields } from '../components/TasteProfileFields';
import { settingsService, pantryService, brewService } from '../core/services';
import { PROCESS_OPTIONS, VARIETY_OPTIONS, SPECIES_OPTIONS, ROAST_LEVEL_OPTIONS, formatBeanTags, buildBlendTags, parseQuantity } from '../features/pantry/domain/beanOptions';
import type { BlendComponent } from '../features/pantry/domain/beanOptions';
import type { UnitSystem } from '../shared/utils/brewMath';
import type { BrewingMethod } from '../shared/domain/entities';
import { useBackHandler } from '../shared/utils/backNavigation';

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

const STEP_ORDER = ['name', 'equipment', 'beans', 'smart_import'] as const;

const GOAL_OPTIONS = [
    {
        id: 'Improve my skills',
        title: 'Improve brew precision',
        subtitle: 'Master extraction ratios, grind size, and water flow',
        icon: 'trending_up',
    },
    {
        id: 'Discover new beans',
        title: 'Track beans & roasters',
        subtitle: 'Log origins, varieties, and taste profile notes',
        icon: 'local_florist',
    },
    {
        id: 'Track my brews',
        title: 'Guided timers & scales',
        subtitle: 'Hands-free pour tracking with Bluetooth smart scales',
        icon: 'timer',
    },
    {
        id: 'Just exploring',
        title: 'Daily coffee ritual',
        subtitle: 'Simple, repeatable, delicious brews every morning',
        icon: 'coffee',
    },
] as const;

function StepProgress({ step }: { step: (typeof STEP_ORDER)[number] }) {
    const current = STEP_ORDER.indexOf(step);
    return (
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {STEP_ORDER.map((s, i) => (
                <span
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i <= current ? 'bg-md-primary shadow-xs' : 'bg-md-outline-variant/30'
                    }`}
                />
            ))}
        </div>
    );
}

function StepHeader({
    step,
    title,
    onBack,
    onSkip,
}: {
    step: (typeof STEP_ORDER)[number];
    title: string;
    onBack: () => void;
    onSkip?: () => void;
}) {
    return (
        <header className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3 border-b border-md-outline-variant/15 bg-md-surface/90 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="size-10 shrink-0 rounded-full flex items-center justify-center text-md-on-surface bg-md-surface-container-high/60 hover:bg-md-surface-container-highest active:scale-95 transition-all cursor-pointer"
                    aria-label="Back"
                >
                    <Icon name="arrow_back" className="text-xl" />
                </button>
                <h1 className="typescale-headline-small font-bold text-md-on-surface tracking-tight truncate flex-1">
                    {title}
                </h1>
                {onSkip ? (
                    <button
                        onClick={onSkip}
                        className="typescale-label-large font-bold text-md-primary hover:opacity-80 cursor-pointer px-2 py-1"
                    >
                        Skip
                    </button>
                ) : null}
            </div>
            <StepProgress step={step} />
        </header>
    );
}

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'name' | 'equipment' | 'beans' | 'smart_import'>('name');

    const [name, setName] = useState('');
    const [brewingGoal, setBrewingGoal] = useState('Improve my skills');
    const [appUnit, setAppUnit] = useState<UnitSystem>('metric');

    const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['v60']);
    const [allMethods, setAllMethods] = useState<(BrewingMethod & { image: string; category: string })[]>([]);

    useEffect(() => {
        const loadMethods = async () => {
            try {
                const methods = await brewService.getAllMethods();
                const cards = methods.map((m: BrewingMethod) => ({
                    ...m,
                    category: m.category || getCategoryFallback(m.id),
                    image: `/assets/methods/${m.id}.png`,
                }));
                setAllMethods(cards);
            } catch (err) {
                console.error('Failed to load methods in onboarding:', err);
            }
        };
        loadMethods();
    }, []);

    const [beanName, setBeanName] = useState('');
    const [roastery, setRoastery] = useState('');
    const [beanQuantity, setBeanQuantity] = useState('');
    const [species, setSpecies] = useState('');
    const [origin, setOrigin] = useState('');
    const [variety, setVariety] = useState('');
    const [process, setProcess] = useState('');
    const [altitude, setAltitude] = useState('');
    const [producer, setProducer] = useState('');
    const [roastLevel, setRoastLevel] = useState<'light' | 'medium' | 'dark'>('medium');
    const [roastDate, setRoastDate] = useState('');
    const [tastingNotes, setTastingNotes] = useState('');
    const [tasteProfile, setTasteProfile] = useState({ sweet: '', acid: '', body: '', bitter: '' });

    const [beanType, setBeanType] = useState<'single_origin' | 'blend'>('single_origin');
    const [blendComponents, setBlendComponents] = useState<BlendComponent[]>([
        { type: 'Arabica', origin: '', percentage: '', variety: '', process: '' },
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

    const [demoExtracted, setDemoExtracted] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    const handleRunDemoExtract = () => {
        setIsExtracting(true);
        setTimeout(() => {
            setIsExtracting(false);
            setDemoExtracted(true);
        }, 600);
    };

    const handleFinish = async () => {
        if (demoExtracted) {
            try {
                const now = new Date().toISOString();
                const recipeId = crypto.randomUUID();
                await brewService.saveRecipe({
                    id: recipeId,
                    method_id: 'v60',
                    name: 'The Ultimate V60 Technique',
                    ratio: '1:16.7',
                    temperature: 93,
                    grind_size: 'Medium-Fine',
                    difficulty: 'Intermediate',
                    total_water: 250,
                    description_short: 'A clean, balanced V60 pour-over with vibrant acidity and sweetness.',
                    description_detailed:
                        'Extracted YouTube brew technique: 45s bloom with 50g, steady spiral pour to 150g, and final pour to 250g with a gentle swirl.',
                    philosophy: 'Gentle saturation and consistent flow rate maximize flavor clarity.',
                    source: 'https://youtu.be/1oB1oDrDkQo',
                    best_for_tags: ['Light Roast', 'Fruity', 'Vibrant', 'Clean'],
                    not_recommended_tags: ['Very Dark Roast'],
                    steps: [
                        {
                            id: crypto.randomUUID(),
                            recipe_id: recipeId,
                            step_order: 1,
                            label: 'Bloom',
                            duration_seconds: 45,
                            target_weight: 50,
                            instruction: 'Pour 50g water evenly over grounds, swirl gently, and let bloom.',
                            created_at: now,
                            updated_at: now,
                        },
                        {
                            id: crypto.randomUUID(),
                            recipe_id: recipeId,
                            step_order: 2,
                            label: 'First Pour',
                            duration_seconds: 30,
                            target_weight: 150,
                            instruction: 'Pour in steady concentric circles until the scale reads 150g.',
                            created_at: now,
                            updated_at: now,
                        },
                        {
                            id: crypto.randomUUID(),
                            recipe_id: recipeId,
                            step_order: 3,
                            label: 'Final Pour & Drawdown',
                            duration_seconds: 45,
                            target_weight: 250,
                            instruction:
                                'Pour up to 250g. Give one gentle swirl to level bed, then let drawdown finish.',
                            created_at: now,
                            updated_at: now,
                        },
                    ],
                    is_custom: true,
                    is_favorite: true,
                    created_at: now,
                    updated_at: now,
                });
            } catch (err) {
                console.error('Failed to save demo recipe in onboarding:', err);
            }
        }
        navigate('/home');
    };

    const handleBack = () => {
        if (step === 'smart_import') setStep('beans');
        else if (step === 'beans') setStep('equipment');
        else if (step === 'equipment') setStep('name');
        else navigate('/', { replace: true });
    };

    useBackHandler(step !== 'name', () => {
        handleBack();
        return true;
    });

    const handleNext = async () => {
        if (step === 'name') {
            if (!name.trim()) return;
            await settingsService.setUserName(name.trim());
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
                        ...formatBeanTags({ species, origin, variety, process, altitude, roastLevel, producer, ...tasteProfile }),
                        ...buildBlendTags(beanType === 'blend' ? blendComponents : []),
                    ],
                });
            }
            setStep('smart_import');
        } else if (step === 'smart_import') {
            await handleFinish();
        }
    };

    return (
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Step 1: Profile Input */}
            {step === 'name' && (
                <div className="flex flex-col min-h-screen w-full">
                    <StepHeader step={step} title="Let's get to know you" onBack={handleBack} />

                    <main className="flex-1 flex flex-col px-5 pt-4 pb-28 space-y-5">
                        <p className="text-center typescale-body-medium text-md-on-surface-variant max-w-xs mx-auto">
                            Personalize your coffee journey and preferred brewing metrics.
                        </p>

                        <div className="space-y-4">
                            {/* Name Input Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-3">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                    <Icon name="person" className="text-base text-md-primary" /> What should we call you?
                                </label>
                                <input
                                    className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/60 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 typescale-body-large outline-none transition-all"
                                    placeholder="Your Name / Nickname"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Brewing Goal Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-3">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                    <Icon name="flag" className="text-base text-md-primary" /> What brings you here?
                                </label>
                                <div className="space-y-2">
                                    {GOAL_OPTIONS.map((goal) => {
                                        const isSelected = brewingGoal === goal.id;
                                        return (
                                            <button
                                                key={goal.id}
                                                type="button"
                                                onClick={() => setBrewingGoal(goal.id)}
                                                className={`w-full p-3.5 rounded-xl text-left transition-all flex items-center justify-between border cursor-pointer active:scale-[0.99] ${
                                                    isSelected
                                                        ? 'bg-md-primary/10 border-md-primary text-md-on-surface shadow-xs ring-1 ring-md-primary/25'
                                                        : 'bg-md-surface-container-high/60 border-md-outline-variant/30 text-md-on-surface hover:bg-md-surface-container-high'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 pr-2">
                                                    <div
                                                        className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                            isSelected
                                                                ? 'bg-md-primary text-white shadow-xs'
                                                                : 'bg-md-surface-container-highest text-md-on-surface-variant'
                                                        }`}
                                                    >
                                                        <Icon name={goal.icon} className="text-lg" />
                                                    </div>
                                                    <div>
                                                        <p className="typescale-title-small font-bold">{goal.title}</p>
                                                        <p className="text-[11px] text-md-on-surface-variant mt-0.5 line-clamp-1">
                                                            {goal.subtitle}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected ? (
                                                    <Icon
                                                        name="check_circle"
                                                        className="text-md-primary text-xl shrink-0"
                                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                                    />
                                                ) : (
                                                    <div className="size-5 rounded-full border-2 border-md-outline-variant/50 shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Metrics Used Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-3">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2">
                                    <Icon name="straighten" className="text-base text-md-primary" /> Units & Measurements
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAppUnit('metric')}
                                        className={`py-3 px-3.5 rounded-xl flex items-center justify-between typescale-label-medium font-bold transition-all border cursor-pointer ${
                                            appUnit === 'metric'
                                                ? 'bg-md-primary/10 border-md-primary text-md-on-surface shadow-xs ring-1 ring-md-primary/25'
                                                : 'bg-md-surface-container-high/60 border-md-outline-variant/30 text-md-on-surface-variant hover:bg-md-surface-container-high'
                                        }`}
                                    >
                                        <div className="flex flex-col text-left">
                                            <span>Metric</span>
                                            <span className="text-[10px] font-normal text-md-on-surface-variant">g, ml, °C</span>
                                        </div>
                                        {appUnit === 'metric' && (
                                            <Icon
                                                name="check_circle"
                                                className="text-md-primary text-lg"
                                                style={{ fontVariationSettings: "'FILL' 1" }}
                                            />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAppUnit('imperial')}
                                        className={`py-3 px-3.5 rounded-xl flex items-center justify-between typescale-label-medium font-bold transition-all border cursor-pointer ${
                                            appUnit === 'imperial'
                                                ? 'bg-md-primary/10 border-md-primary text-md-on-surface shadow-xs ring-1 ring-md-primary/25'
                                                : 'bg-md-surface-container-high/60 border-md-outline-variant/30 text-md-on-surface-variant hover:bg-md-surface-container-high'
                                        }`}
                                    >
                                        <div className="flex flex-col text-left">
                                            <span>Imperial</span>
                                            <span className="text-[10px] font-normal text-md-on-surface-variant">oz, °F</span>
                                        </div>
                                        {appUnit === 'imperial' && (
                                            <Icon
                                                name="check_circle"
                                                className="text-md-primary text-lg"
                                                style={{ fontVariationSettings: "'FILL' 1" }}
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </main>

                    <SaveBar
                        iconLast
                        icon="arrow_forward"
                        label="Next"
                        disabled={!name.trim()}
                        onClick={handleNext}
                    />
                </div>
            )}

            {/* Step 2: Equipment Selection */}
            {step === 'equipment' && (
                <div className="flex flex-col min-h-screen w-full">
                    <StepHeader step={step} title="What do you brew with?" onBack={handleBack} />

                    <main className="flex-1 flex flex-col px-5 pt-4 pb-28 space-y-4">
                        <p className="text-center typescale-body-medium text-md-on-surface-variant">
                            Select <span className="text-md-primary font-bold">at least 1</span> equipment to proceed. ({selectedEquipment.length} selected)
                        </p>

                        <div className="space-y-6">
                            {CATEGORIES.map((catName) => {
                                const catItems = allMethods.filter((m) => m.category === catName);
                                if (catItems.length === 0) return null;

                                return (
                                    <section key={catName} className="space-y-2.5">
                                        <div className="flex items-center gap-2 border-b border-md-outline-variant/20 pb-1.5">
                                            <div className="size-6 rounded-full bg-md-primary/15 text-md-primary flex items-center justify-center">
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
                                                        type="button"
                                                        onClick={() => toggleEquipment(item.id)}
                                                        className={`group relative flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all active:scale-[0.98] border cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-md-primary/10 border-md-primary text-md-on-surface shadow-xs ring-1 ring-md-primary/25'
                                                                : 'bg-md-surface-container-low border-md-outline-variant/30 text-md-on-surface hover:bg-md-surface-container-high'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute top-2.5 right-2.5 size-5 rounded-full bg-md-primary text-white flex items-center justify-center shadow-xs">
                                                                <Icon name="check" className="text-sm font-bold" />
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`size-14 mb-2 rounded-xl flex items-center justify-center transition-colors overflow-hidden border border-md-outline-variant/20 ${
                                                                isSelected
                                                                    ? 'bg-md-primary/20'
                                                                    : 'bg-md-surface-container-highest'
                                                            }`}
                                                        >
                                                            <MethodImage src={item.image} alt={item.name} icon={item.icon} size="sm" />
                                                        </div>
                                                        <span
                                                            className={`typescale-title-small text-center line-clamp-1 ${
                                                                isSelected
                                                                    ? 'text-md-on-surface font-bold'
                                                                    : 'text-md-on-surface-variant font-medium'
                                                            }`}
                                                        >
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

                    <SaveBar
                        iconLast
                        icon="arrow_forward"
                        label="Next Step"
                        disabled={selectedEquipment.length < 1}
                        onClick={handleNext}
                    />
                </div>
            )}

            {/* Step 3: Bean Inventory */}
            {step === 'beans' && (
                <div className="flex flex-col min-h-screen w-full">
                    <StepHeader step={step} title="Current Beans" onBack={handleBack} onSkip={() => setStep('smart_import')} />

                    <main className="flex-1 flex flex-col px-5 pt-4 pb-28 space-y-4">
                        <p className="text-center typescale-body-medium text-md-on-surface-variant">
                            Add beans you currently have to personalize your recipe and dose recommendations.
                        </p>

                        <div className="space-y-4">
                            {/* Identity Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-4">
                                <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">
                                    Bean Profile
                                </h2>
                                <div className="flex justify-between gap-3 pb-1">
                                    <button
                                        type="button"
                                        onClick={() => setBeanType('single_origin')}
                                        className={`flex-1 py-2 px-3 rounded-full flex items-center justify-center typescale-label-medium font-bold transition-all border cursor-pointer ${
                                            beanType === 'single_origin'
                                                ? 'bg-md-primary text-white border-md-primary shadow-xs'
                                                : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface-variant hover:bg-md-surface-container-highest'
                                        }`}
                                    >
                                        Single Origin
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBeanType('blend')}
                                        className={`flex-1 py-2 px-3 rounded-full flex items-center justify-center typescale-label-medium font-bold transition-all border cursor-pointer ${
                                            beanType === 'blend'
                                                ? 'bg-md-primary text-white border-md-primary shadow-xs'
                                                : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface-variant hover:bg-md-surface-container-highest'
                                        }`}
                                    >
                                        Blend
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label
                                            className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-1"
                                            htmlFor="bean-name"
                                        >
                                            Bean Name <span className="text-md-error">*</span>
                                        </label>
                                        <input
                                            className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 typescale-body-medium outline-none"
                                            id="bean-name"
                                            placeholder={beanType === 'single_origin' ? 'e.g. Ethiopia Guji Natural' : 'e.g. Signature House Blend'}
                                            type="text"
                                            value={beanName}
                                            onChange={(e) => setBeanName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Dropdown
                                            label="Species"
                                            value={species}
                                            options={SPECIES_OPTIONS}
                                            onChange={setSpecies}
                                            placeholder="Select Species"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant"
                                            htmlFor="roastery"
                                        >
                                            Roastery
                                        </label>
                                        <input
                                            className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 typescale-body-medium outline-none"
                                            id="roastery"
                                            placeholder="e.g. Giyanti Coffee / Common Grounds"
                                            type="text"
                                            value={roastery}
                                            onChange={(e) => setRoastery(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label
                                            className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant"
                                            htmlFor="bean-quantity"
                                        >
                                            Quantity / Amount
                                        </label>
                                        <QuantityField value={beanQuantity} onChange={setBeanQuantity} unit="g" placeholder="e.g. 250" />
                                    </div>
                                </div>
                            </div>

                            {/* Origin & Details Card */}
                            {beanType === 'single_origin' ? (
                                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-4">
                                    <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">
                                        Single Origin Details
                                    </h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5 col-span-2">
                                            <label
                                                className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant"
                                                htmlFor="origin"
                                            >
                                                Origin / Region
                                            </label>
                                            <input
                                                className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 typescale-body-medium outline-none"
                                                id="origin"
                                                placeholder="e.g. Temanggung, Central Java"
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
                                        <div className="space-y-1.5">
                                            <label
                                                className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant"
                                                htmlFor="altitude"
                                            >
                                                Altitude
                                            </label>
                                            <input
                                                className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 typescale-body-medium outline-none"
                                                id="altitude"
                                                placeholder="e.g. 1500 masl"
                                                type="text"
                                                value={altitude}
                                                onChange={(e) => setAltitude(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label
                                                className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant"
                                                htmlFor="producer"
                                            >
                                                Producer / Farm
                                            </label>
                                            <input
                                                className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 typescale-body-medium outline-none"
                                                id="producer"
                                                placeholder="e.g. Frinsa Estate"
                                                type="text"
                                                value={producer}
                                                onChange={(e) => setProducer(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-4">
                                    <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">
                                        Blend Components
                                    </h2>
                                    <div className="space-y-3">
                                        {blendComponents.map((comp, index) => (
                                            <div
                                                key={index}
                                                className="space-y-3 p-3.5 bg-md-surface-container-high rounded-xl border border-md-outline-variant/30 relative"
                                            >
                                                {blendComponents.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setBlendComponents((c) => c.filter((_, i) => i !== index))}
                                                        className="absolute top-2 right-2 text-md-error hover:opacity-80 p-1 cursor-pointer"
                                                    >
                                                        <Icon name="close" className="text-base" />
                                                    </button>
                                                )}
                                                <p className="typescale-label-small font-bold text-md-on-surface-variant uppercase">
                                                    Component {index + 1}
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Dropdown
                                                            buttonClassName="py-2 rounded-lg"
                                                            label="Type"
                                                            value={comp.type}
                                                            options={SPECIES_OPTIONS}
                                                            onChange={(val) => {
                                                                const newComps = [...blendComponents];
                                                                newComps[index].type = val;
                                                                setBlendComponents(newComps);
                                                            }}
                                                            placeholder="Select"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="typescale-label-small font-bold uppercase text-md-on-surface-variant">
                                                            Percentage
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                className="w-full bg-md-surface-container-low text-md-on-surface rounded-lg py-2 pl-3 pr-8 border border-md-outline-variant/30 text-sm focus:ring-1 focus:ring-md-primary/40 outline-none"
                                                                type="text"
                                                                placeholder="e.g. 70"
                                                                value={comp.percentage}
                                                                onChange={(e) => {
                                                                    const newComps = [...blendComponents];
                                                                    newComps[index].percentage = e.target.value.replace(/\D/g, '');
                                                                    setBlendComponents(newComps);
                                                                }}
                                                            />
                                                            <span className="absolute right-3 top-2 text-md-on-surface-variant text-sm">%</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 col-span-2">
                                                        <label className="typescale-label-small font-bold uppercase text-md-on-surface-variant">
                                                            Origin / Region
                                                        </label>
                                                        <input
                                                            className="w-full bg-md-surface-container-low text-md-on-surface rounded-lg py-2 px-3 border border-md-outline-variant/30 text-sm focus:ring-1 focus:ring-md-primary/40 outline-none"
                                                            type="text"
                                                            placeholder="e.g. Temanggung"
                                                            value={comp.origin}
                                                            onChange={(e) => {
                                                                const newComps = [...blendComponents];
                                                                newComps[index].origin = e.target.value;
                                                                setBlendComponents(newComps);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Dropdown
                                                            buttonClassName="py-2 rounded-lg"
                                                            label="Variety"
                                                            value={comp.variety}
                                                            options={VARIETY_OPTIONS}
                                                            onChange={(val) => {
                                                                const newComps = [...blendComponents];
                                                                newComps[index].variety = val;
                                                                setBlendComponents(newComps);
                                                            }}
                                                            placeholder="Select"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Dropdown
                                                            buttonClassName="py-2 rounded-lg"
                                                            label="Process"
                                                            value={comp.process}
                                                            options={PROCESS_OPTIONS}
                                                            onChange={(val) => {
                                                                const newComps = [...blendComponents];
                                                                newComps[index].process = val;
                                                                setBlendComponents(newComps);
                                                            }}
                                                            placeholder="Select"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {blendComponents.length < 5 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setBlendComponents([
                                                        ...blendComponents,
                                                        { type: '', origin: '', percentage: '', variety: '', process: '' },
                                                    ])
                                                }
                                                className="w-full py-2.5 flex items-center justify-center gap-2 typescale-label-medium font-bold text-md-primary hover:bg-md-primary/10 rounded-xl transition-colors border border-dashed border-md-primary/40 cursor-pointer"
                                            >
                                                <Icon name="add" className="text-base" /> Add Blend Component
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Taste Profile Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-4">
                                <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">
                                    Taste Profile
                                </h2>
                                <TasteProfileFields
                                    value={tasteProfile}
                                    onChange={(field, val) => setTasteProfile({ ...tasteProfile, [field]: val })}
                                />
                            </div>

                            {/* Roast Info Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-4">
                                <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">
                                    Roast Profile
                                </h2>
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
                                        <label
                                            className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant"
                                            htmlFor="roast-date"
                                        >
                                            Roast Date
                                        </label>
                                        <input
                                            className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 typescale-body-medium outline-none"
                                            id="roast-date"
                                            type="date"
                                            value={roastDate}
                                            onChange={(e) => setRoastDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tasting Notes Card */}
                            <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-2">
                                <label
                                    className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant flex items-center gap-2"
                                    htmlFor="tasting-notes"
                                >
                                    <Icon name="local_florist" className="text-base text-md-primary" /> Tasting Notes
                                </label>
                                <textarea
                                    className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/60 rounded-xl py-3 px-4 border border-md-outline-variant/30 focus:border-md-primary focus:ring-2 focus:ring-md-primary/20 typescale-body-medium outline-none min-h-[80px] resize-none"
                                    id="tasting-notes"
                                    placeholder="e.g. Jasmine, White Peach, Bergamot, Honey"
                                    value={tastingNotes}
                                    onChange={(e) => setTastingNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </main>

                    <SaveBar iconLast icon="arrow_forward" label="Continue to Smart Import" onClick={handleNext} />
                </div>
            )}

            {/* Step 4: Smart Import Demo */}
            {step === 'smart_import' && (
                <div className="flex flex-col min-h-screen w-full">
                    <StepHeader step={step} title="Smart Import Magic" onBack={handleBack} onSkip={() => navigate('/home')} />

                    <main className="flex-1 flex flex-col px-5 pt-4 pb-28 space-y-4">
                        {/* Intro Hero Badge */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-md-primary/15 via-amber-500/10 to-transparent border border-md-primary/25 flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-md-primary text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                                <Icon name="auto_awesome" className="text-xl" />
                            </div>
                            <div className="flex-1">
                                <h2 className="typescale-title-medium font-bold text-md-on-surface">
                                    Turn YouTube Recipes into Timers
                                </h2>
                                <p className="typescale-body-small text-md-on-surface-variant mt-1 leading-relaxed">
                                    Found a brew guide on YouTube or online? CoffeeFlow extracts doses, water weights, and timed pour steps automatically.
                                </p>
                            </div>
                        </div>

                        {/* YouTube Video Simulation Card */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-bold text-md-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                                    <Icon name="smart_display" className="text-xs text-red-500" /> Sample YouTube Video
                                </span>
                                <span className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-full">
                                    Video Link
                                </span>
                            </div>

                            <div className="bg-md-surface-container-low p-4 rounded-2xl border border-md-outline-variant/20 shadow-xs space-y-3">
                                <div className="flex items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                            <Icon name="play_arrow" className="text-base" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-md-on-surface">@coffee.master</p>
                                            <p className="text-[10px] text-md-on-surface-variant">YouTube • 142k views</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-md-primary bg-md-primary/10 px-2 py-0.5 rounded-md">
                                        youtu.be/1oB1oDrDkQo
                                    </span>
                                </div>

                                <div className="p-3 bg-md-surface-container-high rounded-xl text-xs text-md-on-surface leading-relaxed border border-md-outline-variant/20 space-y-2">
                                    <div className="flex items-center gap-1.5 font-bold text-md-on-surface">
                                        <Icon name="movie" className="text-sm text-md-primary" />
                                        <span>The Ultimate V60 Technique (James Hoffmann Method)</span>
                                    </div>
                                    <p className="text-md-on-surface-variant text-[11px] leading-relaxed font-mono">
                                        "15g coffee (medium-fine) to 250g water at 93°C (1:16.7 ratio).
                                        <br />• Bloom with 50g water for 45s, swirl gently.
                                        <br />• First pour up to 150g in 30s.
                                        <br />• Final pour up to 250g, gentle swirl & drawdown."
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Extract Trigger */}
                        {!demoExtracted ? (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleRunDemoExtract}
                                    disabled={isExtracting}
                                    className="w-full py-3.5 px-5 rounded-2xl bg-md-primary hover:bg-md-primary/95 text-white font-bold text-sm shadow-md-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                                >
                                    <Icon
                                        name={isExtracting ? 'sync' : 'auto_awesome'}
                                        className={`text-xl ${isExtracting ? 'animate-spin' : ''}`}
                                    />
                                    <span>{isExtracting ? 'Extracting recipe with AI...' : 'Extract This Recipe (1-Click Demo)'}</span>
                                </button>
                                <p className="text-[11px] text-center text-md-on-surface-variant mt-2">
                                    Tap button to see how Smart Import parses steps and timers
                                </p>
                            </div>
                        ) : (
                            /* Extracted Result Preview */
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] font-bold text-green-700 dark:text-green-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Icon name="check_circle" className="text-sm" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        Extracted to Guided Timer!
                                    </span>
                                    <span className="text-[10px] bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full font-bold">
                                        Ready to Brew
                                    </span>
                                </div>

                                <div className="bg-md-surface-container-low p-4 rounded-2xl border-2 border-md-primary/30 shadow-md-1 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-base text-md-on-surface">The Ultimate V60 Technique</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-md-primary/10 text-md-primary px-2 py-0.5 rounded-md">
                                                    V60 Dripper
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md">
                                                    1:16.7 Ratio
                                                </span>
                                                <span className="text-[10px] text-md-on-surface-variant font-medium">
                                                    ~2:00 mins
                                                </span>
                                            </div>
                                        </div>
                                        <span className="size-8 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 flex items-center justify-center shrink-0">
                                            <Icon name="done" className="text-lg" />
                                        </span>
                                    </div>

                                    {/* Parameters grid */}
                                    <div className="grid grid-cols-3 gap-2 py-1">
                                        <div className="p-2 rounded-xl bg-md-surface-container-high text-center">
                                            <span className="text-[10px] text-md-on-surface-variant block">Coffee</span>
                                            <span className="text-xs font-bold text-md-on-surface">15g</span>
                                        </div>
                                        <div className="p-2 rounded-xl bg-md-surface-container-high text-center">
                                            <span className="text-[10px] text-md-on-surface-variant block">Water</span>
                                            <span className="text-xs font-bold text-md-on-surface">250g</span>
                                        </div>
                                        <div className="p-2 rounded-xl bg-md-surface-container-high text-center">
                                            <span className="text-[10px] text-md-on-surface-variant block">Temp</span>
                                            <span className="text-xs font-bold text-md-on-surface">93°C</span>
                                        </div>
                                    </div>

                                    {/* Pour Steps */}
                                    <div className="pt-1 space-y-1.5">
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider">
                                            3 Timed Pour Steps (with Scale Targets)
                                        </p>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="p-2.5 rounded-xl bg-md-surface-container-high flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="size-5 rounded-full bg-md-primary/15 text-md-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                                        1
                                                    </span>
                                                    <span className="font-semibold text-md-on-surface">Bloom</span>
                                                    <span className="text-[11px] text-md-on-surface-variant">(45s)</span>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-md-primary">Target: 50g</span>
                                            </div>

                                            <div className="p-2.5 rounded-xl bg-md-surface-container-high flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="size-5 rounded-full bg-md-primary/15 text-md-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                                        2
                                                    </span>
                                                    <span className="font-semibold text-md-on-surface">First Pour</span>
                                                    <span className="text-[11px] text-md-on-surface-variant">(30s)</span>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-md-primary">Target: 150g</span>
                                            </div>

                                            <div className="p-2.5 rounded-xl bg-md-surface-container-high flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="size-5 rounded-full bg-md-primary/15 text-md-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                                        3
                                                    </span>
                                                    <span className="font-semibold text-md-on-surface">Final Pour & Drawdown</span>
                                                    <span className="text-[11px] text-md-on-surface-variant">(45s)</span>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-md-primary">Target: 250g</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-md-on-surface">
                                    <Icon name="lightbulb" className="text-amber-600 dark:text-amber-400 shrink-0 text-base mt-0.5" />
                                    <span>
                                        This demo recipe will be added to your Recipes list, ready to brew with the circular ring timer and scale!
                                    </span>
                                </div>
                            </div>
                        )}
                    </main>

                    <SaveBar
                        iconLast
                        icon="check_circle"
                        label={demoExtracted ? 'Finish & Start Brewing' : 'Skip & Go to Home'}
                        onClick={handleFinish}
                    />
                </div>
            )}
        </div>
    );
};
