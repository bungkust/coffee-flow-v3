import type { CSSProperties } from 'react';
import { Button } from './Button';
import { Icon } from './Icons';

interface SaveBarProps {
    onClick: () => void;
    label: string;
    disabled?: boolean;
    saving?: boolean;
    icon?: string;
    iconStyle?: CSSProperties;
    iconLast?: boolean;
    bottom?: string;
    z?: string;
    p?: string;
}

export const SaveBar = ({
    onClick,
    label,
    disabled,
    saving,
    icon = 'save',
    iconStyle,
    iconLast = false,
    bottom = 'bottom-0',
    z = 'z-20',
    p = 'p-5'
}: SaveBarProps) => (
    <div className={`fixed ${bottom} left-0 right-0 ${z} mx-auto max-w-md bg-md-surface/95 backdrop-blur-md ${p} border-t border-md-outline-variant/30`}>
        <Button variant="filled" size="lg" onClick={onClick} disabled={disabled || saving} className="w-full">
            {!iconLast && <Icon name={icon} style={iconStyle} className="text-xl" />}
            <span>{saving ? 'Saving...' : label}</span>
            {iconLast && <Icon name={icon} style={iconStyle} className="text-xl" />}
        </Button>
    </div>
);
