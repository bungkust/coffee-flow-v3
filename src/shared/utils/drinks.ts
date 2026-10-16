const DRINK_IMAGES: Record<string, string> = {
    espresso: '/assets/drinks/espresso.png',
    cappuccino: '/assets/drinks/cappuccino.png',
    latte: '/assets/drinks/latte.png',
    flat_white: '/assets/drinks/flat_white.png',
    mocha: '/assets/drinks/mocha.png',
    cold_brew: '/assets/drinks/cold_brew.png',
    americano: '/assets/drinks/americano.png',
    macchiato: '/assets/drinks/espresso.png',
    matcha_latte: '/assets/drinks/matcha_latte.png',
    iced_chocolate: '/assets/drinks/non_coffee.png',
    chai_latte: '/assets/drinks/non_coffee.png',
    non_coffee: '/assets/drinks/non_coffee.png',
};

export const getDrinkImage = (drink: { id: string; image_url?: string; base_type?: string }) =>
    drink.image_url ||
    DRINK_IMAGES[drink.id] ||
    (drink.base_type === 'non_coffee' ? '/assets/drinks/non_coffee.png' : '/assets/drinks/espresso.png');

export const parseList = (json: string): string[] => {
    try {
        return JSON.parse(json);
    } catch {
        return [];
    }
};

export interface ParsedIngredient {
    original: string;
    amount: number | null;
    unit: string | null;
    name: string;
}

export const parseIngredient = (raw: string): ParsedIngredient => {
    const trimmed = raw.trim();
    const match = trimmed.match(/^([\d./]+)\s*([a-zA-Z]+)?\s+(.*)$/);
    if (!match) {
        return { original: trimmed, amount: null, unit: null, name: trimmed };
    }
    let amount: number | null = null;
    if (match[1].includes('/')) {
        const parts = match[1].split('/');
        if (parts.length === 2) {
            amount = parseFloat(parts[0]) / parseFloat(parts[1]);
        }
    } else {
        amount = parseFloat(match[1]);
    }
    if (isNaN(amount as number)) {
        return { original: trimmed, amount: null, unit: null, name: trimmed };
    }
    const unit = match[2] ? match[2].trim() : null;
    const name = match[3] ? match[3].trim() : '';
    return { original: trimmed, amount, unit, name };
};

export const formatScaledIngredient = (raw: string, scale: number): string => {
    if (scale === 1) return raw;
    const parsed = parseIngredient(raw);
    if (parsed.amount === null) return raw;
    const scaledAmount = Math.round(parsed.amount * scale * 10) / 10;
    const unitStr = parsed.unit ? ` ${parsed.unit}` : '';
    return `${scaledAmount}${unitStr} ${parsed.name}`.trim();
};

