import type { HTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
    return (
        <div
            className={twMerge(
                "bg-surface-light rounded-xl overflow-hidden shadow-sm border border-neutral-border",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
