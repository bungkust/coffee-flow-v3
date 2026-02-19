interface ProgressBarProps {
    progress: number;
    label?: string;
    valueLabel?: string;
}

export const ProgressBar = ({ progress, label, valueLabel }: ProgressBarProps) => {
    return (
        <div>
            {(label || valueLabel) && (
                <div className="flex justify-between text-xs font-medium text-slate-600 mb-2">
                    {label && <span>{label}</span>}
                    {valueLabel && <span>{valueLabel}</span>}
                </div>
            )}
            <div className="w-full bg-stone-200 rounded-full h-2">
                <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                ></div>
            </div>
        </div>
    );
};
