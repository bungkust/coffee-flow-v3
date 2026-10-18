export const ROAST_LEVEL_OPTIONS = [
    { value: 'light', label: 'Light' },
    { value: 'medium', label: 'Medium' },
    { value: 'dark', label: 'Dark' }
];

export const SPECIES_OPTIONS = [
    { value: 'Arabica', label: 'Arabika' },
    { value: 'Robusta', label: 'Robusta' },
    { value: 'Liberica', label: 'Liberika' },
    { value: 'Excelsa', label: 'Excelsa' }
];

export const TASTE_OPTIONS = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' }
];

export const VARIETY_OPTIONS = [
    // Ancestral & classic lines
    { value: 'Typica', label: 'Typica' },
    { value: 'Bourbon', label: 'Bourbon' },
    // Natural mutations & landraces
    { value: 'Caturra', label: 'Caturra' },
    { value: 'Pacas', label: 'Pacas' },
    { value: 'Pache', label: 'Pache' },
    { value: 'Pink Bourbon', label: 'Pink Bourbon' },
    { value: 'Maragogype', label: 'Maragogype' },
    { value: 'Geisha / Gesha', label: 'Geisha / Gesha' },
    { value: 'Abyssinia', label: 'Abyssinia' },
    { value: 'Laurina', label: 'Laurina' },
    // Hybrids & breeding
    { value: 'Hibrido de Timor', label: 'Hibrido de Timor (HdT)' },
    { value: 'Catimor', label: 'Catimor' },
    { value: 'Catuai', label: 'Catuai' },
    { value: 'Mundo Novo', label: 'Mundo Novo' },
    { value: 'Pacamara', label: 'Pacamara' },
    { value: 'Castillo', label: 'Castillo' },
    { value: 'Colombia', label: 'Colombia' },
    { value: 'SL28', label: 'SL28' },
    { value: 'SL34', label: 'SL34' },
    { value: 'SL9', label: 'SL9 (Selection 9)' },
    { value: 'Ruiru 11', label: 'Ruiru 11' },
    { value: 'Batian', label: 'Batian' },
    // Indonesian heritage cultivars
    { value: 'Sigarar Utang', label: 'Sigarar Utang' },
    { value: 'Gayo 1', label: 'Gayo 1 (TimTim Aceh)' },
    { value: 'Gayo 2', label: 'Gayo 2 (Borbor)' },
    { value: 'Andung Sari', label: 'Andung Sari (Andungsari-1)' },
    { value: 'S795', label: 'S795 (Jember / S-Line)' },
    { value: 'USDA 762', label: 'USDA 762' },
    { value: 'Ateng', label: 'Ateng / Ateng Super' },
    { value: 'Rasuna', label: 'Rasuna' },
    // Robusta & other species
    { value: 'Robusta', label: 'Robusta (clone)' },
    { value: 'Liberica', label: 'Liberika / Barako' },
    { value: 'Excelsa', label: 'Excelsa (Dewevrei)' },
    { value: 'Other', label: 'Other' }
];

// Includes legacy species-level values that may exist in older, unprefixed tags.
export const VARIETY_VALUES = [...VARIETY_OPTIONS.map((o) => o.value), 'Arabica', 'Blend'];

export const PROCESS_OPTIONS = [
    { value: 'Washed', label: 'Washed' },
    { value: 'Fully Washed', label: 'Fully Washed' },
    { value: 'Natural', label: 'Natural' },
    { value: 'Dry Process', label: 'Dry Process' },
    { value: 'Honey', label: 'Honey' },
    { value: 'Semi-Dry', label: 'Semi-Dry' },
    { value: 'Pulped Natural', label: 'Pulped Natural' },
    { value: 'White Honey', label: 'White Honey' },
    { value: 'Yellow Honey', label: 'Yellow Honey' },
    { value: 'Red Honey', label: 'Red Honey' },
    { value: 'Black Honey', label: 'Black Honey' },
    { value: 'Giling Basah', label: 'Giling Basah' },
    { value: 'Wet-Hulled', label: 'Wet-Hulled' },
    { value: 'Blue Honey', label: 'Blue Honey (Wet-Hulled Honey)' },
    { value: 'Anaerobic Fermentation', label: 'Anaerobic Fermentation' },
    { value: 'SIAF', label: 'SIAF (Self-Induced Anaerobic Fermentation)' },
    { value: 'Carbonic Maceration', label: 'Carbonic Maceration (CM)' },
    { value: 'Thermal Shock', label: 'Thermal Shock Fermentation' },
    { value: 'Hydro Honey', label: 'Hydro Honey (Natural Hydro-Honey)' },
    { value: 'Anaerobic Honey', label: 'Anaerobic Honey' },
    { value: 'Anaerobic Washed', label: 'Anaerobic Washed' },
    { value: 'Culture Inoculation', label: 'Culture Inoculation' },
    { value: 'Biomimetic', label: 'Biomimetic Fermentation' },
    { value: 'Co-Fermentation', label: 'Co-Fermentation' },
    { value: 'Other', label: 'Other' }
];

// Includes legacy values that may exist in older, unprefixed tags.
export const PROCESS_VALUES = [...PROCESS_OPTIONS.map((o) => o.value), 'Full Washed', 'Semi Washed', 'Anaerobic', 'Experimental'];
export const ROAST_VALUES = ROAST_LEVEL_OPTIONS.map((o) => o.value);

export interface BeanTagFields {
    species: string;
    origin: string;
    variety: string;
    process: string;
    altitude: string;
    roastLevel: string;
    producer: string;
    sweet: string;
    acid: string;
    body: string;
    bitter: string;
}

// Bean fields round-trip as "field:value" tags so free-text values
// (e.g. variety "Red Caturra, Lini S-975") survive a save/edit cycle.
const TAG_FIELDS = ['species', 'origin', 'variety', 'process', 'altitude', 'roast', 'producer', 'sweet', 'acid', 'body', 'bitter'] as const;

type TagField = (typeof TAG_FIELDS)[number];

// roast is the only tag name that differs from its field name.
const FIELD_KEY = Object.fromEntries(
    TAG_FIELDS.map((field) => [field, field === 'roast' ? 'roastLevel' : field])
) as Record<TagField, keyof BeanTagFields>;

export const stripTagPrefix = (tag: string): string => {
    if (tag.startsWith('blend:')) return tag.slice(6);
    const match = tag.match(/^([a-z_]+):(.*)$/i);
    return match ? match[2].trim() : tag;
};

export const parseBeanTags = (tags: string[]): { fields: BeanTagFields; preserved: string[] } => {
    const fields: BeanTagFields = { species: '', origin: '', variety: '', process: '', altitude: '', roastLevel: '', producer: '', sweet: '', acid: '', body: '', bitter: '' };
    const preserved: string[] = [];
    let originTaken = false;
    for (const tag of tags) {
        if (tag.startsWith('blend:') || tag.includes('%')) {
            preserved.push(tag);
            continue;
        }
        const prefixed = tag.match(/^([a-z]+):(.*)$/);
        if (prefixed && FIELD_KEY[prefixed[1] as TagField]) {
            fields[FIELD_KEY[prefixed[1] as TagField]] = prefixed[2].trim();
            continue;
        }
        if (prefixed) {
            preserved.push(tag);
            continue;
        }
        if (VARIETY_VALUES.includes(tag) && !fields.variety) fields.variety = tag;
        else if (PROCESS_VALUES.includes(tag) && !fields.process) fields.process = tag;
        else if (ROAST_VALUES.includes(tag) && !fields.roastLevel) fields.roastLevel = tag;
        else if ((/masl/i.test(tag) || /^\d+(\.\d+)?$/.test(tag)) && !fields.altitude) fields.altitude = tag;
        else if (!originTaken) { fields.origin = tag; originTaken = true; }
        else preserved.push(tag);
    }
    return { fields, preserved };
};

export const formatBeanTags = (fields: BeanTagFields): string[] =>
    TAG_FIELDS
        .filter((field) => fields[FIELD_KEY[field]].trim())
        .map((field) => `${field}:${fields[FIELD_KEY[field]].trim()}`);

export interface BlendComponent {
    type: string;
    origin: string;
    percentage: string;
    variety: string;
    process: string;
}

export const buildBlendTags = (components: BlendComponent[]): string[] =>
    components
        .filter((c) => c.type || c.origin || c.percentage || c.variety || c.process)
        .map((c) =>
            'blend:' +
            [c.type, c.percentage && `${c.percentage}%`, c.origin, c.variety, c.process]
                .map((part) => part.trim())
                .filter(Boolean)
                .join(' | ')
        );

export const parseQuantity = (value: string): number | undefined => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
};
