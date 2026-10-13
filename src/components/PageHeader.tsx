import type { ReactNode } from 'react';
import { Icon } from './Icons';

interface PageHeaderProps {
    title: ReactNode;
    onBack?: () => void;
    action?: ReactNode;
    subtitle?: string;
    titleClassName?: string;
    padding?: string;
    rowClassName?: string;
    className?: string;
    children?: ReactNode;
}

export const PageHeader = ({
    title,
    onBack,
    action,
    subtitle,
    titleClassName,
    padding = 'px-5 pb-3',
    rowClassName,
    className,
    children
}: PageHeaderProps) => (
    <header className={`sticky top-0 z-10 bg-md-surface/95 backdrop-blur-md pt-10 ${padding} border-b border-md-outline-variant/20 ${className ?? ''}`}>
        <div className={`flex ${action ? 'items-center justify-between' : 'items-center gap-3'} ${rowClassName ?? ''}`}>
            {onBack && (
                <button
                    onClick={onBack}
                    className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors cursor-pointer"
                    aria-label="Go back"
                >
                    <Icon name="arrow_back" className="text-2xl" />
                </button>
            )}
            <div className="min-w-0">
                <h1 className={`typescale-headline-small font-bold text-md-on-surface ${titleClassName ?? ''}`}>{title}</h1>
                {subtitle && <p className="typescale-body-small text-md-on-surface-variant mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
        {children}
    </header>
);
