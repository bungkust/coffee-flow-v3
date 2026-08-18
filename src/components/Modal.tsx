import { Icon } from './Icons';
import { type ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'info' | 'error' | 'success';
    size?: ModalSize;
}

export const Modal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'info',
    size = 'sm'
}: ModalProps) => {
    if (!isOpen) return null;

    const typeConfig = {
        warning: {
            icon: 'warning',
            color: 'text-md-error',
            bg: 'bg-md-error-container/60'
        },
        error: {
            icon: 'error',
            color: 'text-md-error',
            bg: 'bg-md-error-container/60'
        },
        info: {
            icon: 'info',
            color: 'text-md-primary',
            bg: 'bg-md-primary-container/60'
        },
        success: {
            icon: 'check_circle',
            color: 'text-md-primary',
            bg: 'bg-md-primary-container/60'
        }
    };

    const sizeConfig = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg'
    };

    const config = typeConfig[type] || typeConfig.info;
    const widthClass = sizeConfig[size];
    const isForm = typeof message !== 'string';
    const isDestructive = type === 'warning' || type === 'error';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-xs transition-opacity duration-200">
            <div className={`bg-md-surface-container-high text-md-on-surface w-full ${widthClass} rounded-[28px] p-6 shadow-md-3 border border-md-outline-variant/30 animate-in fade-in zoom-in-95 duration-150`}>
                <div className="flex flex-col items-center text-center">
                    {!isForm && (
                        <div className={`size-12 rounded-full ${config.bg} flex items-center justify-center mb-3 shrink-0`}>
                            <Icon name={config.icon} className={`text-2xl ${config.color}`} style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                    )}

                    <h3 className="typescale-headline-small font-bold text-md-on-surface mb-2 text-center">
                        {title}
                    </h3>

                    {typeof message === 'string' ? (
                        <p className="typescale-body-medium text-md-on-surface-variant mb-6 leading-relaxed text-center">
                            {message}
                        </p>
                    ) : (
                        <div className="mb-6 w-full text-left">{message}</div>
                    )}

                    {/* Centered Equal-Width Button Grid */}
                    <div className="grid grid-cols-2 gap-3 w-full pt-1">
                        {cancelText && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-3 px-4 rounded-full typescale-label-large font-bold bg-md-surface-container-highest hover:bg-md-surface-container-highest/80 text-md-on-surface border border-md-outline-variant/30 transition-all active:scale-95 cursor-pointer text-center"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm?.();
                                onClose();
                            }}
                            className={`w-full py-3 px-4 rounded-full typescale-label-large font-bold transition-all active:scale-95 cursor-pointer text-center shadow-md-1 ${
                                isDestructive
                                    ? 'bg-md-error text-md-on-error hover:bg-md-error/90'
                                    : 'bg-md-primary text-md-on-primary hover:bg-md-primary/90'
                            } ${!cancelText ? 'col-span-2' : ''}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};