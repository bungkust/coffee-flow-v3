import { Icon } from './Icons';

interface ToastProps {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const Toast = ({ message, actionLabel, onAction }: ToastProps) => {
    return (
        <div className="bg-md-on-surface/95 text-md-surface px-5 py-3 rounded-full shadow-md-3 border border-md-outline-variant/20 backdrop-blur-md flex items-center justify-between gap-4 max-w-md mx-auto">
            <div className="flex items-center gap-3">
                <Icon name="check_circle" className="text-emerald-400 text-xl" />
                <span className="typescale-body-medium font-medium">{message}</span>
            </div>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="typescale-label-large font-bold text-amber-300 hover:text-amber-200 bg-transparent border-none cursor-pointer tracking-wide active:scale-95 transition-transform"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

