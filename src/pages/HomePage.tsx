import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { brewService, settingsService } from '../core/services';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';

export const HomePage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ weeklyBrews: 0, avgRating: 0, beansCount: 0 });
    const [recentBrews, setRecentBrews] = useState<any[]>([]);
    const [userName, setUserName] = useState('Brewmaster');
    const [loading, setLoading] = useState(true);

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
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-white shadow-2xl font-display">
            {/* Top Header */}
            <div className="flex items-center justify-between px-6 pt-12 pb-4 bg-white border-b border-gray-50">
                <div className="flex flex-col">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">
                        {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date())}
                    </p>
                    <h1 className="text-neutral-text tracking-tight text-xl font-bold leading-tight">
                        {getGreeting()}, {userName}!
                    </h1>
                </div>
            </div>

            {/* Main Content Scrollable Area */}
            <div className="flex-1 flex flex-col gap-5 px-5 py-5 bg-background-light pb-32">
                {/* Stats Row */}
                <div className="flex divide-x divide-gray-200 bg-white rounded-xl shadow-sm border border-gray-100 py-3">
                    <div className="flex-1 flex flex-col items-center justify-center px-2">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Weekly</span>
                        <span className="text-lg font-bold text-neutral-text">{stats.weeklyBrews}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center px-2">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Avg Rating</span>
                        <div className="flex items-center gap-1">
                            <span className="text-lg font-bold text-neutral-text">{stats.avgRating}</span>
                            <Icon name="star" className="text-yellow-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center px-2">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Beans</span>
                        <span className="text-lg font-bold text-neutral-text">{stats.beansCount}</span>
                    </div>
                </div>

                {/* Action Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate('/brew-methods')}
                        className="group flex items-center p-3 rounded-xl bg-primary text-white shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0 mr-3">
                            <Icon name="coffee_maker" className="text-[22px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="font-bold text-sm leading-tight">Start<br />Brewing</h3>
                        </div>
                        <Icon name="arrow_forward" className="text-[18px] opacity-80" />
                    </button>
                    <button className="group flex items-center p-3 rounded-xl bg-white text-neutral-text shadow-sm border border-gray-100 hover:border-primary/20 transition-all active:scale-95 cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-primary shrink-0 mr-3 shadow-sm">
                            <Icon name="local_cafe" className="text-[22px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="font-bold text-sm leading-tight">Mix a<br />Drink</h3>
                        </div>
                        <Icon name="arrow_forward" className="text-[18px] text-gray-400 group-hover:text-primary transition-colors" />
                    </button>
                </div>

                {/* Recent Brews Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-neutral-text">Recent Brews</h2>
                        <button
                            onClick={() => navigate('/journal')}
                            className="text-xs font-semibold text-primary hover:text-primary-dark cursor-pointer"
                        >
                            View Log
                        </button>
                    </div>
                    {loading ? (
                        <div className="animate-pulse flex flex-col gap-2">
                            {[1, 2].map(i => <div key={i} className="h-16 bg-white rounded-lg border border-gray-100"></div>)}
                        </div>
                    ) : recentBrews.length > 0 ? (
                        <div className="flex flex-col gap-2">
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
                        <div className="bg-white p-6 rounded-lg border border-dashed border-gray-200 text-center">
                            <p className="text-sm text-gray-400">No brews logged yet. Start your journey!</p>
                        </div>
                    )}
                </div>

                {/* Tip Card */}
                <div className="bg-gray-900 rounded-lg p-3 text-white flex gap-3 items-center shadow-sm mt-1">
                    <Icon name="lightbulb" className="text-yellow-300 text-xl shrink-0" />
                    <p className="text-xs text-gray-200 leading-snug flex-1">
                        <span className="font-bold text-yellow-300">Tip:</span> Filtered water significantly improves brew clarity.
                    </p>
                    <button className="text-gray-400 hover:text-white shrink-0 cursor-pointer">
                        <Icon name="close" className="text-lg" />
                    </button>
                </div>
            </div>

            <BottomNav activeTab="home" />
        </div>
    );
};

const RecentBrewItem = ({ method, title, time, rating }: { method: string, title: string, time: string, rating: string }) => (
    <div className="flex items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-accent-light text-primary flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            <span className="text-[10px] font-extrabold uppercase truncate px-1">{method}</span>
        </div>
        <div className="ml-3 flex-1 min-w-0">
            <h4 className="text-sm font-bold text-neutral-text truncate">{title}</h4>
            <p className="text-xs text-gray-500">{time}</p>
        </div>
        <div className="flex flex-col items-end pl-2">
            <div className="flex items-center text-yellow-500 mb-0.5">
                <span className="text-xs font-bold text-gray-600 mr-1">{rating}</span>
                <Icon name="star" className="text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }} />
            </div>
        </div>
    </div>
);
