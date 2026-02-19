import { Icon } from './Icons';

interface ToastProps {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const Toast = ({ message, actionLabel, onAction }: ToastProps) => {
    return (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Icon name="check_circle" className="text-green-400 text-[20px]" />
                <span className="text-sm font-medium">{message}</span>
            </div>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="text-xs font-bold text-stone-400 hover:text-white uppercase bg-transparent border-none cursor-pointer"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};
