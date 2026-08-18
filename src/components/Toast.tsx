import { Icon } from './Icons';

interface ToastProps {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const Toast = ({ message, actionLabel, onAction }: ToastProps) => {
    return (
        <div className="bg-md-on-surface text-md-surface px-4 py-3 rounded-xs shadow-md-3 flex items-center justify-between gap-4 max-w-md mx-auto">
            <div className="flex items-center gap-3">
                <Icon name="check_circle" className="text-emerald-400 text-xl" />
                <span className="typescale-body-medium font-medium">{message}</span>
            </div>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="typescale-label-large font-semibold text-amber-300 hover:text-amber-200 bg-transparent border-none cursor-pointer tracking-wide"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

