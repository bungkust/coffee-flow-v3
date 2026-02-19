import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
    children: ReactNode;
}

export const Chip = ({ className, children, active, variant = 'outline', ...props }: ChipProps) => {
    const variants = {
        primary: 'bg-primary text-white shadow-sm',
        secondary: 'bg-secondary text-primary border border-secondary hover:bg-secondary/80',
        outline: 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50',
    };

    // If active is explicitly true, use primary variant styles, typically.
    // Or we can rely on proper variant usage.
    // Based on HTML:
    // Active: bg-primary text-white
    // Secondary: bg-secondary text-primary
    // Default: bg-white border border-gray-300

    return (
        <button
            className={twMerge(
                "text-sm font-semibold px-4 py-2 rounded-full transition-colors",
                active ? variants.primary : variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
