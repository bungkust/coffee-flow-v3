export const TASTE_RATINGS = [
    {
        value: 1,
        label: 'Bad',
        activeClass: 'bg-amber-900/90 text-amber-50 shadow-xs ring-1 ring-amber-950/20',
        badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30'
    },
    {
        value: 2,
        label: 'Drinkable',
        activeClass: 'bg-stone-600 text-stone-50 shadow-xs ring-1 ring-stone-700/20',
        badgeClass: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30'
    },
    {
        value: 3,
        label: 'Good',
        activeClass: 'bg-emerald-700 text-emerald-50 shadow-xs ring-1 ring-emerald-800/20',
        badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    },
    {
        value: 4,
        label: 'Delicious',
        activeClass: 'bg-md-primary text-md-on-primary shadow-xs ring-1 ring-md-primary/30',
        badgeClass: 'bg-md-primary/15 text-md-primary border-md-primary/30'
    },
    {
        value: 5,
        label: 'Exceptional',
        activeClass: 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-50 shadow-sm ring-1 ring-amber-600/30',
        badgeClass: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold'
    }
] as const;

export function getTasteRating(value?: number | null) {
    return value ? TASTE_RATINGS[value - 1] || null : null;
}

export function getTasteRatingLabel(value?: number | null): string {
    return getTasteRating(value)?.label || '';
}

export function TasteRatingBadge({ rating }: { rating?: number | null }) {
    const item = getTasteRating(rating);
    if (!item) return null;

    return (
        <span className={`inline-flex items-center rounded-md border font-semibold leading-none tracking-tight px-1.5 py-0.5 text-[10px] ${item.badgeClass}`}>
            {item.label}
        </span>
    );
}

interface TasteRatingSelectorProps {
    value?: number | null;
    onChange?: (value: number | undefined) => void;
}

export function TasteRatingSelector({ value, onChange }: TasteRatingSelectorProps) {
    return (
        <div className="grid grid-cols-5 gap-1 p-1 bg-md-surface-container-high rounded-xl border border-md-outline-variant/30">
            {TASTE_RATINGS.map((item) => {
                const isSelected = value === item.value;
                return (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => onChange?.(value === item.value ? undefined : item.value)}
                        className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all cursor-pointer ${
                            isSelected
                                ? item.activeClass
                                : 'text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container-highest/60'
                        }`}
                    >
                        <span className="text-[11px] sm:text-xs font-bold truncate max-w-full leading-tight">
                            {item.label}
                        </span>
                        <span className={`text-[9px] mt-0.5 font-medium leading-none ${
                            isSelected ? 'opacity-90' : 'text-md-on-surface-variant/60'
                        }`}>
                            {item.value}/5
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
