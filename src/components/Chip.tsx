import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    variant?: 'primary' | 'secondary' | 'outline' | 'filter' | 'assist';
    icon?: ReactNode;
    children: ReactNode;
}

export const Chip = ({ className, children, active, variant = 'outline', icon, ...props }: ChipProps) => {
    return (
        <button
            className={twMerge(
                "inline-flex items-center justify-center gap-2 h-8 px-4 text-xs font-semibold rounded-full transition-all duration-200 ease-md-standard select-none cursor-pointer active:scale-95 disabled:opacity-38 disabled:pointer-events-none",
                active
                    ? "bg-md-secondary-container text-md-on-secondary-container shadow-sm border-none"
                    : "bg-md-surface-container-low border border-md-outline/40 text-md-on-surface-variant hover:bg-md-surface-container-high hover:border-md-outline",
                className
            )}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
};

