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
        warning: { icon: 'warning', color: 'text-yellow-500', bg: 'bg-yellow-50' },
        error: { icon: 'error', color: 'text-red-500', bg: 'bg-red-50' },
        info: { icon: 'info', color: 'text-primary', bg: 'bg-primary-light' },
        success: { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-50' }
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white w-full ${widthClass} rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200`}>
                <div className={isForm ? 'text-left' : 'flex flex-col items-center text-center'}>
                    {!isForm && (
                        <div className={`w-14 h-14 rounded-full ${config.bg} flex items-center justify-center mb-4 ${isForm ? 'mx-auto' : ''}`}>
                            <Icon name={config.icon} className={`text-[32px] ${config.color}`} style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                    )}
                    <h3 className={`text-xl font-bold text-[#181411] mb-2 ${isForm ? 'text-left' : 'text-center'}`}>{title}</h3>
                    {typeof message === 'string' ? (
                        <p className="text-sm text-gray-500 mb-8 leading-relaxed">{message}</p>
                    ) : (
                        <div className="mb-8">{message}</div>
                    )}

                    <div className="flex flex-col w-full gap-3">
                        <button
                            onClick={() => {
                                onConfirm?.();
                                onClose();
                            }}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98]"
                        >
                            {confirmText}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold py-4 rounded-xl transition-all active:scale-[0.98]"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};