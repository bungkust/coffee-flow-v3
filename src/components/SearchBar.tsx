import { Icon } from './Icons';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    clearable?: boolean;
    className?: string;
}

export const SearchBar = ({ value, onChange, placeholder, clearable, className }: SearchBarProps) =>
    clearable ? (
        <div className="relative">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-md-on-surface-variant text-xl" />
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-on-surface-variant/70 typescale-body-medium rounded-full pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-md-primary/40 border border-md-outline-variant/30 transition-all" />
            {value && (
                <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant hover:text-md-on-surface cursor-pointer">
                    <Icon name="close" className="text-lg" />
                </button>
            )}
        </div>
    ) : (
        <div className={`relative ${className ?? ''}`}>
            <span className="absolute inset-y-0 left-3.5 flex items-center text-md-on-surface-variant">
                <Icon name="search" className="text-xl" />
            </span>
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="text" className="w-full bg-md-surface-container-high text-md-on-surface placeholder:text-md-outline/60 rounded-full py-3 pl-11 pr-4 border-none shadow-none focus:outline-none focus:ring-2 focus:ring-md-primary typescale-body-large transition-all" />
        </div>
    );
