import type { HTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type CardVariant = 'elevated' | 'filled' | 'outlined';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    children: ReactNode;
}

export const Card = ({ className, variant = 'outlined', children, ...props }: CardProps) => {
    const variants: Record<CardVariant, string> = {
        elevated: 'bg-md-surface-container-low shadow-md-1 border-none text-md-on-surface',
        filled: 'bg-md-surface-container-high border-none text-md-on-surface',
        outlined: 'bg-md-surface border border-md-outline-variant text-md-on-surface',
    };

    return (
        <div
            className={twMerge(
                "rounded-lg overflow-hidden transition-all duration-200 ease-md-standard",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

