import { twMerge } from 'tailwind-merge';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
    name: string;
    className?: string;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
    return (
        <span
            aria-hidden="true"
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
    <svg className={className} fill="none" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(256, 256) scale(0.84) translate(-524, -382)">
            <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
                <polygon points="309,170 691,170 573,406 427,406" strokeWidth="22" />
                <line x1="454.9" y1="170" x2="482.8" y2="406" strokeWidth="17" />
                <line x1="500" y1="170" x2="500" y2="406" strokeWidth="17" />
                <line x1="545.1" y1="170" x2="517.2" y2="406" strokeWidth="17" />
                <path d="M676 208 H726 A56 56 0 0 1 726 320 H616" strokeWidth="22" />
            </g>
            <polygon points="427,424 573,424 545,480 455,480" fill="currentColor" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
            <path d="M500 514 C512 532 528 552 528 576 A28 28 0 0 1 472 576 C472 552 488 532 500 514 Z" fill="currentColor" />
        </g>
    </svg>
);

