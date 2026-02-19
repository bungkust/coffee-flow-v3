import { Icon } from './Icons';
import { Link } from 'react-router-dom';

interface BottomNavProps {
    activeTab?: 'home' | 'brewing' | 'drinks' | 'journal' | 'settings';
}

export const BottomNav = ({ activeTab }: BottomNavProps) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 max-w-md mx-auto">
            <div className="flex justify-between items-center px-6 pb-6 pt-3">
                <NavItem
                    to="/home"
                    icon="home"
                    label="Home"
                    active={activeTab === 'home'}
                />
                <NavItem
                    to="/create-brew"
                    icon="coffee_maker"
                    label="Brewing"
                    active={activeTab === 'brewing'}
                />
                <NavItem
                    to="/drinks"
                    icon="local_bar"
                    label="Drinks"
                    active={activeTab === 'drinks'}
                />
                <NavItem
                    to="/journal"
                    icon="menu_book"
                    label="Journal"
                    active={activeTab === 'journal'}
                />
                <NavItem
                    to="/settings"
                    icon="settings"
                    label="Settings"
                    active={activeTab === 'settings'}
                />
            </div>
        </div>
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
        className={`flex flex-1 flex-col items-center justify-end gap-1 ${active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'} transition-colors group`}
    >
        <div className="flex h-7 items-center justify-center transition-transform group-active:scale-90">
            <Icon
                name={icon}
                className="text-[26px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
            />
        </div>
        <p className="text-[10px] font-bold leading-normal tracking-[0.015em] uppercase">{label}</p>
    </Link>
);
