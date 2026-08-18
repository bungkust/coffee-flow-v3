import { Icon } from './Icons';
import { type ReactNode } from 'react';
import { Button } from './Button';

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
        warning: { icon: 'warning', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950' },
        error: { icon: 'error', color: 'text-md-error', bg: 'bg-md-error-container' },
        info: { icon: 'info', color: 'text-md-primary', bg: 'bg-md-primary-container' },
        success: { icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950' }
    };

    const sizeConfig = {
        sm: 'max-w-xs',
        md: 'max-w-md',
        lg: 'max-w-lg'
    };

    const config = typeConfig[type];
    const widthClass = sizeConfig[size];

    const isForm = typeof message !== 'string';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-xs transition-opacity duration-200">
            <div className={`bg-md-surface-container-high text-md-on-surface w-full ${widthClass} rounded-xl p-6 shadow-md-3 border border-md-outline-variant/30`}>
                <div className={isForm ? 'text-left' : 'flex flex-col items-center text-center'}>
                    {!isForm && (
                        <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center mb-4 ${isForm ? 'mx-auto' : ''}`}>
                            <Icon name={config.icon} className={`text-2xl ${config.color}`} style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                    )}
                    <h3 className={`typescale-headline-small text-md-on-surface mb-2 ${isForm ? 'text-left' : 'text-center'}`}>{title}</h3>
                    {typeof message === 'string' ? (
                        <p className="typescale-body-medium text-md-on-surface-variant mb-6 leading-relaxed">{message}</p>
                    ) : (
                        <div className="mb-6">{message}</div>
                    )}

                    <div className="flex items-center justify-end w-full gap-2 pt-2">
                        {cancelText && (
                            <Button
                                variant="text"
                                onClick={onClose}
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            variant="filled"
                            onClick={() => {
                                onConfirm?.();
                                onClose();
                            }}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};