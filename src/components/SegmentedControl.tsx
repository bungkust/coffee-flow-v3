interface SegmentedOption<T extends string> {
    value: T;
    label: string;
}

interface SegmentedControlProps<T extends string> {
    value: T;
    options: SegmentedOption<T>[];
    name?: string;
    onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ value, options, onChange }: SegmentedControlProps<T>) {
    return (
        <div role="tablist" className="flex h-11 w-full items-center justify-center rounded-full bg-md-surface-container-high p-1 shadow-inner">
            {options.map(option => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => {
                            if (!isActive) {
                                navigator.vibrate?.(12);
                                onChange(option.value);
                            }
                        }}
                        className={`relative flex-1 rounded-full py-2 typescale-label-medium transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                            isActive
                                ? 'bg-md-secondary-container text-md-on-secondary-container font-bold shadow-xs'
                                : 'text-md-on-surface-variant hover:text-md-on-surface'
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
