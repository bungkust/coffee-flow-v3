export const VARIETY_OPTIONS = [
    { value: 'Arabica', label: 'Arabica' },
    { value: 'Robusta', label: 'Robusta' },
    { value: 'Liberica', label: 'Liberica' },
    { value: 'Excelsa', label: 'Excelsa' },
    { value: 'Blend', label: 'Blend' },
    { value: 'Other', label: 'Other' }
];

export const PROCESS_OPTIONS = [
    { value: 'Washed', label: 'Washed' },
    { value: 'Natural', label: 'Natural' },
    { value: 'Honey', label: 'Honey' },
    { value: 'Full Washed', label: 'Full Washed' },
    { value: 'Semi Washed', label: 'Semi Washed' },
    { value: 'Anaerobic', label: 'Anaerobic' },
    { value: 'Experimental', label: 'Experimental' },
    { value: 'Other', label: 'Other' }
];

export const ROAST_LEVEL_OPTIONS = [
    { value: 'light', label: 'Light' },
    { value: 'medium', label: 'Medium' },
    { value: 'dark', label: 'Dark' }
];

export const VARIETY_VALUES = VARIETY_OPTIONS.map((o) => o.value);
export const PROCESS_VALUES = PROCESS_OPTIONS.map((o) => o.value);
export const ROAST_VALUES = ROAST_LEVEL_OPTIONS.map((o) => o.value);

export interface BeanTagFields {
    origin: string;
    variety: string;
    process: string;
    altitude: string;
    roastLevel: string;
}

export const parseBeanTags = (tags: string[]): { fields: BeanTagFields; preserved: string[] } => {
    const fields: BeanTagFields = { origin: '', variety: '', process: '', altitude: '', roastLevel: '' };
    const preserved: string[] = [];
    let originTaken = false;
    for (const tag of tags) {
        if (tag.includes('%')) {
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
    [fields.origin, fields.variety, fields.process, fields.altitude, fields.roastLevel]
        .map((s) => s.trim())
        .filter(Boolean);

export const buildBlendTags = (components: Array<{ type: string; origin: string; percentage: string }>): string[] =>
    components
        .filter((c) => c.type || c.origin || c.percentage)
        .map((c) => [c.type, c.percentage && `${c.percentage}%`, c.origin].filter(Boolean).join(' '));

export const parseQuantity = (value: string): number | undefined => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
};
