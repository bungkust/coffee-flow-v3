import { useEffect, useState } from 'react';
import { Icon } from './Icons';
import { pantryService } from '../core/services';
import type { PantryLog } from '../features/pantry/domain/entities';

interface PantryItemLogsProps {
    itemId: string;
    unit?: string;
    refreshKey?: number;
}

export const PantryItemLogs = ({ itemId, unit = '', refreshKey = 0 }: PantryItemLogsProps) => {
    const [logs, setLogs] = useState<PantryLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        pantryService.getItemLogs(itemId)
            .then(data => {
                if (isMounted) setLogs(data);
            })
            .catch(err => {
                console.error('Failed to load pantry logs:', err);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [itemId, refreshKey]);

    const formatLogDate = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        if (isToday) return `Today · ${timeStr}`;
        return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${timeStr}`;
    };

    const getActionBadge = (action: PantryLog['action_type']) => {
        switch (action) {
            case 'brew':
                return {
                    label: 'Brew',
                    icon: 'coffee_maker',
                    className: 'bg-amber-50 text-amber-700 border-amber-200/60'
                };
            case 'drink':
                return {
                    label: 'Drink',
                    icon: 'local_cafe',
                    className: 'bg-orange-50 text-orange-700 border-orange-200/60'
                };
            case 'restock':
                return {
                    label: 'Restock',
                    icon: 'add_circle',
                    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                };
            case 'waste':
                return {
                    label: 'Waste',
                    icon: 'delete_outline',
                    className: 'bg-red-50 text-red-700 border-red-200/60'
                };
            default:
                return {
                    label: 'Adjust',
                    icon: 'tune',
                    className: 'bg-gray-50 text-gray-700 border-gray-200/60'
                };
        }
    };

    if (loading) {
        return (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-md-on-surface-variant/60">
                <div className="size-5 border-2 border-md-primary border-t-transparent rounded-full animate-spin" />
                <span className="typescale-body-small">Loading activity history...</span>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="py-6 px-4 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/30 text-center">
                <Icon name="history" className="text-3xl text-md-on-surface-variant/40 mb-1" />
                <p className="typescale-body-small font-semibold text-md-on-surface-variant">No stock history yet</p>
                <p className="typescale-label-small text-md-on-surface-variant/60 mt-0.5">
                    Activity will appear here when you brew, make drinks, or restock this item.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {logs.map((log) => {
                const badge = getActionBadge(log.action_type);
                const isPositive = log.change_amount > 0;
                const sign = isPositive ? '+' : '';
                const displayUnit = log.unit || unit;

                return (
                    <div
                        key={log.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-md-surface-container-low border border-md-outline-variant/30 gap-3"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
                                <Icon name={badge.icon} className="text-[12px]" />
                                {badge.label}
                            </span>
                            <div className="min-w-0">
                                <p className="typescale-body-small font-bold text-md-on-surface truncate">
                                    {log.reference_name || log.notes || (isPositive ? 'Stock Added' : 'Stock Deducted')}
                                </p>
                                <p className="text-[10px] text-md-on-surface-variant/70 font-medium">
                                    {formatLogDate(log.created_at)}
                                    {log.notes && log.reference_name ? ` · ${log.notes}` : ''}
                                </p>
                            </div>
                        </div>

                        <span
                            className={`shrink-0 typescale-body-small font-extrabold ${
                                isPositive ? 'text-emerald-600' : 'text-red-500'
                            }`}
                        >
                            {sign}{log.change_amount}{displayUnit}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
