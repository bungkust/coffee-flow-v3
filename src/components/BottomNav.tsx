import { Icon } from './Icons';
import { Link } from 'react-router-dom';

interface BottomNavProps {
    activeTab?: 'home' | 'brewing' | 'pantry' | 'journal';
}

export const BottomNav = ({ activeTab }: BottomNavProps) => {
    return (
        <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-md-surface-container/90 backdrop-blur-xl border-t border-md-outline-variant/15 max-w-md mx-auto pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-md-2">
            <div className="flex justify-around items-center px-2">
                <NavItem
                    to="/home"
                    icon="home"
                    label="Home"
                    active={activeTab === 'home'}
                />
                <NavItem
                    to="/brew-methods"
                    icon="coffee_maker"
                    label="Brewing"
                    active={activeTab === 'brewing'}
                />
                <NavItem
                    to="/pantry"
                    icon="inventory_2"
                    label="Pantry"
                    active={activeTab === 'pantry'}
                />
                <NavItem
                    to="/journal"
                    icon="history_edu"
                    label="Journal"
                    active={activeTab === 'journal'}
                />
            </div>
        </nav>
    );
};

interface NavItemProps {
    to: string;
    icon: string;
    label: string;
    active: boolean;
}

const NavItem = ({ to, icon, label, active }: NavItemProps) => (
    <Link
        to={to}
        onClick={() => {
            if (!active) {
                navigator.vibrate?.(10);
            }
        }}
        className="flex flex-1 flex-col items-center justify-center gap-1 group py-1 text-center active:scale-95 transition-transform"
    >
        <div
            className={`flex h-8 w-16 items-center justify-center rounded-full transition-all duration-300 ease-md-standard ${
                active
                    ? 'bg-md-secondary-container text-md-on-secondary-container shadow-xs scale-105'
                    : 'text-md-on-surface-variant group-hover:bg-md-surface-container-highest/50'
            }`}
        >
            <Icon
                name={icon}
                className="text-2xl"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
            />
        </div>
        <span
            className={`typescale-label-small transition-colors duration-200 ${
                active ? 'text-md-on-surface font-bold' : 'text-md-on-surface-variant'
            }`}
        >
            {label}
        </span>
    </Link>
);

