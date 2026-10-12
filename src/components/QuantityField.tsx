interface QuantityFieldProps {
    value: string;
    onChange: (value: string) => void;
    unit: string;
    placeholder?: string;
}

export const QuantityField = ({ value, onChange, unit, placeholder }: QuantityFieldProps) => (
    <div className="flex bg-md-surface-container-high border border-md-outline-variant/30 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-md-primary/40">
        <input
            type="number"
            min="0"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-4 py-3 bg-transparent typescale-body-medium text-md-on-surface placeholder:text-md-on-surface-variant/70 outline-none"
        />
        <div className="bg-md-surface-container-highest border-l border-md-outline-variant/30 px-4 py-3 typescale-label-medium font-bold text-md-on-surface-variant uppercase flex items-center justify-center">
            {unit}
        </div>
    </div>
);
