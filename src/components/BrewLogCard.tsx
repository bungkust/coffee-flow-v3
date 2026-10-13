import { Icon } from './Icons';
import { MethodImage } from './MethodImage';

interface BrewLogCardProps {
    image?: string;
    icon?: string;
    name: string;
    subtitle: string;
    date: string;
    rating?: number;
    tags?: string[];
    notes?: string;
    onClick: () => void;
}

export const BrewLogCard = ({ image, icon, name, subtitle, date, rating, tags = [], notes, onClick }: BrewLogCardProps) => (
    <div onClick={onClick} className="group relative flex items-start gap-4 rounded-xl bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-[#f4f2f0] transition-all hover:border-primary/30 cursor-pointer">
        <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                <MethodImage src={image} alt={name} icon={icon} size="sm" />
            </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
                <h4 className="min-w-0 truncate font-bold text-[#181411]">
                    {name}
                </h4>
                <span className="flex shrink-0 items-center gap-1 typescale-label-small font-bold text-[#181411]">
                    <Icon name="star" className="text-[15px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }} />
                    {rating && rating > 0 ? rating.toFixed(1) : '—'}
                </span>
            </div>
            <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs font-medium text-gray-500">
                    {subtitle}
                </p>
                <span className="shrink-0 text-xs font-semibold text-gray-500">
                    {date}
                </span>
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                    {tags.slice(0, 3).map(tag => (
                        <span key={tag} className="rounded-full border border-md-primary/20 bg-md-primary-container/40 px-2 py-0.5 typescale-label-small font-bold text-md-primary">
                            {tag}
                        </span>
                    ))}
                    {tags.length > 3 && (
                        <span className="typescale-label-small font-bold text-gray-400">+{tags.length - 3}</span>
                    )}
                </div>
            )}
            {notes && (
                <p className="line-clamp-1 text-sm text-gray-500/90 leading-relaxed">
                    "{notes}"
                </p>
            )}
        </div>
    </div>
);
