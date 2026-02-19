import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
}

export const Button = ({
    className,
    variant = 'primary',
    size = 'md',
    children,
    ...props
}: ButtonProps) => {
    const baseStyles = 'transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-primary hover:bg-primary/90 text-white font-bold shadow-sm',
        secondary: 'bg-transparent border-2 border-primary text-primary font-bold hover:bg-primary/5',
        ghost: 'bg-transparent text-gray-600 font-semibold hover:bg-gray-100',
        icon: 'rounded-full flex items-center justify-center p-0',
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs rounded',
        md: 'h-12 px-6 text-base rounded-lg', // "Start Brewing" main button size
        lg: 'h-14 px-8 text-lg rounded-xl',
    };

    return (
        <button
            className={twMerge(
                baseStyles,
                variants[variant],
                variant !== 'icon' && sizes[size],
                variant === 'icon' && 'size-10', // Default icon button size
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
