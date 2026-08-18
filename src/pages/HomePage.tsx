import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { brewService, settingsService } from '../core/services';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import type { BrewLogWithRecipe } from '../shared/domain/entities';

export const HomePage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ weeklyBrews: 0, avgRating: 0, beansCount: 0 });
    const [recentBrews, setRecentBrews] = useState<BrewLogWithRecipe[]>([]);
    const [userName, setUserName] = useState('Brewmaster');
    const [loading, setLoading] = useState(true);
    const [showTip, setShowTip] = useState(() => localStorage.getItem('coffee_flow_tip_dismissed') !== 'true');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, rb, name] = await Promise.all([
                    brewService.getDashboardStats(),
                    brewService.getRecentBrews(3),
                    settingsService.getUserName()
                ]);
                setStats(s);
                setRecentBrews(rb);
                if (name && name.trim().length > 0) {
                    setUserName(name);
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            {/* Top App Header */}
            <header className="flex items-center justify-between px-5 pt-10 pb-4 bg-md-surface border-b border-md-outline-variant/30">
                <div className="flex flex-col">
                    <span className="typescale-label-medium text-md-on-surface-variant mb-0.5">
                        {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date())}
                    </span>
                    <h1 className="typescale-headline-small text-md-on-surface font-bold">
                        {getGreeting()}, {userName}!
                    </h1>
                </div>
                <button
                    onClick={() => navigate('/settings')}
                    className="size-10 rounded-full flex items-center justify-center bg-md-surface-container-high text-md-on-surface-variant hover:bg-md-primary-container hover:text-md-on-primary-container transition-colors duration-200 active:scale-95"
                    aria-label="Open settings"
                >
                    <Icon name="settings" className="text-xl" />
                </button>
            </header>

            {/* Main Body */}
            <main className="flex-1 flex flex-col gap-5 px-5 py-5 pb-28">
                {/* Stats Row */}
                <section aria-label="Dashboard Statistics" className="flex divide-x divide-md-outline-variant/30 bg-md-surface-container-low rounded-lg py-3.5 shadow-md-1">
                    <div className="flex-1 flex flex-col items-center justify-center px-2">
                        <span className="typescale-label-medium text-md-on-surface-variant">Weekly</span>
                        <span className="typescale-title-large font-bold text-md-on-surface mt-0.5">{stats.weeklyBrews}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center px-2">
                        <span className="typescale-label-medium text-md-on-surface-variant">Avg Rating</span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="typescale-title-large font-bold text-md-on-surface">{stats.avgRating}</span>
                            <Icon name="star" className="text-amber-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center px-2">
                        <span className="typescale-label-medium text-md-on-surface-variant">Beans</span>
                        <span className="typescale-title-large font-bold text-md-on-surface mt-0.5">{stats.beansCount}</span>
                    </div>
                </section>

                {/* Quick Action Grid */}
                <section aria-label="Quick Actions" className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate('/brew-methods')}
                        className="group flex items-center p-3.5 rounded-lg bg-md-primary text-md-on-primary shadow-md-1 hover:shadow-md-2 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                        <div className="size-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs shrink-0 mr-3">
                            <Icon name="coffee_maker" className="text-2xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="typescale-title-medium font-bold leading-snug">Start<br />Brewing</h3>
                        </div>
                        <Icon name="arrow_forward" className="text-lg opacity-80 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={() => navigate('/drinks')}
                        className="group flex items-center p-3.5 rounded-lg bg-md-secondary-container text-md-on-secondary-container border border-md-outline-variant/30 hover:bg-md-secondary-container/80 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                        <div className="size-10 rounded-full bg-md-surface-container-highest flex items-center justify-center text-md-primary shrink-0 mr-3">
                            <Icon name="local_cafe" className="text-2xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="typescale-title-medium font-bold leading-snug">Mix a<br />Drink</h3>
                        </div>
                        <Icon name="arrow_forward" className="text-lg text-md-on-secondary-container/70 group-hover:translate-x-1 transition-transform" />
                    </button>
                </section>

                {/* Recent Brews Section */}
                <section aria-label="Recent Brews" className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="typescale-title-medium font-bold text-md-on-surface">Recent Brews</h2>
                        <button
                            onClick={() => navigate('/journal')}
                            className="typescale-label-large text-md-primary font-semibold hover:underline cursor-pointer"
                        >
                            View Log
                        </button>
                    </div>
                    {loading ? (
                        <div className="animate-pulse flex flex-col gap-2">
                            {[1, 2].map(i => <div key={i} className="h-16 bg-md-surface-container-low rounded-lg"></div>)}
                        </div>
                    ) : recentBrews.length > 0 ? (
                        <div className="flex flex-col gap-2.5">
                            {recentBrews.map(brew => (
                                <RecentBrewItem
                                    key={brew.id}
                                    method={brew.method_id}
                                    title={brew.recipe_name}
                                    time={`${formatDate(brew.brewed_at)} • ${brew.ratio} ratio`}
                                    rating={(brew.rating || 0).toFixed(1)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-md-surface-container-low p-6 rounded-lg border border-dashed border-md-outline-variant text-center">
                            <p className="typescale-body-medium text-md-on-surface-variant">No brews logged yet. Start your coffee journey!</p>
                        </div>
                    )}
                </section>

                {/* MD3 Tip Banner */}
                {showTip && (
                    <div className="bg-md-tertiary-container text-md-on-tertiary-container rounded-lg p-3.5 flex gap-3 items-center shadow-md-1 mt-1 border border-md-tertiary-container">
                        <Icon name="lightbulb" className="text-amber-700 dark:text-amber-300 text-xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }} />
                        <p className="typescale-body-medium leading-snug flex-1">
                            <span className="font-bold">Tip:</span> Filtered water significantly improves brew clarity & taste.
                        </p>
                        <button
                            onClick={() => {
                                localStorage.setItem('coffee_flow_tip_dismissed', 'true');
                                setShowTip(false);
                            }}
                            className="size-8 rounded-full flex items-center justify-center hover:bg-black/10 text-md-on-tertiary-container shrink-0 cursor-pointer"
                            aria-label="Dismiss tip"
                        >
                            <Icon name="close" className="text-lg" />
                        </button>
                    </div>
                )}
            </main>

            <BottomNav activeTab="home" />
        </div>
    );
};

const RecentBrewItem = ({ method, title, time, rating }: { method: string, title: string, time: string, rating: string }) => (
    <div className="flex items-center bg-md-surface-container-lowest p-3.5 rounded-lg border border-md-outline-variant/30 shadow-md-1 hover:bg-md-surface-container-low transition-colors">
        <div className="size-10 rounded-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center shrink-0 overflow-hidden font-bold">
            <span className="typescale-label-small uppercase truncate px-1">{method}</span>
        </div>
        <div className="ml-3 flex-1 min-w-0">
            <h4 className="typescale-title-medium font-semibold text-md-on-surface truncate">{title}</h4>
            <p className="typescale-body-small text-md-on-surface-variant">{time}</p>
        </div>
        <div className="flex items-center text-amber-500 pl-2">
            <span className="typescale-label-large font-bold text-md-on-surface mr-1">{rating}</span>
            <Icon name="star" className="text-base" style={{ fontVariationSettings: "'FILL' 1" }} />
        </div>
    </div>
);

