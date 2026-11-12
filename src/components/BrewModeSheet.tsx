import { Icon } from './Icons';
import { BottomSheet } from './BottomSheet';
import type { BrewMode } from '../state/useBrewStore';

interface BrewModeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (mode: BrewMode) => void;
    recipeName?: string;
    currentMode?: BrewMode;
}

const MODE_OPTIONS: ReadonlyArray<{
    id: BrewMode;
    title: string;
    subtitle: string;
    icon: string;
    cardClass: string;
    iconClass: string;
    textClass: string;
}> = [
    {
        id: 'smart-scale',
        title: 'Smart Scale',
        subtitle: 'Timemore Dot BLE · Live weight, flow & cues',
        icon: 'scale',
        cardClass: 'mode-card-scale mode-card-active',
        iconClass: 'bg-md-tertiary text-md-on-tertiary',
        textClass: 'text-md-on-tertiary-container',
    },
    {
        id: 'manual',
        title: 'Manual Timer',
        subtitle: 'Phone stopwatch · Follow steps at your pace',
        icon: 'timer',
        cardClass: 'mode-card-manual mode-card-active',
        iconClass: 'bg-md-primary text-md-on-primary',
        textClass: 'text-md-on-primary-container',
    },
];

export const BrewModeSheet = ({
    isOpen,
    onClose,
    onSelect,
    recipeName,
    currentMode,
}: BrewModeSheetProps) => (
    <BottomSheet isOpen={isOpen} onClose={onClose} label="Choose brewing mode">
        <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="typescale-title-large font-bold text-md-on-surface leading-tight">
                            Choose Brewing Mode
                        </h2>
                        <p className="typescale-body-small text-md-on-surface-variant mt-0.5 truncate">
                            {recipeName ? `${recipeName} · Select your setup` : 'Select how you want to brew'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="size-11 -mr-2 -mt-1 rounded-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-container-highest active:scale-95 transition-all cursor-pointer shrink-0"
                        aria-label="Close"
                    >
                        <Icon name="close" className="text-xl" />
                    </button>
                </div>

                <div className="space-y-3">
                    {MODE_OPTIONS.map((option) => {
                        const isCurrent = currentMode === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => onSelect(option.id)}
                                className={`${option.cardClass} w-full p-4 rounded-2xl shadow-md-1 hover:shadow-md-2 transition-all active:scale-[0.98] text-left flex items-center gap-3.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-md-primary`}
                            >
                                <div className={`size-12 shrink-0 rounded-2xl flex items-center justify-center shadow-xs ${option.iconClass}`}>
                                    <Icon name={option.icon} className="text-2xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`typescale-title-medium font-bold ${option.textClass}`}>
                                            {option.title}
                                        </h3>
                                        {isCurrent && (
                                            <span className="typescale-label-small font-bold px-2 py-0.5 rounded-full bg-md-surface/60 text-md-on-surface">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className={`typescale-body-small ${option.textClass} opacity-85`}>
                                        {option.subtitle}
                                    </p>
                                </div>
                                <Icon name="arrow_forward" className={`text-xl shrink-0 ${option.textClass}`} />
                            </button>
                        );
                    })}
                </div>
    </BottomSheet>
);

