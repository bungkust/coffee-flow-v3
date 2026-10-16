export interface StatCardProps {
    label: string;
    value: string | number;
    className?: string;
}

export const StatCard = ({ label, value, className = '' }: StatCardProps) => (
    <div className={`flex-1 bg-md-surface-container-high rounded-md py-1.5 px-2 text-center border border-md-outline-variant/20 min-w-0 ${className}`}>
        <span className="block typescale-label-small text-md-on-surface-variant font-bold uppercase tracking-wide truncate">
            {label}
        </span>
        <span className="block typescale-label-large font-bold text-md-primary truncate">
            {value}
        </span>
    </div>
);
