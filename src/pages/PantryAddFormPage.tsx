import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { pantryService } from '../core/services';

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
import type { PantryCategory } from '../features/pantry/domain/entities';

export const PantryAddFormPage = () => {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Common Fields
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState<'g' | 'ml' | 'pcs'>('g');

    useEffect(() => {
        if (category === 'milk' || category === 'syrup') setUnit('ml');
        else if (category === 'filter') setUnit('pcs');
        else setUnit('g');
    }, [category]);

    // Core Category Data Maps (to define dynamic ui)
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

    // Specific Flexible Fields (Packed into tags_json and description)
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
            const tags: string[] = [];

            // Pack flexible fields into tags based on what the user filled
            if (category === 'beans') {
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
            } else {
                if (roastLevel) tags.push(`Roast: ${roastLevel}`);
                if (origin) tags.push(`Origin: ${origin}`);
                if (process) tags.push(`Process: ${process}`);
                if (material) tags.push(`Material: ${material}`);
                if (burrType) tags.push(`Burrs: ${burrType}`);
                if (generalType) tags.push(`Type: ${generalType}`);
            }

            await pantryService.addPantryItem(name, (category || 'beans') as PantryCategory, {
                brand: brand || undefined,
                tags_json: tags,
                roast_date: roastDate ? new Date(roastDate).toISOString() : undefined,
                quantity: quantity.trim() ? Number(quantity) : undefined,
                unit: info.isGear ? undefined : unit,
                description: description || undefined,
                icon: info.icon
            });

            navigate('/pantry');
        } catch (error) {
            console.error('Failed to save item', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background-light font-display">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 z-10 pt-12">
                <button
                    onClick={() => navigate('/pantry/add')}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-400 trasition-colors -ml-2"
                >
                    <Icon name="arrow_back" className="text-[24px]" />
                </button>
                <h1 className="text-lg font-bold text-neutral-text">New {info.label}</h1>
                <div className="w-10 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || loading}
                        className="text-primary font-bold disabled:opacity-50"
                    >
                        Save
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-6">
                {/* Core Shared Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Item Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={info.isGear ? "e.g. Comandante C40" : "e.g. Ethiopia Yirgacheffe"}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411] placeholder:font-normal"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Brand / Roastery</label>
                        <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder={info.isGear ? "e.g. Fellow" : "e.g. Onyx Coffee Lab"}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411] placeholder:font-normal"
                        />
                    </div>

                    {!info.isGear && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Quantity / Amount</label>
                            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                <input
                                    type="number"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder={unit === 'g' ? 'e.g. 250' : unit === 'ml' ? 'e.g. 1000' : 'e.g. 100'}
                                    className="flex-1 px-4 py-3 text-sm focus:outline-none font-medium text-[#181411] placeholder:font-normal"
                                />
                                <div className="bg-gray-50 border-l border-gray-200 px-4 py-3 text-sm font-bold text-gray-500 uppercase flex items-center justify-center">
                                    {unit}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <hr className="border-gray-100" />

                {/* Dynamic Category Specifics */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#181411]">Specific Details</h3>

                    {category === 'beans' && (
                        <div className="space-y-4">
                            {/* Bean Type Selection */}
                            <div className="flex justify-between gap-3 mb-2">
                                <button
                                    onClick={() => setBeanType('single_origin')}
                                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${beanType === 'single_origin'
                                        ? 'bg-primary/5 border-primary/50 text-primary shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    Single Origin
                                </button>
                                <button
                                    onClick={() => setBeanType('blend')}
                                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${beanType === 'blend'
                                        ? 'bg-primary/5 border-primary/50 text-primary shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    Blend
                                </button>
                            </div>

                            {beanType === 'single_origin' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Origin</label>
                                        <input
                                            type="text"
                                            value={origin}
                                            onChange={(e) => setOrigin(e.target.value)}
                                            placeholder="e.g. Colombia, Huila"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411] placeholder:font-normal"
                                        />
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <Dropdown
                                            buttonClassName="py-3 rounded-xl border-gray-200 bg-white shadow-none"
                                            label="Variety"
                                            value={variety}
                                            options={VARIETY_OPTIONS}
                                            onChange={setVariety}
                                            placeholder="Select"
                                        />
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <Dropdown
                                            buttonClassName="py-3 rounded-xl border-gray-200 bg-white shadow-none"
                                            label="Process"
                                            value={process}
                                            options={PROCESS_OPTIONS}
                                            onChange={setProcess}
                                            placeholder="Select"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Altitude</label>
                                        <input
                                            type="text"
                                            value={altitude}
                                            onChange={(e) => setAltitude(e.target.value)}
                                            placeholder="e.g. 1700 masl"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411] placeholder:font-normal"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {blendComponents.map((comp, index) => (
                                        <div key={index} className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100 relative">
                                            {blendComponents.length > 1 && (
                                                <button
                                                    onClick={() => setBlendComponents(c => c.filter((_, i) => i !== index))}
                                                    className="absolute top-2 right-2 text-red-400 hover:text-red-500 z-10 p-1 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200"
                                                >
                                                    <Icon name="close" className="text-sm" />
                                                </button>
                                            )}
                                            <p className="text-xs font-bold text-gray-400 uppercase">Component {index + 1}</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1 text-xs">
                                                    <Dropdown
                                                        buttonClassName="py-2.5 rounded-lg border-gray-200 bg-white"
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
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 leading-none">Percentage</label>
                                                    <div className="relative">
                                                        <input
                                                            className="w-full bg-white text-neutral-text rounded-lg py-2.5 pl-3 pr-8 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                                            type="text"
                                                            placeholder="e.g. 70"
                                                            value={comp.percentage}
                                                            onChange={e => {
                                                                const newComps = [...blendComponents];
                                                                newComps[index].percentage = e.target.value.replace(/\D/g, '');
                                                                setBlendComponents(newComps);
                                                            }}
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 col-span-2">
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 leading-none">Origin / Region</label>
                                                    <input
                                                        className="w-full bg-white text-neutral-text rounded-lg py-2.5 px-3 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all font-medium"
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
                                            className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors border border-dashed border-primary/30"
                                        >
                                            <Icon name="add" className="text-[16px]" /> Add Component
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Roast Date</label>
                                    <input
                                        type="date"
                                        value={roastDate}
                                        onChange={(e) => setRoastDate(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411] placeholder:font-normal"
                                    />
                                </div>
                                <div className="space-y-2 text-xs">
                                    <Dropdown
                                        buttonClassName="py-3 rounded-xl border-gray-200 bg-white shadow-none"
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
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Material</label>
                            <select
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411]"
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
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Burr Type</label>
                            <select
                                value={burrType}
                                onChange={(e) => setBurrType(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411]"
                            >
                                <option value="">Select...</option>
                                <option value="Conical">Conical Burrs</option>
                                <option value="Flat">Flat Burrs</option>
                                <option value="Blade">Blade Grinder</option>
                            </select>
                        </div>
                    )}

                    {(category === 'filter' || category === 'milk' || category === 'syrup') && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Type / Variety</label>
                            <input
                                type="text"
                                value={generalType}
                                onChange={(e) => setGeneralType(e.target.value)}
                                placeholder="e.g. Paper, Oat, Vanilla"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411] placeholder:font-normal"
                            />
                        </div>
                    )}

                    <div className="pt-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                            {category === 'beans' ? 'Tasting Notes' : 'Notes & Description'}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder={category === 'beans' ? "e.g. Jasmine, Peach, Honey..." : "Any additional details..."}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-[#181411] placeholder:font-normal resize-none"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};
