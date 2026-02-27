import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { settingsService, pantryService } from '../core/services';

type Step = 'name' | 'equipment' | 'beans';

const VARIETY_OPTIONS = [
    { value: 'Arabica', label: 'Arabica' },
    { value: 'Robusta', label: 'Robusta' },
    { value: 'Blend', label: 'Blend' },
    { value: 'Liberica', label: 'Liberica' },
    { value: 'Excelsa', label: 'Excelsa' },
    { value: 'Catimor', label: 'Catimor' },
    { value: 'Bourbon', label: 'Bourbon' },
    { value: 'Caturra', label: 'Caturra' },
    { value: 'Typica', label: 'Typica' },
    { value: 'Geisha', label: 'Geisha' },
    { value: 'Other', label: 'Other' }
];

const PROCESS_OPTIONS = [
    { value: 'Washed', label: 'Washed' },
    { value: 'Natural', label: 'Natural' },
    { value: 'Honey', label: 'Honey' },
    { value: 'Full Washed', label: 'Full Washed' },
    { value: 'Semi Washed', label: 'Semi Washed' },
    { value: 'Anaerobic', label: 'Anaerobic' },
    { value: 'Experimental', label: 'Experimental' },
    { value: 'Other', label: 'Other' }
];

const ROAST_LEVEL_OPTIONS = [
    { value: 'light', label: 'Light Roast' },
    { value: 'medium', label: 'Medium Roast' },
    { value: 'dark', label: 'Dark Roast' }
];

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('name');
    const [name, setName] = useState('');
    const [brewingGoal, setBrewingGoal] = useState('');
    const [appUnit, setAppUnit] = useState<'metric' | 'imperial'>('metric');
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

    useEffect(() => {
        const checkDone = async () => {
            try {
                const existingName = await settingsService.getUserName();
                const methods = await settingsService.getUserPreferredMethods();
                if (existingName && existingName.trim().length > 0 && methods && methods.length === 6) {
                    navigate('/home', { replace: true });
                }
            } catch (e) {
                // Ignore
            }
        };
        checkDone();
    }, [navigate]);

    // Bean Form State
    const [beanName, setBeanName] = useState('');
    const [roastery, setRoastery] = useState('');
    const [beanType, setBeanType] = useState<'single_origin' | 'blend'>('single_origin');
    const [blendComponents, setBlendComponents] = useState<Array<{ type: string, origin: string, percentage: string }>>([
        { type: '', origin: '', percentage: '' }
    ]);
    const [origin, setOrigin] = useState('');
    const [variety, setVariety] = useState('');
    const [process, setProcess] = useState('');
    const [altitude, setAltitude] = useState('');
    const [tastingNotes, setTastingNotes] = useState('');
    const [roastDate, setRoastDate] = useState('');
    const [roastLevel, setRoastLevel] = useState<'light' | 'medium' | 'dark'>('medium');

    const handleNext = async () => {
        if (step === 'name') {
            if (name.trim()) {
                await settingsService.setUserName(name);
                if (brewingGoal) await settingsService.setUserBrewingGoal(brewingGoal);
                await settingsService.setAppUnit(appUnit);

                // Generate a unique user ID if one doesn't exist already
                const existingId = await settingsService.getUserId();
                if (!existingId) {
                    await settingsService.setUserId(crypto.randomUUID());
                }

                setStep('equipment');
            }
        } else if (step === 'equipment') {
            // Save preferred methods to settings instead of pantry equipment
            await settingsService.setUserPreferredMethods(selectedEquipment);

            setStep('beans');
        } else if (step === 'beans') {
            // Save beans to pantry
            if (beanName.trim()) {
                const tags: string[] = [];
                if (roastLevel) tags.push(`Roast: ${roastLevel.charAt(0).toUpperCase() + roastLevel.slice(1)}`);

                if (beanType === 'single_origin') {
                    if (origin) tags.push(`Origin: ${origin}`);
                    if (variety) tags.push(`Variety: ${variety}`);
                    if (process) tags.push(`Process: ${process}`);
                    if (altitude) tags.push(`Altitude: ${altitude} masl`);
                } else {
                    tags.push('Blend');
                    const blendDesc = blendComponents
                        .filter(c => c.origin || c.type || c.percentage)
                        .map(c => `${c.percentage ? c.percentage + '%' : ''} ${c.type || ''} ${c.origin ? '(' + c.origin + ')' : ''}`.trim())
                        .filter(Boolean)
                        .join(', ');
                    if (blendDesc) tags.push(`Composition: ${blendDesc}`);
                }

                if (tastingNotes) tags.push(`Notes: ${tastingNotes}`);

                await pantryService.addPantryItem(beanName, 'beans', {
                    brand: roastery,
                    tags_json: tags,
                    roast_date: roastDate ? new Date(roastDate).toISOString() : undefined,
                    remaining_stock: 100,
                    description: tastingNotes // Also save notes in description for easy reading
                });
            }
            navigate('/home');
        }
    };

    const handleBack = () => {
        if (step === 'equipment') setStep('name');
        else if (step === 'beans') setStep('equipment');
        else navigate('/welcome');
    };

    const toggleEquipment = (item: string) => {
        if (selectedEquipment.includes(item)) {
            setSelectedEquipment(selectedEquipment.filter(i => i !== item));
        } else {
            if (selectedEquipment.length < 6) {
                setSelectedEquipment([...selectedEquipment, item]);
            }
        }
    };

    return (
        <div className="relative flex h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display overflow-hidden">
            {/* Step 1: Name Input */}
            {step === 'name' && (
                <div className="relative flex h-full w-full flex-col bg-cream dark:bg-background-dark">
                    <div className="flex items-center justify-between px-6 py-6 z-10 w-full pt-12">
                        <button onClick={handleBack} className="flex items-center text-coffee-brown/60 dark:text-white/60 hover:text-coffee-brown transition-colors">
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <div className="flex gap-2">
                            <div className="h-2 w-8 rounded-full bg-primary"></div>
                            <div className="h-2 w-2 rounded-full bg-coffee-brown/20 dark:bg-white/20"></div>
                            <div className="h-2 w-2 rounded-full bg-coffee-brown/20 dark:bg-white/20"></div>
                        </div>
                        <div className="w-6"></div> {/* Placeholder to balance header */}
                    </div>

                    <div className="flex flex-1 flex-col px-6 pt-2 pb-8 z-10 w-full max-w-md mx-auto overflow-y-auto scrollbar-hide">
                        <div className="w-full space-y-6 flex flex-col">
                            <div className="text-center space-y-2 mb-2">
                                <p className="text-xs font-bold text-primary tracking-widest uppercase">Step 1 — Profile</p>
                                <h2 className="text-2xl font-bold text-neutral-text dark:text-white">Let's get to know you</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                                    Help us tailor your coffee journey.
                                </p>
                            </div>

                            <div className="w-full space-y-5">
                                {/* Name Input Card */}
                                <div className="bg-white dark:bg-[#2C241B] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <Icon name="person" className="text-[16px]" /> What should we call you?
                                    </label>
                                    <input
                                        className="w-full bg-gray-50 dark:bg-black/20 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 border-none focus:ring-2 focus:ring-primary/50 text-base font-medium transition-all"
                                        placeholder="Your Name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                {/* Brewing Goal Card */}
                                <div className="bg-white dark:bg-[#2C241B] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <Icon name="flag" className="text-[16px]" /> What brings you here?
                                    </label>
                                    <div className="space-y-2">
                                        {['Improve my skills', 'Discover new beans', 'Track my brews', 'Just exploring'].map((goalOption) => (
                                            <button
                                                key={goalOption}
                                                onClick={() => setBrewingGoal(goalOption)}
                                                className={`w-full p-3 rounded-lg text-left transition-all flex items-center justify-between border ${brewingGoal === goalOption
                                                    ? 'bg-primary/5 border-primary/30 text-primary'
                                                    : 'bg-white dark:bg-transparent border-gray-100 dark:border-gray-700 text-neutral-text dark:text-gray-300 hover:border-primary/30'
                                                    }`}
                                            >
                                                <span className="font-medium text-sm">{goalOption}</span>
                                                {brewingGoal === goalOption && <Icon name="check_circle" className="text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Metrics Used Card */}
                                <div className="bg-white dark:bg-[#2C241B] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <Icon name="straighten" className="text-[16px]" /> Metrics Used
                                    </label>
                                    <div className="flex justify-between gap-3">
                                        <button
                                            onClick={() => setAppUnit('metric')}
                                            className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-between text-sm font-bold transition-all border ${appUnit === 'metric'
                                                ? 'bg-primary/5 border-primary/50 text-primary shadow-sm'
                                                : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                                }`}
                                        >
                                            <span>Metric (g/ml)</span>
                                            {appUnit === 'metric' && <Icon name="check_circle" className="text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />}
                                        </button>
                                        <button
                                            onClick={() => setAppUnit('imperial')}
                                            className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-between text-sm font-bold transition-all border ${appUnit === 'imperial'
                                                ? 'bg-primary/5 border-primary/50 text-primary shadow-sm'
                                                : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                                }`}
                                        >
                                            <span>Imperial (oz)</span>
                                            {appUnit === 'imperial' && <Icon name="check_circle" className="text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-grow"></div>
                        <div className="w-full pt-12">
                            <button
                                onClick={handleNext}
                                disabled={!name.trim() || !brewingGoal}
                                className="w-full bg-coffee-brown hover:bg-[#3a2e27] dark:bg-primary dark:hover:bg-primary-dark text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-coffee-brown/20 dark:shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>Next</span>
                                <Icon name="arrow_forward" className="text-xl" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Equipment Selection */}
            {step === 'equipment' && (
                <div className="relative flex h-full w-full flex-col bg-cream dark:bg-background-dark">
                    <div className="flex items-center justify-between px-6 py-6 z-10 w-full pt-12">
                        <button onClick={handleBack} className="flex items-center text-coffee-brown/60 dark:text-white/60 hover:text-coffee-brown transition-colors">
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <div className="flex gap-2">
                            <div className="h-2 w-2 rounded-full bg-coffee-brown/20 dark:bg-white/20"></div>
                            <div className="h-2 w-8 rounded-full bg-primary"></div>
                            <div className="h-2 w-2 rounded-full bg-coffee-brown/20 dark:bg-white/20"></div>
                        </div>
                        <div className="w-6"></div> {/* Placeholder to balance header */}
                    </div>

                    <div className="flex-1 flex flex-col pt-2 px-6 pb-24 overflow-y-auto scrollbar-hide">
                        <div className="mb-6 text-center space-y-2">
                            <p className="text-xs font-bold text-primary tracking-widest uppercase">Step 2 — Equipment</p>
                            <h2 className="text-2xl font-bold text-neutral-text dark:text-white leading-tight">
                                What do you brew with?
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                                Select <span className="text-primary font-bold">exactly 6</span> items to proceed. ({selectedEquipment.length}/6)
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pb-20">
                            {[
                                { name: 'V60', icon: 'filter_alt' },
                                { name: 'AeroPress', icon: 'science' },
                                { name: 'French Press', icon: 'coffee_maker' },
                                { name: 'Chemex', icon: 'hourglass_top' },
                                { name: 'Moka Pot', icon: 'local_cafe' },
                                { name: 'Siphon', icon: 'science_off' },
                                { name: 'Espresso', icon: 'coffee' },
                                { name: 'Clever Dripper', icon: 'filter_list' },
                                { name: 'Cold Brew', icon: 'ac_unit' },
                                { name: 'Kalita Wave', icon: 'waves' }
                            ].map((item) => {
                                const isSelected = selectedEquipment.includes(item.name);
                                return (
                                    <button
                                        key={item.name}
                                        onClick={() => toggleEquipment(item.name)}
                                        className={`group relative flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-[0.98] border ${isSelected
                                            ? 'bg-primary/5 border-primary/50 shadow-sm'
                                            : 'bg-white dark:bg-[#2C241B] border-gray-100 dark:border-white/5 shadow-sm hover:border-primary/30'
                                            }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 text-primary">
                                                <Icon name="check_circle" className="text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                            </div>
                                        )}
                                        <div className={`h-10 w-10 mb-2 rounded-lg flex items-center justify-center transition-colors ${isSelected
                                            ? 'bg-primary text-white shadow-md'
                                            : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 group-hover:text-primary group-hover:bg-primary/10'
                                            }`}>
                                            <Icon name={item.icon} className="text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        </div>
                                        <span className={`font-bold text-xs text-center ${isSelected
                                            ? 'text-primary'
                                            : 'text-neutral-text dark:text-gray-300'
                                            }`}>
                                            {item.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="fixed bottom-0 w-full bg-cream/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-black/5 dark:border-white/5 p-6 z-30 max-w-md mx-auto left-0 right-0">
                        <button
                            onClick={handleNext}
                            disabled={selectedEquipment.length !== 6}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Next Step</span>
                            <Icon name="arrow_forward" className="text-xl" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Bean Inventory */}
            {step === 'beans' && (
                <div className="relative flex h-full w-full flex-col bg-cream dark:bg-background-dark">
                    <div className="flex items-center justify-between px-6 py-6 z-10 w-full pt-12">
                        <button onClick={handleBack} className="flex items-center text-coffee-brown/60 dark:text-white/60 hover:text-coffee-brown transition-colors">
                            <Icon name="arrow_back" className="text-2xl" />
                        </button>
                        <div className="flex gap-2">
                            <div className="h-2 w-2 rounded-full bg-coffee-brown/20 dark:bg-white/20"></div>
                            <div className="h-2 w-2 rounded-full bg-coffee-brown/20 dark:bg-white/20"></div>
                            <div className="h-2 w-8 rounded-full bg-primary"></div>
                        </div>
                        <button onClick={() => navigate('/home')} className="text-sm font-semibold text-coffee-brown/60 dark:text-white/60 hover:text-coffee-brown transition-colors">
                            Skip
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col pt-2 px-6 pb-24 overflow-y-auto scrollbar-hide">
                        <div className="mb-6 text-center space-y-2">
                            <p className="text-xs font-bold text-primary tracking-widest uppercase">Step 3 — Beans</p>
                            <h1 className="text-2xl font-bold text-neutral-text dark:text-white leading-tight">
                                Current Beans
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                                Tell us what you're brewing. We'll personalize recipe suggestions.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Identity Card */}
                            <div className="bg-white dark:bg-[#2C241B] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                                <h3 className="text-sm font-bold text-coffee-brown dark:text-gray-200 border-b border-gray-100 dark:border-white/5 pb-2">Identity</h3>
                                <div className="flex justify-between gap-3 pb-2">
                                    <button
                                        onClick={() => setBeanType('single_origin')}
                                        className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${beanType === 'single_origin'
                                            ? 'bg-primary/5 border-primary/50 text-primary shadow-sm'
                                            : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        Single Origin
                                    </button>
                                    <button
                                        onClick={() => setBeanType('blend')}
                                        className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${beanType === 'blend'
                                            ? 'bg-primary/5 border-primary/50 text-primary shadow-sm'
                                            : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        Blend
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2" htmlFor="bean-name">
                                            Bean Name <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            className="w-full bg-gray-50 dark:bg-black/20 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 border-none focus:ring-2 focus:ring-primary/50 text-base font-medium transition-all"
                                            id="bean-name"
                                            placeholder={beanType === 'single_origin' ? "e.g. Aroma Nativo" : "e.g. Holiday Blend"}
                                            type="text"
                                            value={beanName}
                                            onChange={(e) => setBeanName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2" htmlFor="roastery">
                                            Roastery
                                        </label>
                                        <input
                                            className="w-full bg-gray-50 dark:bg-black/20 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 border-none focus:ring-2 focus:ring-primary/50 text-base font-medium transition-all"
                                            id="roastery"
                                            placeholder="e.g. Cap Kadal"
                                            type="text"
                                            value={roastery}
                                            onChange={(e) => setRoastery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Origin & Details Card */}
                            {beanType === 'single_origin' ? (
                                <div className="bg-white dark:bg-[#2C241B] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                                    <h3 className="text-sm font-bold text-coffee-brown dark:text-gray-200 border-b border-gray-100 dark:border-white/5 pb-2">Single Origin Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400" htmlFor="origin">
                                                Origin
                                            </label>
                                            <input
                                                className="w-full bg-gray-50 dark:bg-black/20 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 border-none focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all"
                                                id="origin"
                                                placeholder="e.g. Temanggung"
                                                type="text"
                                                value={origin}
                                                onChange={(e) => setOrigin(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Dropdown
                                                label="Variety"
                                                value={variety}
                                                options={VARIETY_OPTIONS}
                                                onChange={setVariety}
                                                placeholder="Select"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Dropdown
                                                label="Process"
                                                value={process}
                                                options={PROCESS_OPTIONS}
                                                onChange={setProcess}
                                                placeholder="Select"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400" htmlFor="altitude">
                                                Altitude
                                            </label>
                                            <input
                                                className="w-full bg-gray-50 dark:bg-black/20 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 border-none focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all"
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
                                <div className="bg-white dark:bg-[#2C241B] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2">
                                        <h3 className="text-sm font-bold text-coffee-brown dark:text-gray-200">Blend Components</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {blendComponents.map((comp, index) => (
                                            <div key={index} className="space-y-3 p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5 relative">
                                                {blendComponents.length > 1 && (
                                                    <button
                                                        onClick={() => setBlendComponents(c => c.filter((_, i) => i !== index))}
                                                        className="absolute top-2 right-2 text-red-400 hover:text-red-500 z-10 p-1"
                                                    >
                                                        <Icon name="close" className="text-sm" />
                                                    </button>
                                                )}
                                                <p className="text-xs font-bold text-gray-400 uppercase">Component {index + 1}</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-500">Type</label>
                                                        <Dropdown
                                                            buttonClassName="py-2 rounded-lg"
                                                            label=""
                                                            value={comp.type}
                                                            options={[
                                                                { value: 'Arabica', label: 'Arabica' },
                                                                { value: 'Robusta', label: 'Robusta' },
                                                                { value: 'Liberica', label: 'Liberica' },
                                                                { value: 'Excelsa', label: 'Excelsa' },
                                                            ]}
                                                            onChange={(val) => {
                                                                const newComps = [...blendComponents];
                                                                newComps[index].type = val;
                                                                setBlendComponents(newComps);
                                                            }}
                                                            placeholder="Select"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-500">Percentage</label>
                                                        <div className="relative">
                                                            <input
                                                                className="w-full bg-white dark:bg-[#2C241B] text-neutral-text dark:text-white rounded-lg py-2 pl-3 pr-8 border border-gray-200 dark:border-gray-700 text-sm focus:ring-1 focus:ring-primary/50 outline-none"
                                                                type="text"
                                                                placeholder="e.g. 70"
                                                                value={comp.percentage}
                                                                onChange={e => {
                                                                    const newComps = [...blendComponents];
                                                                    newComps[index].percentage = e.target.value.replace(/\D/g, '');
                                                                    setBlendComponents(newComps);
                                                                }}
                                                            />
                                                            <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1 col-span-2">
                                                        <label className="text-[10px] font-bold uppercase text-gray-500">Origin / Region</label>
                                                        <input
                                                            className="w-full bg-white dark:bg-[#2C241B] text-neutral-text dark:text-white rounded-lg py-2 px-3 border border-gray-200 dark:border-gray-700 text-sm focus:ring-1 focus:ring-primary/50 outline-none"
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
                                                className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors border border-dashed border-primary/30"
                                            >
                                                <Icon name="add" className="text-[16px]" /> Add Component
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Roast Info Card */}
                            <div className="bg-white dark:bg-[#2C241B] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 space-y-4">
                                <h3 className="text-sm font-bold text-coffee-brown dark:text-gray-200 border-b border-gray-100 dark:border-white/5 pb-2">Roast Profile</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Dropdown
                                            label="Roast Level"
                                            value={roastLevel}
                                            options={ROAST_LEVEL_OPTIONS}
                                            onChange={(val) => setRoastLevel(val as 'light' | 'medium' | 'dark')}
                                            placeholder="Select Level"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400" htmlFor="roast-date">
                                            Roast Date
                                        </label>
                                        <input
                                            className="w-full bg-gray-50 dark:bg-black/20 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 border-none focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all"
                                            id="roast-date"
                                            type="date"
                                            value={roastDate}
                                            onChange={(e) => setRoastDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tasting Notes Card */}
                            <div className="bg-white dark:bg-[#2C241B] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 space-y-3">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2" htmlFor="tasting-notes">
                                    <Icon name="local_florist" className="text-[16px]" /> Tasting Notes
                                </label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-black/20 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 px-4 border-none focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all min-h-[80px] resize-none"
                                    id="tasting-notes"
                                    placeholder="e.g. Peach, Berries, Jasmine"
                                    value={tastingNotes}
                                    onChange={(e) => setTastingNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="fixed bottom-0 w-full bg-cream/90 dark:bg-background-dark/90 backdrop-blur-md border-t border-black/5 dark:border-white/5 p-6 z-30 max-w-md mx-auto left-0 right-0">
                            <button
                                onClick={handleNext}
                                className="w-full bg-coffee-brown hover:bg-[#3d312a] dark:bg-primary dark:hover:bg-primary-dark text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-coffee-brown/20 dark:shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span>Finish Setup</span>
                                <Icon name="check_circle" className="text-xl" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
