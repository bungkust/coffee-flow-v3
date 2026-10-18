import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { PageHeader } from '../components/PageHeader';
import { SaveBar } from '../components/SaveBar';
import { QuantityField } from '../components/QuantityField';
import { SegmentedControl } from '../components/SegmentedControl';
import { TasteProfileFields } from '../components/TasteProfileFields';
import { pantryService } from '../core/services';
import { PROCESS_OPTIONS, VARIETY_OPTIONS, SPECIES_OPTIONS, ROAST_LEVEL_OPTIONS, formatBeanTags, buildBlendTags, parseQuantity } from '../features/pantry/domain/beanOptions';
import type { BlendComponent } from '../features/pantry/domain/beanOptions';
import {
    PANTRY_CATEGORY_MAP,
    isPantryCategory,
    FILTER_SHAPE_OPTIONS,
    FILTER_MATERIAL_OPTIONS,
    MILK_TYPE_OPTIONS,
    SYRUP_FLAVOR_OPTIONS,
    SUGAR_TYPE_OPTIONS,
    OTHER_INGREDIENT_OPTIONS,
    DRIPPER_SHAPE_OPTIONS,
    GEAR_MATERIAL_OPTIONS,
    GRINDER_BURR_OPTIONS,
    GRINDER_DRIVE_OPTIONS,
    KETTLE_TYPE_OPTIONS,
    MACHINE_TYPE_OPTIONS,
    formatCategoryAttributes,
    type CategoryAttributes
} from '../features/pantry/domain/pantryCategories';
import { useSafeBack } from '../shared/utils/backNavigation';

export const PantryAddFormPage = () => {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();
    const safeBack = useSafeBack();
    const [loading, setLoading] = useState(false);

    const validCategory = isPantryCategory(category) ? category : 'beans';

    // Common Fields
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState<'g' | 'ml' | 'pcs'>('g');

    useEffect(() => {
        setUnit(PANTRY_CATEGORY_MAP[validCategory].defaultUnit);
    }, [validCategory]);

    const info = PANTRY_CATEGORY_MAP[validCategory];

    // Specific Flexible Fields
    const [roastDate, setRoastDate] = useState('');
    const [tasteProfile, setTasteProfile] = useState({ sweet: '', acid: '', body: '', bitter: '' });
    const [roastLevel, setRoastLevel] = useState('');
    const [species, setSpecies] = useState('');
    const [origin, setOrigin] = useState('');
    const [process, setProcess] = useState('');
    const [beanType, setBeanType] = useState<'single_origin' | 'blend'>('single_origin');
    const [blendComponents, setBlendComponents] = useState<BlendComponent[]>([
        { type: '', origin: '', percentage: '', variety: '', process: '' }
    ]);
    const [variety, setVariety] = useState('');
    const [altitude, setAltitude] = useState('');
    const [producer, setProducer] = useState('');
    const [categoryAttrs, setCategoryAttrs] = useState<CategoryAttributes>({});
    const [description, setDescription] = useState('');

    const setAttr = (key: keyof CategoryAttributes) => (val: string) =>
        setCategoryAttrs(prev => ({ ...prev, [key]: val }));

    const updateComponent = (index: number, patch: Partial<BlendComponent>) =>
        setBlendComponents(current => current.map((comp, i) => (i === index ? { ...comp, ...patch } : comp)));

    const handleSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const tags_json = validCategory === 'beans'
                ? [
                    ...formatBeanTags({ species, origin, variety, process, altitude, roastLevel, producer, ...tasteProfile }),
                    ...buildBlendTags(beanType === 'blend' ? blendComponents : [])
                  ]
                : formatCategoryAttributes(categoryAttrs);

            await pantryService.addPantryItem(name.trim(), validCategory, {
                brand: brand.trim() || undefined,
                roast_date: validCategory === 'beans' ? (roastDate || undefined) : undefined,
                description: description.trim() || undefined,
                quantity: info.isGear ? undefined : parseQuantity(quantity),
                unit: info.isGear ? undefined : unit,
                tags_json: tags_json.filter(Boolean)
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
            <PageHeader title={`New ${info.name}`} onBack={() => safeBack('/pantry/add')} />

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
                                <QuantityField
                                    value={quantity}
                                    onChange={setQuantity}
                                    unit={unit}
                                    placeholder={unit === 'g' ? 'e.g. 250' : unit === 'ml' ? 'e.g. 1000' : 'e.g. 100'}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Dynamic Category Specifics */}
                <div className="bg-md-surface-container-low p-5 rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-4">
                    <h2 className="typescale-title-medium font-bold text-md-on-surface border-b border-md-outline-variant/20 pb-2">Specific Details</h2>

                    {category === 'beans' && (
                        <div className="space-y-4">
                            <SegmentedControl
                                name="bean-type"
                                value={beanType}
                                options={[
                                    { value: 'single_origin', label: 'Single Origin' },
                                    { value: 'blend', label: 'Blend' }
                                ]}
                                onChange={setBeanType}
                            />

                            {beanType === 'single_origin' ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="typescale-label-small font-bold uppercase text-md-on-surface-variant">Bean</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
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
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="typescale-label-small font-bold uppercase text-md-on-surface-variant">Farm</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Altitude</label>
                                                <input
                                                    type="text"
                                                    value={altitude}
                                                    onChange={(e) => setAltitude(e.target.value)}
                                                    placeholder="e.g. 1700 masl"
                                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Producer</label>
                                                <input
                                                    type="text"
                                                    value={producer}
                                                    onChange={(e) => setProducer(e.target.value)}
                                                    placeholder="e.g. Argopuro Walida"
                                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="typescale-label-small font-bold uppercase text-md-on-surface-variant">Roast</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Dropdown
                                                label="Species"
                                                value={species}
                                                options={SPECIES_OPTIONS}
                                                onChange={setSpecies}
                                                placeholder="Select"
                                            />
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
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="typescale-label-small font-bold uppercase text-md-on-surface-variant">Roast</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <Dropdown
                                                    label="Species"
                                                    value={species}
                                                    options={SPECIES_OPTIONS}
                                                    onChange={setSpecies}
                                                    placeholder="Select"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">Roast Date</label>
                                                <input
                                                    type="date"
                                                    value={roastDate}
                                                    onChange={(e) => setRoastDate(e.target.value)}
                                                    className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none"
                                                />
                                            </div>
                                            <Dropdown
                                                label="Roast Level"
                                                value={roastLevel}
                                                options={ROAST_LEVEL_OPTIONS}
                                                onChange={setRoastLevel}
                                                placeholder="Select"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="typescale-label-small font-bold uppercase text-md-on-surface-variant">Components</p>
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
                                                        options={SPECIES_OPTIONS}
                                                        onChange={(val) => updateComponent(index, { type: val })}
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
                                                            onChange={e => updateComponent(index, { percentage: e.target.value.replace(/\D/g, '') })}
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
                                                        onChange={e => updateComponent(index, { origin: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Dropdown
                                                        buttonClassName="py-2 rounded-lg"
                                                        label="Variety"
                                                        value={comp.variety}
                                                        options={VARIETY_OPTIONS}
                                                        onChange={(val) => updateComponent(index, { variety: val })}
                                                        placeholder="Select"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Dropdown
                                                        buttonClassName="py-2 rounded-lg"
                                                        label="Process"
                                                        value={comp.process}
                                                        options={PROCESS_OPTIONS}
                                                        onChange={(val) => updateComponent(index, { process: val })}
                                                        placeholder="Select"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {blendComponents.length < 5 && (
                                        <button
                                            onClick={() => setBlendComponents([...blendComponents, { type: '', origin: '', percentage: '', variety: '', process: '' }])}
                                            className="w-full py-2.5 flex items-center justify-center gap-2 typescale-label-medium font-bold text-md-primary hover:bg-md-primary-container/30 rounded-xl transition-colors border border-dashed border-md-primary/40 cursor-pointer"
                                        >
                                            <Icon name="add" className="text-base" /> Add Component
                                        </button>
                                    )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <p className="typescale-label-small font-bold uppercase text-md-on-surface-variant">Taste Profile</p>
                                <TasteProfileFields
                                    value={tasteProfile}
                                    onChange={(field, val) => setTasteProfile({ ...tasteProfile, [field]: val })}
                                />
                            </div>
                        </div>
                    )}

                    {validCategory === 'filter' && (
                        <div className="grid grid-cols-2 gap-3">
                            <Dropdown
                                label="Shape / Size"
                                value={categoryAttrs.shape || ''}
                                options={FILTER_SHAPE_OPTIONS}
                                onChange={setAttr('shape')}
                                placeholder="Select"
                            />
                            <Dropdown
                                label="Material"
                                value={categoryAttrs.material || ''}
                                options={FILTER_MATERIAL_OPTIONS}
                                onChange={setAttr('material')}
                                placeholder="Select"
                            />
                        </div>
                    )}

                    {validCategory === 'milk' && (
                        <Dropdown
                            label="Milk Type"
                            value={categoryAttrs.type || ''}
                            options={MILK_TYPE_OPTIONS}
                            onChange={setAttr('type')}
                            placeholder="Select"
                        />
                    )}

                    {validCategory === 'syrup' && (
                        <Dropdown
                            label="Flavor"
                            value={categoryAttrs.flavor || ''}
                            options={SYRUP_FLAVOR_OPTIONS}
                            onChange={setAttr('flavor')}
                            placeholder="Select"
                        />
                    )}

                    {validCategory === 'sugar' && (
                        <Dropdown
                            label="Sweetener Type"
                            value={categoryAttrs.type || ''}
                            options={SUGAR_TYPE_OPTIONS}
                            onChange={setAttr('type')}
                            placeholder="Select"
                        />
                    )}

                    {validCategory === 'other_ingredient' && (
                        <Dropdown
                            label="Ingredient Type"
                            value={categoryAttrs.type || ''}
                            options={OTHER_INGREDIENT_OPTIONS}
                            onChange={setAttr('type')}
                            placeholder="Select"
                        />
                    )}

                    {validCategory === 'dripper' && (
                        <div className="grid grid-cols-2 gap-3">
                            <Dropdown
                                label="Shape"
                                value={categoryAttrs.shape || ''}
                                options={DRIPPER_SHAPE_OPTIONS}
                                onChange={setAttr('shape')}
                                placeholder="Select"
                            />
                            <Dropdown
                                label="Material"
                                value={categoryAttrs.material || ''}
                                options={GEAR_MATERIAL_OPTIONS}
                                onChange={setAttr('material')}
                                placeholder="Select"
                            />
                        </div>
                    )}

                    {validCategory === 'grinder' && (
                        <div className="grid grid-cols-2 gap-3">
                            <Dropdown
                                label="Burr Type"
                                value={categoryAttrs.burr || ''}
                                options={GRINDER_BURR_OPTIONS}
                                onChange={setAttr('burr')}
                                placeholder="Select"
                            />
                            <Dropdown
                                label="Drive Mechanism"
                                value={categoryAttrs.drive || ''}
                                options={GRINDER_DRIVE_OPTIONS}
                                onChange={setAttr('drive')}
                                placeholder="Select"
                            />
                        </div>
                    )}

                    {validCategory === 'kettle' && (
                        <Dropdown
                            label="Kettle Type"
                            value={categoryAttrs.type || ''}
                            options={KETTLE_TYPE_OPTIONS}
                            onChange={setAttr('type')}
                            placeholder="Select"
                        />
                    )}

                    {validCategory === 'machine' && (
                        <Dropdown
                            label="Machine Type"
                            value={categoryAttrs.type || ''}
                            options={MACHINE_TYPE_OPTIONS}
                            onChange={setAttr('type')}
                            placeholder="Select"
                        />
                    )}

                    {['french_press', 'aeropress', 'scale', 'accessory'].includes(validCategory) && (
                        <Dropdown
                            label="Material / Build"
                            value={categoryAttrs.material || ''}
                            options={GEAR_MATERIAL_OPTIONS}
                            onChange={setAttr('material')}
                            placeholder="Select"
                        />
                    )}

                    <div className="space-y-1.5 pt-1">
                        <label className="typescale-label-medium font-bold uppercase tracking-wider text-md-on-surface-variant">
                            {validCategory === 'beans' ? 'Tasting Notes' : 'Notes & Description'}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder={validCategory === 'beans' ? "e.g. Jasmine, Peach, Honey..." : "Any additional details..."}
                            className="w-full bg-md-surface-container-high border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/70 rounded-xl px-4 py-3 typescale-body-medium focus:ring-2 focus:ring-md-primary/40 outline-none resize-none"
                        />
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Save Action */}
            <SaveBar onClick={handleSave} disabled={!name.trim()} saving={loading} label="Save Item" />
        </div>
    );
};
