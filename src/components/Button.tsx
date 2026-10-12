import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'filled' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: 'sm' | 'md' | 'lg';
    active?: boolean;
    icon?: ReactNode;
    children: ReactNode;
}

export const Button = ({
    className,
    variant = 'filled',
    size = 'md',
    active = false,
    icon,
    children,
    ...props
}: ButtonProps) => {
    const baseStyles = 'transition-all duration-200 ease-md-standard active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:shadow-none select-none';

    const variants: Record<ButtonVariant, string> = {
        filled: 'bg-md-primary text-md-on-primary hover:bg-md-primary/90 font-medium shadow-none',
        secondary: 'bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/80 font-medium',
        ghost: 'bg-transparent text-md-on-surface-variant hover:bg-md-surface-container-highest font-medium',
    };

    const sizes = {
        sm: 'h-9 px-4 text-xs rounded-full',
        md: 'h-11 px-6 text-sm rounded-full tracking-wide',
        lg: 'h-14 px-8 text-base rounded-full tracking-wide font-semibold',
    };

    return (
        <button
            className={twMerge(
                baseStyles,
                variants[variant],
                sizes[size],
                active && 'bg-md-secondary-container text-md-on-secondary-container shadow-sm border-none',
                className
            )}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
};
