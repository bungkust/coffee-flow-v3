export interface TasteProfileValues {
    sweetness?: number;
    acidity?: number;
    body?: number;
    bitterness?: number;
}

export const PROFILE_FIELDS = [
    { key: 'sweetness', label: 'Sweetness' },
    { key: 'acidity', label: 'Acidity' },
    { key: 'body', label: 'Body' },
    { key: 'bitterness', label: 'Bitterness' }
] as const;

export const describeProfile = (value: number) => {
    if (value < 20) return 'Very Low';
    if (value < 40) return 'Low';
    if (value < 60) return 'Balanced';
    if (value < 80) return 'Medium-High';
    return 'High';
};

export const PRESET_FLAVOR_TAGS = ['Fruity', 'Nutty', 'Chocolatey', 'Floral', 'Spicy'];

export const parseFlavorTags = (value?: string): string[] =>
    value ? value.split(',').map(tag => tag.trim()).filter(Boolean) : [];

export const serializeFlavorTags = (tags: string[]): string | undefined =>
    tags.length > 0 ? tags.join(',') : undefined;
