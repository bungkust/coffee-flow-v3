import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageHeader } from '../components/PageHeader';
import { BrewLogCard } from '../components/BrewLogCard';
import { brewService, drinkService, pantryService } from '../core/services';
import type { BrewLogWithRecipe, BrewStats, DrinkLogWithDrink, DrinkStats } from '../shared/domain/entities';
import { parseFlavorTags } from '../shared/utils/tasteProfile';
import { formatMethodName } from '../shared/utils/brewMath';
import { getDrinkImage } from '../shared/utils/drinks';

type Tab = 'brews' | 'drinks';
type JournalRow = BrewLogWithRecipe | DrinkLogWithDrink;
type JournalStats = Partial<BrewStats & DrinkStats>;

export const JournalPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'brews');
    const [logs, setLogs] = useState<JournalRow[]>([]);
    const [stats, setStats] = useState<JournalStats>({});
    const [beanNames, setBeanNames] = useState<Record<string, string>>({});

    useEffect(() => {
        pantryService.getPantryItems()
            .then(items => setBeanNames(Object.fromEntries(items.filter(item => item.category === 'beans').map(item => [item.id, item.name]))))
            .catch(console.error);
    }, []);

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

    const formatTimeOnly = (dateString: string) => {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const rows = logs.map(log => ({
        id: log.id,
        name: ('recipe_name' in log ? log.recipe_name : log.drink_name) || 'Drink',
        subtitle: ('method_id' in log
            ? [log.bean_id ? beanNames[log.bean_id] : undefined, formatMethodName(log.method_id)]
            : [log.category?.toLowerCase() === 'cold' ? 'Iced' : 'Hot', ('bean_name' in log && log.bean_name) || ('milk_name' in log && log.milk_name)]
        ).filter(Boolean).join(' · '),
        image: 'method_id' in log ? `/assets/methods/${log.method_id}.png` : getDrinkImage({ id: log.drink_id }),
        icon: 'method_id' in log ? 'coffee_maker' : 'local_cafe',
        date: 'brewed_at' in log ? log.brewed_at : log.logged_at,
        notes: log.notes,
        flavor_tags: 'flavor_tags' in log ? log.flavor_tags : undefined,
        rating: log.rating,
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
            <PageHeader title="Activity Journal" padding="pb-0" className="z-20" rowClassName="px-5 mb-2">
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
                                <p className="text-sm text-gray-500 mb-1">Total Recorded</p>
                                <p className="text-3xl font-extrabold text-[#181411]">
                                    {logs.length}
                                </p>
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

                            <div className="flex flex-col gap-2.5">
                                {groupLogs.map((row) => (
                                    <BrewLogCard
                                        key={row.id}
                                        image={row.image}
                                        icon={row.icon}
                                        name={row.name}
                                        subtitle={row.subtitle}
                                        date={formatTimeOnly(row.date)}
                                        tags={parseFlavorTags(row.flavor_tags)}
                                        notes={row.notes}
                                        rating={row.rating}
                                        onClick={() => navigate(`/journal/${activeTab}/${row.id}`)}
                                    />
                                ))}
                            </div>
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

            {/* Bottom Navigation */}
            <BottomNav activeTab="journal" />
        </div>
    );
};
