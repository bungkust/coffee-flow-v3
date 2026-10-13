/** Days since the roast date, or null when the bean carries no roast date. */
export const daysOffRoast = (roastDate?: string): number | null => {
    if (!roastDate) return null;
    const roasted = new Date(roastDate).getTime();
    if (Number.isNaN(roasted)) return null;
    return Math.max(0, Math.floor((Date.now() - roasted) / 864e5));
};

/** Rough drinking window: beans need a few days to degas, then fade. */
export const freshnessLabel = (days: number): string => {
    if (days <= 3) return 'resting';
    if (days <= 21) return 'fresh';
    return 'past peak';
};
