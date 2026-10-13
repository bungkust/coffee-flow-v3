import { Icon } from './Icons';
import { MethodImage } from './MethodImage';

interface WizardRowProps {
    title: string;
    subtitle?: string;
    icon?: string;
    image?: string;
    onClick: () => void;
}

/** One row shape for every wizard step: thumbnail, title, one muted line, chevron. */
export const WizardRow = ({ title, subtitle, icon, image, onClick }: WizardRowProps) => (
    <button
        onClick={onClick}
        className="flex w-full items-center gap-4 rounded-xl bg-md-surface-container-low border border-md-outline-variant/30 p-4 shadow-md-1 text-left hover:bg-md-surface-container-high transition-colors cursor-pointer"
    >
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-md-primary-container">
            <MethodImage src={image} icon={icon ?? 'coffee'} alt={title} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
            <h4 className="truncate typescale-title-small font-bold text-md-on-surface">{title}</h4>
            {subtitle && <p className="truncate typescale-body-small text-md-on-surface-variant">{subtitle}</p>}
        </div>
        <Icon name="chevron_right" className="shrink-0 text-xl text-md-on-surface-variant" />
    </button>
);
