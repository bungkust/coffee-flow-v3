import { twMerge } from 'tailwind-merge';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icons';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: string;
    rightElement?: ReactNode;
    active?: boolean;
}

export const Input = ({
    className,
    label,
    error,
    icon,
    rightElement,
    active,
    ...props
}: InputProps) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className={twMerge(
                    "typescale-label-medium transition-colors duration-200 block",
                    error ? "text-md-error" : (active ? "text-md-primary font-semibold" : "text-md-on-surface-variant")
                )}>
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-md-on-surface-variant">
                        <Icon name={icon} className="text-xl" />
                    </div>
                )}
                <input
                    className={twMerge(
                        "w-full rounded-sm px-4 py-3 text-md-on-surface bg-md-surface-container-lowest transition-all duration-200 ease-md-standard focus:outline-none placeholder:text-md-outline/60 typescale-body-large",
                        !error && !active && "border border-md-outline focus:border-2 focus:border-md-primary",
                        active && "border-2 border-md-primary ring-2 ring-md-primary/15",
                        error && "border-2 border-md-error text-md-error focus:ring-2 focus:ring-md-error/20",
                        icon ? "pl-11" : "",
                        rightElement ? "pr-12" : "",
                        className
                    )}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-md-on-surface-variant">
                        {rightElement}
                    </div>
                )}
                {error && !rightElement && (
                    <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-md-error text-xl">error</span>
                )}
            </div>
            {error && (
                <p className="typescale-body-small mt-1 px-1 text-md-error font-medium">
                    {error}
                </p>
            )}
        </div>
    );
};
