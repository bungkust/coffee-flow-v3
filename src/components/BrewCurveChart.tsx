import React, { useState, useMemo } from 'react';
import type { CurvePoint } from '../features/scale/state/useScaleStore';
import { formatDuration } from '../shared/utils/brewMath';

interface BrewCurveChartProps {
    points: CurvePoint[];
    currentTime?: number;
    maxDurationSeconds?: number;
    targetWater?: number;
    className?: string;
    showLegend?: boolean;
    embedded?: boolean;
    waterLabel?: string;
    height?: number;
}

export const BrewCurveChart: React.FC<BrewCurveChartProps> = ({
    points,
    currentTime,
    maxDurationSeconds,
    targetWater,
    className = '',
    showLegend = true,
    embedded = false,
    waterLabel = 'Water (g)',
    height = 140,
}) => {
    const [showWater, setShowWater] = useState(true);
    const [showFlow, setShowFlow] = useState(true);

    // Layout dimensions
    const width = 360;
    const padding = { top: 12, right: 34, bottom: 22, left: 34 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Determine scale domains
    const { maxTime, maxWeight, maxFlow } = useMemo(() => {
        let tMax = maxDurationSeconds || 60;
        let wMax = targetWater ? targetWater * 1.05 : 50;
        let fMax = 5.0; // default 5 g/s ceiling

        if (points.length > 0) {
            for (const p of points) {
                if (p.time > tMax) tMax = p.time;
                if (p.weight > wMax) wMax = p.weight;
                if (p.flowRate > fMax) fMax = p.flowRate;
            }
        }
        if (currentTime && currentTime > tMax) {
            tMax = currentTime;
        }

        // Round up nicely
        wMax = Math.ceil(wMax / 25) * 25;
        fMax = Math.ceil(fMax / 2) * 2;
        tMax = Math.max(30, Math.ceil(tMax / 15) * 15);

        return { maxTime: tMax, maxWeight: Math.max(50, wMax), maxFlow: Math.max(4, fMax) };
    }, [points, currentTime, maxDurationSeconds, targetWater]);

    // Coordinate mapping functions
    const getX = (t: number) => padding.left + (Math.max(0, Math.min(t, maxTime)) / maxTime) * chartW;
    const getYWater = (w: number) => padding.top + chartH - (Math.max(0, Math.min(w, maxWeight)) / maxWeight) * chartH;
    const getYFlow = (f: number) => padding.top + chartH - (Math.max(0, Math.min(f, maxFlow)) / maxFlow) * chartH;

    // SVG Paths
    const { waterPath, flowPath } = useMemo(() => {
        if (points.length === 0) {
            return { waterPath: '', flowPath: '' };
        }

        let wp = `M ${getX(points[0].time)} ${getYWater(points[0].weight)}`;
        let fp = `M ${getX(points[0].time)} ${getYFlow(points[0].flowRate)}`;

        for (let i = 1; i < points.length; i++) {
            const x = getX(points[i].time);
            wp += ` L ${x} ${getYWater(points[i].weight)}`;
            fp += ` L ${x} ${getYFlow(points[i].flowRate)}`;
        }

        return { waterPath: wp, flowPath: fp };
    }, [points, maxTime, maxWeight, maxFlow]);

    // Current cursor X
    const cursorX = typeof currentTime === 'number' ? getX(currentTime) : null;

    // Generate grid line ticks
    const timeTicks = useMemo(() => {
        const count = 4;
        const step = maxTime / count;
        return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
    }, [maxTime]);

    const showCursor = cursorX !== null && typeof currentTime === 'number' && currentTime > 0;
    const containerClass = embedded
        ? `w-full flex flex-col ${className}`
        : `w-full bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl p-3 flex flex-col ${className}`;

    return (
        <div className={containerClass}>
            {showLegend && (
                <div className={`flex items-center gap-2 mb-2.5 ${embedded ? 'justify-center' : 'justify-between px-1'}`}>
                    {!embedded && (
                        <span className="typescale-label-small font-bold text-md-on-surface-variant uppercase tracking-wider">
                            Brew Curve
                        </span>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowWater(!showWater)}
                            aria-pressed={showWater}
                            className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-full typescale-label-small font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-md-primary ${
                                showWater
                                    ? 'bg-md-primary text-md-on-primary shadow-xs'
                                    : 'bg-md-surface-container-highest text-md-on-surface-variant'
                            }`}
                        >
                            <span className={`size-2 rounded-full ${showWater ? 'bg-md-on-primary' : 'bg-md-primary'}`} />
                            <span>{waterLabel}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFlow(!showFlow)}
                            aria-pressed={showFlow}
                            className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-full typescale-label-small font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-md-tertiary ${
                                showFlow
                                    ? 'bg-md-tertiary-container text-md-on-tertiary-container shadow-xs'
                                    : 'bg-md-surface-container-highest text-md-on-surface-variant'
                            }`}
                        >
                            <span className="size-2 rounded-full bg-md-tertiary" />
                            <span>Flow (g/s)</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full relative overflow-hidden">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto overflow-visible select-none"
                    preserveAspectRatio="none"
                >
                    {/* Horizontal grid lines */}
                    <line
                        x1={padding.left}
                        y1={padding.top}
                        x2={width - padding.right}
                        y2={padding.top}
                        stroke="var(--md-sys-color-outline-variant)"
                        strokeOpacity={0.45}
                        strokeDasharray="2,3"
                    />
                    <line
                        x1={padding.left}
                        y1={padding.top + chartH / 2}
                        x2={width - padding.right}
                        y2={padding.top + chartH / 2}
                        stroke="var(--md-sys-color-outline-variant)"
                        strokeOpacity={0.45}
                        strokeDasharray="2,3"
                    />
                    <line
                        x1={padding.left}
                        y1={padding.top + chartH}
                        x2={width - padding.right}
                        y2={padding.top + chartH}
                        stroke="var(--md-sys-color-outline-variant)"
                        strokeOpacity={0.8}
                    />

                    {/* Empty state hint before brew starts */}
                    {points.length === 0 && (
                        <text
                            x={padding.left + chartW / 2}
                            y={padding.top + chartH / 2 + 3}
                            textAnchor="middle"
                            fill="var(--md-sys-color-on-surface-variant)"
                            opacity={0.7}
                            className="text-[10px] font-medium"
                        >
                            Start brew to record curve
                        </text>
                    )}

                    {/* Y-axis Labels (Water on left, Flow on right) */}
                    <text
                        x={padding.left - 5}
                        y={padding.top + 4}
                        textAnchor="end"
                        fill="var(--md-sys-color-primary)"
                        className="font-bold text-[9px] tabular-nums"
                    >
                        {maxWeight}g
                    </text>
                    <text
                        x={padding.left - 5}
                        y={padding.top + chartH}
                        textAnchor="end"
                        fill="var(--md-sys-color-primary)"
                        className="font-bold text-[9px] tabular-nums"
                    >
                        0
                    </text>

                    <text
                        x={width - padding.right + 5}
                        y={padding.top + 4}
                        textAnchor="start"
                        fill="var(--md-sys-color-tertiary)"
                        className="font-bold text-[9px] tabular-nums"
                    >
                        {maxFlow}
                    </text>
                    <text
                        x={width - padding.right + 5}
                        y={padding.top + chartH}
                        textAnchor="start"
                        fill="var(--md-sys-color-tertiary)"
                        className="font-bold text-[9px] tabular-nums"
                    >
                        0
                    </text>

                    {/* X-axis time ticks */}
                    {timeTicks.map((tick) => (
                        <text
                            key={tick}
                            x={getX(tick)}
                            y={height - 4}
                            textAnchor="middle"
                            fill="var(--md-sys-color-on-surface-variant)"
                            opacity={0.75}
                            className="text-[9px] tabular-nums font-mono"
                        >
                            {formatDuration(tick)}
                        </text>
                    ))}

                    {/* Target Water Dashed Line */}
                    {targetWater && targetWater <= maxWeight && (
                        <line
                            x1={padding.left}
                            y1={getYWater(targetWater)}
                            x2={width - padding.right}
                            y2={getYWater(targetWater)}
                            stroke="var(--md-sys-color-primary)"
                            strokeOpacity={0.3}
                            strokeDasharray="4,4"
                            strokeWidth="1"
                        />
                    )}

                    {/* Water Curve */}
                    {showWater && waterPath && (
                        <path
                            d={waterPath}
                            fill="none"
                            stroke="var(--md-sys-color-primary)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Flow Rate Curve */}
                    {showFlow && flowPath && (
                        <path
                            d={flowPath}
                            fill="none"
                            stroke="var(--md-sys-color-tertiary)"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Live Time Cursor (hidden at t = 0 so it never overlaps left axis) */}
                    {showCursor && (
                        <>
                            <line
                                x1={cursorX!}
                                y1={padding.top}
                                x2={cursorX!}
                                y2={padding.top + chartH}
                                stroke="var(--md-sys-color-on-surface)"
                                strokeOpacity={0.35}
                                strokeDasharray="3,3"
                                strokeWidth="1"
                            />
                            {showWater && points.length > 0 && (
                                <circle
                                    cx={getX(points[points.length - 1].time)}
                                    cy={getYWater(points[points.length - 1].weight)}
                                    r="3"
                                    fill="var(--md-sys-color-primary)"
                                    stroke="var(--md-sys-color-surface)"
                                    strokeWidth="2"
                                />
                            )}
                        </>
                    )}
                </svg>
            </div>
        </div>
    );
};

