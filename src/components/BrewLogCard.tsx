import { MethodImage } from './MethodImage';

interface BrewLogCardProps {
    image?: string;
    icon?: string;
    name: string;
    subtitle: string;
    date: string;
    tags?: string[];
    notes?: string;
    onClick: () => void;
}

export const BrewLogCard = ({ image, icon, name, subtitle, date, tags = [], notes, onClick }: BrewLogCardProps) => (
    <div
        onClick={onClick}
        className="group relative flex items-start gap-3 rounded-2xl bg-md-surface-container-low p-3 shadow-xs border border-md-outline-variant/30 transition-all hover:border-md-primary/40 active:scale-[0.99] cursor-pointer"
    >
        <div className="flex-shrink-0 pt-0.5">
            <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-md-surface-container-high border border-md-outline-variant/30">
                <MethodImage src={image} alt={name} icon={icon} size="sm" />
            </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* Row 1: Title & Time */}
            <div className="flex items-baseline justify-between gap-2">
                <h4 className="min-w-0 truncate typescale-title-small font-bold text-md-on-surface">
                    {name}
                </h4>
                <span className="shrink-0 typescale-label-small font-semibold text-md-on-surface-variant/70">
                    {date}
                </span>
            </div>

            {/* Row 2: Subtitle & Tags inline flow */}
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {subtitle && (
                    <span className="truncate typescale-body-small font-medium text-md-on-surface-variant">
                        {subtitle}
                    </span>
                )}
                {tags.slice(0, 2).map(tag => (
                    <span key={tag} className="rounded-md bg-md-primary/10 border border-md-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-md-primary leading-none">
                        {tag}
                    </span>
                ))}
                {tags.length > 2 && (
                    <span className="text-[10px] font-bold text-md-on-surface-variant/60">+{tags.length - 2}</span>
                )}
            </div>

            {/* Row 3: Tasting notes (clean inline quote, no bloated container) */}
            {notes && (
                <p className="line-clamp-1 typescale-body-small italic text-md-on-surface-variant/80">
                    "{notes}"
                </p>
            )}
        </div>
    </div>
);
