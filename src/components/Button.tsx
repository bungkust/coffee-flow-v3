import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated' | 'primary' | 'secondary' | 'ghost' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
}

export const Button = ({
    className,
    variant = 'filled',
    size = 'md',
    children,
    ...props
}: ButtonProps) => {
    const baseStyles = 'transition-all duration-200 ease-md-standard active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-38 disabled:pointer-events-none select-none';

    const variants: Record<ButtonVariant, string> = {
        filled: 'bg-md-primary text-md-on-primary hover:bg-md-primary/90 font-medium shadow-none',
        primary: 'bg-md-primary text-md-on-primary hover:bg-md-primary/90 font-medium shadow-none', // Legacy alias
        tonal: 'bg-md-primary-container text-md-on-primary-container hover:bg-md-primary-container/80 font-medium',
        secondary: 'bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/80 font-medium', // Legacy alias
        outlined: 'bg-transparent border border-md-outline text-md-primary hover:bg-md-primary/10 font-medium',
        text: 'bg-transparent text-md-primary hover:bg-md-primary/10 font-medium',
        ghost: 'bg-transparent text-md-on-surface-variant hover:bg-md-surface-container-highest font-medium', // Legacy alias
        elevated: 'bg-md-surface-container-low text-md-primary shadow-md-1 hover:shadow-md-2 hover:bg-md-surface-container-high font-medium',
        icon: 'rounded-full flex items-center justify-center p-0 text-md-on-surface-variant hover:bg-md-surface-container-highest text-2xl',
    };

    const sizes = {
        sm: 'h-9 px-4 text-xs rounded-full',
        md: 'h-11 px-6 text-sm rounded-full tracking-wide',
        lg: 'h-14 px-8 text-base rounded-full tracking-wide font-semibold',
    };

    const resolvedVariant = variants[variant] || variants.filled;

    return (
        <button
            className={twMerge(
                baseStyles,
                resolvedVariant,
                variant !== 'icon' && sizes[size],
                variant === 'icon' && 'size-10 rounded-full',
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

