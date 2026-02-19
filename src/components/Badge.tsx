import type { HTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    children: ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Badge = ({ className, children, variant = 'default', ...props }: BadgeProps) => {
    const variants = {
        default: 'bg-primary/10 text-primary',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        error: 'bg-red-100 text-red-700',
    };

    return (
        <span
            className={twMerge(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
};
