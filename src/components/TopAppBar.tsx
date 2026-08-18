import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icons';

interface TopAppBarProps {
    title: string;
    showBack?: boolean;
    onBack?: () => void;
    actions?: ReactNode;
    subtitle?: string;
    variant?: 'small' | 'center-aligned';
}

export const TopAppBar = ({
    title,
    showBack = false,
    onBack,
    actions,
    subtitle,
    variant = 'small',
}: TopAppBarProps) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full bg-md-surface/90 backdrop-blur-md border-b border-md-outline-variant/20 px-4 h-16 flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className={`flex items-center gap-3 ${variant === 'center-aligned' ? 'flex-1 justify-center' : 'flex-1'}`}>
                {showBack && (
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="size-10 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest transition-colors active:scale-95"
                    >
                        <Icon name="arrow_back" className="text-2xl" />
                    </button>
                )}
                <div className="truncate">
                    <h1 className="typescale-title-large text-md-on-surface truncate font-semibold">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="typescale-body-small text-md-on-surface-variant truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-1 text-md-on-surface-variant">
                    {actions}
                </div>
            )}
        </header>
    );
};
