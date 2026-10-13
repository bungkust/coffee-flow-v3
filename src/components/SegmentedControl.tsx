interface SegmentedOption<T extends string> {
    value: T;
    label: string;
}

interface SegmentedControlProps<T extends string> {
    value: T;
    options: SegmentedOption<T>[];
    name: string;
    onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ value, options, name, onChange }: SegmentedControlProps<T>) {
    return (
        <div className="flex h-10 w-full items-center justify-center rounded-full bg-md-surface-container-high p-1">
            {options.map(option => (
                <label key={option.value} className="group relative flex flex-1 cursor-pointer items-center justify-center rounded-full py-1.5 transition-all">
                    <input
                        checked={value === option.value}
                        onChange={() => onChange(option.value)}
                        className="peer sr-only"
                        name={name}
                        type="radio"
                        value={option.value}
                    />
                    <span className="z-10 typescale-label-large text-md-on-surface-variant peer-checked:text-md-on-secondary-container peer-checked:font-bold transition-colors">{option.label}</span>
                    <div className="absolute inset-0 z-0 rounded-full bg-md-secondary-container shadow-sm opacity-0 peer-checked:opacity-100 transition-all duration-200"></div>
                </label>
            ))}
        </div>
    );
}
