import type { HTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    children: ReactNode;
    variant?: 'default' | 'primary' | 'tertiary' | 'success' | 'warning' | 'error';
}

export const Badge = ({ className, children, variant = 'default', ...props }: BadgeProps) => {
    const variants = {
        default: 'bg-md-secondary-container text-md-on-secondary-container',
        primary: 'bg-md-primary-container text-md-on-primary-container',
        tertiary: 'bg-md-tertiary-container text-md-on-tertiary-container',
        success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
        error: 'bg-md-error-container text-md-on-error-container',
    };

    return (
        <span
            className={twMerge(
                "px-2.5 py-0.5 rounded-full typescale-label-small inline-flex items-center gap-1 font-semibold",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
};

