import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import { Dropdown } from '../components/Dropdown';
import { pantryService } from '../core/services';
import type { PantryCategory } from '../features/pantry/domain/entities';

const VARIETY_OPTIONS = [
    { value: 'Arabica', label: 'Arabica' },
    { value: 'Robusta', label: 'Robusta' },
    { value: 'Liberica', label: 'Liberica' },
    { value: 'Excelsa', label: 'Excelsa' },
    { value: 'Blend', label: 'Blend' },
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

const VALID_CATEGORIES: PantryCategory[] = [
    'beans', 'milk', 'syrup', 'sugar', 'filter', 'other', 'other_ingredient',
    'machine', 'dripper', 'french_press', 'aeropress', 'grinder', 'kettle', 'scale', 'accessory'
];

export const PantryAddFormPage = () => {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const validCategory = VALID_CATEGORIES.includes(category as PantryCategory)
        ? (category as PantryCategory)
        : 'beans';

    // Common Fields
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState<'g' | 'ml' | 'pcs'>('g');

    useEffect(() => {
        if (validCategory === 'milk' || validCategory === 'syrup') setUnit('ml');
        else if (validCategory === 'filter') setUnit('pcs');
        else setUnit('g');
    }, [validCategory]);

    const categoryInfo: Record<string, { label: string, icon: string, isGear: boolean }> = {
        beans: { label: 'Coffee Beans', icon: 'coffee', isGear: false },
        filter: { label: 'Filters', icon: 'filter_list', isGear: false },
        milk: { label: 'Milk / Dairy', icon: 'water_drop', isGear: false },
        syrup: { label: 'Syrup / Flavor', icon: 'liquor', isGear: false },
        sugar: { label: 'Sugar / Sweetener', icon: 'cookie', isGear: false },
        other_ingredient: { label: 'Other Ingredient', icon: 'blender', isGear: false },
        machine: { label: 'Espresso Machine', icon: 'coffee_maker', isGear: true },
        dripper: { label: 'Dripper', icon: 'filter_alt', isGear: true },
        french_press: { label: 'French Press', icon: 'coffee', isGear: true },
        aeropress: { label: 'AeroPress', icon: 'compress', isGear: true },
        grinder: { label: 'Grinder', icon: 'settings', isGear: true },
        scale: { label: 'Scale', icon: 'scale', isGear: true },
        kettle: { label: 'Kettle', icon: 'kettle', isGear: true },
        accessory: { label: 'Accessory', icon: 'build', isGear: true },
    };

    const info = categoryInfo[category || 'beans'] || categoryInfo['beans'];

    // Specific Flexible Fields
    const [roastDate, setRoastDate] = useState('');
    const [roastLevel, setRoastLevel] = useState('');
    const [origin, setOrigin] = useState('');
    const [process, setProcess] = useState('');
    const [beanType, setBeanType] = useState<'single_origin' | 'blend'>('single_origin');
    const [blendComponents, setBlendComponents] = useState<Array<{ type: string, origin: string, percentage: string }>>([
        { type: '', origin: '', percentage: '' }
    ]);
    const [variety, setVariety] = useState('');
    const [altitude, setAltitude] = useState('');
    const [material, setMaterial] = useState('');
    const [burrType, setBurrType] = useState('');
    const [generalType, setGeneralType] = useState('');
    const [description, setDescription] = useState('');

    const handleSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const parsedQty = parseFloat(quantity);
            const qtyNum = isNaN(parsedQty) ? undefined : parsedQty;

            await pantryService.addPantryItem(name.trim(), validCategory, {
                brand: brand.trim() || undefined,
                roast_date: roastDate || undefined,
                description: description.trim() || undefined,
                quantity: qtyNum,
                unit: unit,
                tags_json: [
                    origin.trim(),
                    variety.trim(),
                    process.trim(),
                    altitude.trim(),
                    roastLevel,
                    material.trim(),
                    burrType.trim(),
                    generalType.trim()
                ].filter(Boolean)
            });

            navigate('/pantry');
        } catch (error) {
            console.error('Failed to save pantry item:', error);
            alert('Failed to save item.');
        } finally {
            setLoading(false);
        }
    };

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
                        <h1 className="typescale-headline-small font-bold text-md-on-surface">New {info.label}</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-5 pt-4 space-y-6">
                {/* Core Shared Fields */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <h2 className="typescale-label-medium font-bold text-md-on-surface-variant uppercase tracking-wider">General Info</h2>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Item Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={info.isGear ? "e.g. Comandante C40" : "e.g. Ethiopia Yirgacheffe"}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Brand / Roastery</label>
                            <input
                                type="text"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                placeholder={info.isGear ? "e.g. Fellow" : "e.g. Onyx Coffee Lab"}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                            />
                        </div>

                        {!info.isGear && (
                            <div className="space-y-1.5">
                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Quantity / Amount</label>
                                <div className="flex bg-md-surface-container-high border border-md-outline-variant/30 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-md-primary/40">
                                    <input
                                        type="number"
                                        min="0"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder={unit === 'g' ? 'e.g. 250' : unit === 'ml' ? 'e.g. 1000' : 'e.g. 100'}
                                        className="flex-1 px-4 py-3 bg-transparent typescale-body-medium text-md-on-surface placeholder:text-md-on-surface-variant/70 outline-none"
                                    />
                                    <div className="bg-md-surface-container-highest border-l border-md-outline-variant/30 px-4 py-3 typescale-label-medium font-bold text-md-on-surface-variant uppercase flex items-center justify-center">
                                        {unit}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dynamic Category Specifics */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">Specific Details</h2>

                    {category === 'beans' && (
                        <div className="space-y-4">
                            {/* Bean Type Selection */}
                            <div className="flex justify-between gap-3">
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

                            {beanType === 'single_origin' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Origin</label>
                                        <input
                                            type="text"
                                            value={origin}
                                            onChange={(e) => setOrigin(e.target.value)}
                                            placeholder="e.g. Colombia, Huila"
                                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
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
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Altitude</label>
                                        <input
                                            type="text"
                                            value={altitude}
                                            onChange={(e) => setAltitude(e.target.value)}
                                            placeholder="e.g. 1700 masl"
                                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
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
                            )}

                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div className="space-y-1.5">
                                    <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Roast Date</label>
                                    <input
                                        type="date"
                                        value={roastDate}
                                        onChange={(e) => setRoastDate(e.target.value)}
                                        className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Dropdown
                                        label="Roast Level"
                                        value={roastLevel}
                                        options={ROAST_LEVEL_OPTIONS}
                                        onChange={setRoastLevel}
                                        placeholder="Select"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {(category === 'dripper' || category === 'french_press' || category === 'aeropress') && (
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Material</label>
                            <select
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                            >
                                <option value="">Select...</option>
                                <option value="Ceramic">Ceramic</option>
                                <option value="Glass">Glass</option>
                                <option value="Plastic">Plastic</option>
                                <option value="Metal">Stainless Steel / Metal</option>
                            </select>
                        </div>
                    )}

                    {category === 'grinder' && (
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Burr Type</label>
                            <select
                                value={burrType}
                                onChange={(e) => setBurrType(e.target.value)}
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                            >
                                <option value="">Select...</option>
                                <option value="Conical">Conical Burrs</option>
                                <option value="Flat">Flat Burrs</option>
                                <option value="Blade">Blade Grinder</option>
                            </select>
                        </div>
                    )}

                    {(category === 'filter' || category === 'milk' || category === 'syrup') && (
                        <div className="space-y-1.5">
                            <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Type / Variety</label>
                            <input
                                type="text"
                                value={generalType}
                                onChange={(e) => setGeneralType(e.target.value)}
                                placeholder="e.g. Paper, Oat, Vanilla"
                                className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5 pt-1">
                        <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">
                            {category === 'beans' ? 'Tasting Notes' : 'Notes & Description'}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder={category === 'beans' ? "e.g. Jasmine, Peach, Honey..." : "Any additional details..."}
                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none resize-none"
                        />
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Save Action */}
            <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md bg-md-surface/95 backdrop-blur-md p-5 border-t border-md-outline-variant/30">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={handleSave}
                    disabled={!name.trim() || loading}
                    className="w-full"
                >
                    <Icon name="save" className="text-xl" />
                    <span>{loading ? 'Saving...' : 'Save Item'}</span>
                </Button>
            </div>
        </div>
    );
};
