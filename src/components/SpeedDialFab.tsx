import { useState, type ReactNode } from 'react';
import { Icon } from './Icons';
import { useBackHandler } from '../shared/utils/backNavigation';

export interface SpeedDialAction {
    label: string;
    icon?: string;
    customIcon?: ReactNode;
    onClick: () => void;
    className?: string;
}

export interface SpeedDialFabProps {
    actions: SpeedDialAction[];
    mainIcon?: string;
    className?: string;
}

export const SpeedDialFab = ({ actions, mainIcon = 'add', className = '' }: SpeedDialFabProps) => {
    const [isOpen, setIsOpen] = useState(false);
    useBackHandler(isOpen, () => setIsOpen(false));

    return (
        <>
            {/* Backdrop overlay when speed dial is open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-in fade-in duration-150"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Floating Speed Dial FAB Container */}
            <div className={`fixed bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+4.75rem)] right-5 z-40 flex flex-col items-end gap-3 ${className}`}>
                {isOpen && (
                    <div className="flex flex-col items-end gap-2.5 mb-1 animate-in slide-in-from-bottom-4 fade-in duration-200">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setIsOpen(false);
                                    action.onClick();
                                }}
                                className={`flex items-center gap-2.5 px-4 py-2.5 bg-md-surface-container-high text-md-on-surface rounded-2xl shadow-md-3 border border-md-outline-variant/25 text-xs font-bold hover:bg-md-surface-container-highest active:scale-95 transition-all cursor-pointer ${action.className || ''}`}
                            >
                                {action.customIcon ? (
                                    action.customIcon
                                ) : action.icon ? (
                                    <Icon name={action.icon} className="text-[18px] text-md-on-surface-variant" />
                                ) : null}
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Open actions"
                    className={`size-14 rounded-full text-md-on-primary shadow-md-2 flex items-center justify-center transition-all duration-300 active:scale-90 border-2 border-md-surface cursor-pointer ${
                        isOpen ? 'bg-md-surface-container-highest text-md-on-surface rotate-45' : 'bg-md-primary hover:bg-md-primary/90 text-md-on-primary'
                    }`}
                >
                    <Icon name={mainIcon} className="text-2xl" />
                </button>
            </div>
        </>
    );
};
