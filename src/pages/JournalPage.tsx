import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageHeader } from '../components/PageHeader';
import { brewService, drinkService } from '../core/services';
import type { BrewLogWithRecipe, BrewStats, DrinkLogWithDrink, DrinkStats } from '../shared/domain/entities';

type Tab = 'brews' | 'drinks';
type JournalRow = BrewLogWithRecipe | DrinkLogWithDrink;
type JournalStats = Partial<BrewStats & DrinkStats>;

export const JournalPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'brews');
    const [logs, setLogs] = useState<JournalRow[]>([]);
    const [stats, setStats] = useState<JournalStats>({});

    useEffect(() => {
        const loadData = async () => {
        try {
            if (activeTab === 'brews') {
                const [data, statistics] = await Promise.all([
                    brewService.getAllLogs(),
                    brewService.getDashboardStats()
                ]);
                setLogs(data);
                setStats(statistics);
            } else {
                const [data, statistics] = await Promise.all([
                    drinkService.getRecentLogsWithDrinks(),
                    drinkService.getDashboardStats()
                ]);
                setLogs(data);
                setStats(statistics);
            }
        } catch (error) {
            console.error('Failed to load journal data:', error);
        }
        };
        loadData();
    }, [activeTab]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateString: string) =>
        new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const rows = logs.map(log => ({
        id: log.id,
        name: 'recipe_name' in log ? log.recipe_name : log.drink_name,
        subtitle: 'method_id' in log ? log.method_id.toUpperCase() : log.category,
        date: 'brewed_at' in log ? log.brewed_at : log.logged_at,
        rating: log.rating,
        notes: log.notes,
    }));

    const groupedLogs = rows.reduce<Record<string, typeof rows>>((acc, row) => {
        const dateGroup = formatDate(row.date);
        if (!acc[dateGroup]) acc[dateGroup] = [];
        acc[dateGroup].push(row);
        return acc;
    }, {});

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-md-surface text-md-on-surface font-sans pb-32">
            {/* Header */}
            <PageHeader title="Activity Journal" onBack={() => navigate(-1)} padding="pb-0" className="z-20" rowClassName="px-5 mb-2">
                {/* Segmented Button / Toggle Switch */}
                <div className="px-5 pb-3 pt-1">
                    <SegmentedControl
                        name="journal-filter"
                        value={activeTab}
                        options={[
                            { value: 'brews', label: 'Brews' },
                            { value: 'drinks', label: 'Drinks' }
                        ]}
                        onChange={setActiveTab}
                    />
                </div>
            </PageHeader>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
                {/* Monthly Summary Card */}
                <div className="p-4">
                    <div className="bg-gradient-to-br from-gray-50 to-[#f0ece9] rounded-xl p-5 border border-[#edebe8]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                                {new Date().toLocaleString('default', { month: 'long' })} Summary
                            </h2>
                            <Icon name="analytics" className="text-primary text-[20px]" />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 mb-1">
                                    Total {activeTab === 'brews' ? 'Brews' : 'Drinks'}
                                </p>
                                <p className="text-3xl font-extrabold text-[#181411]">
                                    {activeTab === 'brews' ? stats.monthlyBrews : stats.monthlyDrinks || 0}
                                </p>
                            </div>
                            <div className="w-px bg-gray-300/50"></div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 mb-1">Avg Rating</p>
                                <div className="flex items-center gap-1.5">
                                    <Icon name="star" className="text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                    <p className="text-lg font-bold text-[#181411] leading-tight">
                                        {stats.avgRating || '0.0'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="px-4">
                    {Object.entries(groupedLogs).map(([group, groupLogs]) => (
                        <div key={group} className="mb-2 mt-2">
                            <h3 className="text-sm font-bold text-[#181411] mb-3 pl-1 flex items-center gap-2">
                                {group}
                                <span className="h-px flex-1 bg-[#f4f2f0]"></span>
                            </h3>

                            {groupLogs.map((row) => {
                                const displayRating = Math.min(5, Math.max(0, Number(row.rating) || 0));
                                return (
                                <div key={row.id} onClick={() => navigate(`/journal/${activeTab}/${row.id}`)} className="group relative mb-4 flex gap-4 rounded-xl bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-[#f4f2f0] transition-all hover:border-primary/30 cursor-pointer">
                                    {/* Icon */}
                                    <div className="flex-shrink-0">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${activeTab === 'brews' ? 'bg-primary/10 text-primary' : 'bg-[#EFEBE7] text-[#181411]'}`}>
                                            <Icon
                                                name={activeTab === 'brews' ? 'coffee_maker' : 'local_cafe'}
                                                className="text-[24px]"
                                            />
                                        </div>
                                    </div>
                                    {/* Content */}
                                    <div className="flex flex-1 flex-col justify-center">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-[#181411]">
                                                    {row.name}
                                                </h4>
                                                <p className="text-xs font-medium text-gray-500 mt-0.5">
                                                    {row.subtitle}
                                                </p>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                                                {formatTime(row.date)}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1 text-primary">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Icon
                                                    key={star}
                                                    name="star"
                                                    className="text-[16px]"
                                                    style={{ fontVariationSettings: displayRating >= star ? "'FILL' 1" : "'FILL' 0" }}
                                                />
                                            ))}
                                        </div>
                                        {row.notes && (
                                            <p className="mt-2 text-sm text-gray-500/90 leading-relaxed line-clamp-2">
                                                "{row.notes}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    ))}

                    {logs.length === 0 && (
                        <div className="py-20 text-center text-gray-400">
                            <Icon name="history_edu" className="text-[48px] mb-4 opacity-50 mx-auto" />
                            <p>No activity recorded yet</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => navigate(activeTab === 'brews' ? '/recipes' : '/drinks')}
                className="absolute bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 hover:scale-105 transition-all"
            >
                <Icon name="add" className="text-[28px]" />
            </button>

            {/* Bottom Navigation */}
            <BottomNav activeTab="journal" />
        </div>
    );
};
