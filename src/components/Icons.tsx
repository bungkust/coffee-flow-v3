import { twMerge } from 'tailwind-merge';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
    name: string;
    className?: string;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
    return (
        <span
            className={twMerge(
                'material-symbols-outlined select-none',
                className
            )}
            {...props}
        >
            {name}
        </span>
    );
};

export const SplashLogoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 50 L80 140 H120 L160 50 H40 Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12"></path>
        <path d="M160 50 C175 50 185 60 185 75 C185 90 170 100 155 105" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="12"></path>
        <path d="M55 50 C55 50 65 90 75 120" stroke="currentColor" strokeLinecap="round" strokeWidth="8"></path>
        <path d="M80 50 C80 50 90 85 95 120" stroke="currentColor" strokeLinecap="round" strokeWidth="8"></path>
        <path d="M105 50 C105 50 105 85 105 120" stroke="currentColor" strokeLinecap="round" strokeWidth="8"></path>
        <path d="M130 50 C130 50 120 85 115 120" stroke="currentColor" strokeLinecap="round" strokeWidth="8"></path>
        <path d="M150 50 C150 50 140 85 130 120" stroke="currentColor" strokeLinecap="round" strokeWidth="8"></path>
        <path d="M70 148 H130 L120 160 H80 L70 148 Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="12"></path>
        <path d="M100 170 C100 170 90 185 90 192 C90 198 94 202 100 202 C106 202 110 198 110 192 C110 185 100 170 100 170 Z" fill="currentColor"></path>
    </svg>
);

