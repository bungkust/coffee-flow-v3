import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { BrewLogCard } from '../components/BrewLogCard';
import { BrewWizardSheet } from '../components/BrewWizardSheet';
import { brewService, pantryService, settingsService } from '../core/services';
import { formatMethodName } from '../shared/utils/brewMath';
import { parseFlavorTags } from '../shared/utils/tasteProfile';
import { daysOffRoast, freshnessLabel } from '../shared/utils/beanFreshness';
import type { BrewLogWithRecipe } from '../shared/domain/entities';
import type { PantryItem } from '../features/pantry/domain/entities';

export const HomePage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ todayBrews: 0 });
    const [recentBrews, setRecentBrews] = useState<BrewLogWithRecipe[]>([]);
    const [beans, setBeans] = useState<PantryItem[]>([]);
    const [userName, setUserName] = useState('Brewmaster');
    const [loading, setLoading] = useState(true);
    const [wizardOpen, setWizardOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, rb, name, pantry] = await Promise.all([
                    brewService.getDashboardStats(),
                    brewService.getRecentBrews(3),
                    settingsService.getUserName(),
                    pantryService.getPantryItems()
                ]);
                setStats(s);
                setRecentBrews(rb);
                if (name && name.trim().length > 0) {
                    setUserName(name);
                }
                setBeans(pantry.filter(item => item.category === 'beans'));
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const beanNames = Object.fromEntries(beans.map(bean => [bean.id, bean.name]));

    const formatDateTime = (dateStr: string) =>
        new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

    const getGreeting = () => {
        const hour = new Date().getHours();
        return hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-md-surface text-md-on-surface font-sans">
            <header className="flex items-start justify-between gap-4 px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-4 bg-md-surface/90 backdrop-blur-xl border-b border-md-outline-variant/15 shrink-0">
                <div className="flex min-w-0 flex-col">
                    <span className="typescale-label-medium text-md-on-surface-variant mb-0.5">
                        {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date())}
                    </span>
                    <h1 className="typescale-headline-small font-bold text-md-on-surface truncate">
                        {getGreeting()}, {userName}!
                    </h1>
                    {stats.todayBrews > 0 && (
                        <p className="typescale-body-small text-md-primary font-medium mt-0.5 flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-md-primary" />
                            {stats.todayBrews} {stats.todayBrews === 1 ? 'cup brewed' : 'cups brewed'} today
                        </p>
                    )}
                </div>
                <button
                    onClick={() => navigate('/settings')}
                    className="size-10 shrink-0 rounded-full flex items-center justify-center bg-md-surface-container-high text-md-on-surface-variant hover:bg-md-primary-container hover:text-md-on-primary-container transition-all active:scale-95 cursor-pointer shadow-xs"
                    aria-label="Open settings"
                >
                    <Icon name="settings" className="text-xl" />
                </button>
            </header>

            <main className="flex-1 flex flex-col gap-5 px-5 py-4 pb-safe-nav">
                {/* Hero Primary Action + Secondary Companions */}
                <section aria-label="Quick Actions" className="flex flex-col gap-2.5">
                    {/* 1. Dominant Hero CTA: Start Brewing */}
                    <button
                        onClick={() => setWizardOpen(true)}
                        className="group relative flex items-center justify-between rounded-2xl bg-gradient-to-r from-md-primary to-md-primary/90 text-md-on-primary p-4 shadow-md-2 hover:shadow-md-3 transition-all duration-200 active:scale-[0.99] cursor-pointer overflow-hidden text-left"
                    >
                        <div className="flex items-center gap-3.5 z-10">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-md-on-primary/15 backdrop-blur-md shadow-xs">
                                <Icon name="coffee_maker" className="text-2xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                            </div>
                            <div>
                                <span className="typescale-label-small uppercase tracking-wider text-md-on-primary/75 font-bold">Guided Flow</span>
                                <h3 className="typescale-title-medium font-bold text-md-on-primary leading-tight">
                                    Start Brewing
                                </h3>
                            </div>
                        </div>
                        <div className="flex size-9 items-center justify-center rounded-full bg-md-on-primary/20 group-hover:translate-x-0.5 transition-transform z-10">
                            <Icon name="arrow_forward" className="text-lg" />
                        </div>
                    </button>

                    {/* 2. Secondary Companion Grid: Mix Drink & Precision Scale */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            onClick={() => navigate('/drinks')}
                            className="quick-card-drink group flex items-center gap-3 rounded-2xl p-3 shadow-md-1 hover:shadow-md-2 transition-all active:scale-[0.98] cursor-pointer text-left"
                        >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-md-primary text-md-on-primary shadow-xs">
                                <Icon name="local_cafe" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="typescale-title-small font-bold text-md-on-primary-container truncate">Drink Menu</h4>
                                <p className="typescale-body-small text-md-on-primary-container opacity-80 text-[11px] truncate">Coffee & Latte</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/scale')}
                            className="quick-card-scale group flex items-center gap-3 rounded-2xl p-3 shadow-md-1 hover:shadow-md-2 transition-all active:scale-[0.98] cursor-pointer text-left"
                        >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-md-tertiary text-md-on-tertiary shadow-xs">
                                <Icon name="scale" className="text-xl" style={{ fontVariationSettings: "'FILL' 1" }} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="typescale-title-small font-bold text-md-on-tertiary-container truncate">Smart Scale</h4>
                                <p className="typescale-body-small text-md-on-tertiary-container opacity-80 text-[11px] truncate">Live Weight</p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* Recent brews */}
                <section aria-label="Recent Brews" className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <h2 className="typescale-title-medium font-bold text-md-on-surface">Recent brews</h2>
                        <button
                            onClick={() => navigate('/journal')}
                            className="typescale-label-large text-md-primary font-semibold hover:underline cursor-pointer"
                        >
                            View all
                        </button>
                    </div>
                    <div className="flex-1 min-h-0">
                        {loading ? (
                            <div className="animate-pulse flex flex-col gap-2">
                                {[1, 2].map(i => <div key={i} className="h-[76px] rounded-xl bg-md-surface-container-low" />)}
                            </div>
                        ) : recentBrews.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {recentBrews.map(brew => (
                                    <BrewLogCard
                                        key={brew.id}
                                        image={`/assets/methods/${brew.method_id}.png`}
                                        icon="coffee_maker"
                                        name={brew.recipe_name}
                                        subtitle={[beanNames[brew.bean_id ?? ''], formatMethodName(brew.method_id)].filter(Boolean).join(' · ')}
                                        date={formatDateTime(brew.brewed_at)}
                                        tags={parseFlavorTags(brew.flavor_tags)}
                                        notes={brew.notes}
                                        rating={brew.rating}
                                        onClick={() => navigate(`/journal/brews/${brew.id}`)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex min-h-full flex-col items-center justify-center text-center py-10">
                                <div className="flex size-12 items-center justify-center rounded-full bg-md-surface-container-high text-md-on-surface-variant mb-3">
                                    <Icon name="coffee_maker" className="text-2xl" />
                                </div>
                                <p className="typescale-title-medium font-bold text-md-on-surface">No brews yet</p>
                                <p className="typescale-body-small text-md-on-surface-variant mt-0.5 mb-4">Your first cup is one tap away.</p>
                                <button
                                    onClick={() => setWizardOpen(true)}
                                    className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-4 py-2 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                                >
                                    Start Brewing
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* From your shelf */}
                <section aria-label="From your shelf" className="flex flex-col shrink-0">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <h2 className="typescale-title-medium font-bold text-md-on-surface">From your shelf</h2>
                        <button
                            onClick={() => navigate('/pantry/add/beans')}
                            className="typescale-label-large text-md-primary font-semibold hover:underline cursor-pointer"
                        >
                            Add beans
                        </button>
                    </div>
                    {beans.length > 0 ? (
                        <div className="flex flex-col gap-2.5">
                            {beans.slice(0, 2).map(bean => {
                                const days = daysOffRoast(bean.roast_date);
                                return (
                                    <button
                                        key={bean.id}
                                        onClick={() => navigate('/pantry')}
                                        className="flex items-center gap-3 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/20 p-3 shadow-xs text-left hover:bg-md-surface-container-high transition-all active:scale-[0.99] cursor-pointer"
                                    >
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-md-primary-container text-md-on-primary-container">
                                            <Icon name="inventory_2" className="text-xl" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="truncate typescale-title-small font-bold text-md-on-surface">{bean.name}</h4>
                                            <p className="truncate typescale-body-small text-md-on-surface-variant text-xs">
                                                {days === null ? 'No roast date' : `${days}d off roast · ${freshnessLabel(days)}`}
                                            </p>
                                        </div>
                                        {bean.quantity != null && (
                                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-md-surface-container-high text-xs font-bold text-md-on-surface-variant tabular-nums">
                                                {bean.quantity}{bean.unit}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center py-8">
                            <div className="flex size-12 items-center justify-center rounded-full bg-md-surface-container-high text-md-on-surface-variant mb-3">
                                <Icon name="inventory_2" className="text-2xl" />
                            </div>
                            <p className="typescale-title-medium font-bold text-md-on-surface">No beans yet</p>
                            <p className="typescale-body-small text-md-on-surface-variant mt-0.5 mb-4">Add beans to start brewing.</p>
                            <button
                                onClick={() => navigate('/pantry/add/beans')}
                                className="typescale-label-medium font-bold text-md-primary bg-md-primary-container/40 px-3 py-1.5 rounded-full hover:bg-md-primary-container transition-colors cursor-pointer"
                            >
                                Add beans
                            </button>
                        </div>
                    )}
                </section>
            </main>

            <BottomNav activeTab="home" />

            <BrewWizardSheet open={wizardOpen} onClose={() => setWizardOpen(false)} />
        </div>
    );
};
