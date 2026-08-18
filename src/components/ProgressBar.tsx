interface ProgressBarProps {
    progress: number;
    label?: string;
    valueLabel?: string;
}

export const ProgressBar = ({ progress, label, valueLabel }: ProgressBarProps) => {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
        <div className="w-full">
            {(label || valueLabel) && (
                <div className="flex justify-between typescale-label-medium text-md-on-surface-variant mb-1.5">
                    {label && <span>{label}</span>}
                    {valueLabel && <span className="font-semibold text-md-on-surface">{valueLabel}</span>}
                </div>
            )}
            <div className="w-full bg-md-secondary-container rounded-full h-2 overflow-hidden">
                <div
                    className="bg-md-primary h-2 rounded-full transition-all duration-300 ease-md-standard"
                    style={{ width: `${clampedProgress}%` }}
                ></div>
            </div>
        </div>
    );
};

