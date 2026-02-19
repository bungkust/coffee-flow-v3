import clsx from 'clsx';
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
                <label className={clsx("text-sm font-semibold", error ? "text-red-600" : (active ? "text-primary" : "text-neutral-text"))}>
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon name={icon} className="text-[20px]" />
                    </div>
                )}
                <input
                    className={twMerge(
                        "w-full rounded-lg px-4 py-3 text-neutral-text transition-all focus:outline-none",
                        "bg-white",
                        // Base border and focus states
                        !error && !active && "border border-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent",
                        // Active State (Visual)
                        active && "border-2 border-primary ring-0 outline-none shadow-[0_0_0_4px_rgba(184,102,20,0.1)]",
                        // Error State
                        error && "border border-red-500 text-red-900 focus:ring-2 focus:ring-red-200",
                        icon ? "pl-10" : "",
                        className
                    )}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {rightElement}
                    </div>
                )}
                {error && (
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-xl">error</span>
                )}
            </div>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
};
