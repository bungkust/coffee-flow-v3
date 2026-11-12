import { useEffect, type ReactNode } from 'react';
import { useBackHandler } from '../shared/utils/backNavigation';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    label: string;
    children: ReactNode;
}

export const BottomSheet = ({ isOpen, onClose, label, children }: BottomSheetProps) => {
    useBackHandler(isOpen, onClose);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={onClose}
        >
            <div
                className="bg-md-surface-container-high text-md-on-surface border-t sm:border border-md-outline-variant/25 rounded-t-[32px] sm:rounded-[32px] p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] w-full max-w-md shadow-md-3 space-y-4 animate-in slide-in-from-bottom duration-250 ease-out sm:zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-1.5 rounded-full bg-md-outline-variant/40 mx-auto -mt-2 mb-1 sm:hidden" />
                {children}
            </div>
        </div>
    );
};

