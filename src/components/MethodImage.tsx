import { useState } from 'react';
import { Icon } from './Icons';

export const MethodImage = ({ src, alt, icon, size = 'md' }: { src?: string; alt: string; icon?: string; size?: 'sm' | 'md' | 'lg' }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !src) {
        const iconSize = size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-3xl' : 'text-5xl';
        return (
            <div className="flex items-center justify-center w-full h-full text-md-primary">
                <Icon name={icon || 'coffee'} className={iconSize} style={{ fontVariationSettings: "'FILL' 1" }} />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover rounded-full"
            onError={() => setFailed(true)}
        />
    );
};
