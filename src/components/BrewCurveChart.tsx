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
    height?: number;
}

export const BrewCurveChart: React.FC<BrewCurveChartProps> = ({
    points,
    currentTime,
    maxDurationSeconds,
    targetWater,
    className = '',
    showLegend = true,
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

    return (
        <div className={`w-full bg-md-surface-container-low/70 border border-md-outline-variant/20 rounded-2xl p-3 flex flex-col ${className}`}>
            {showLegend && (
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="typescale-label-small font-bold text-md-on-surface-variant/80 uppercase tracking-wider">
                        Brew Curve
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowWater(!showWater)}
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full typescale-label-small font-bold transition-all ${
                                showWater
                                    ? 'bg-md-primary text-md-on-primary'
                                    : 'bg-md-surface-container-highest text-md-on-surface-variant/50 border border-transparent'
                            }`}
                        >
                            <span className="size-2 rounded-full bg-md-on-primary"></span>
                            <span>Water (g)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFlow(!showFlow)}
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full typescale-label-small font-bold transition-all ${
                                showFlow
                                    ? 'bg-md-secondary-container text-md-on-secondary-container border border-md-outline-variant/30'
                                    : 'bg-md-surface-container-highest text-md-on-surface-variant/50 border border-transparent'
                            }`}
                        >
                            <span className="size-2 rounded-full bg-[#A07855]"></span>
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
                        stroke="currentColor"
                        className="text-md-outline-variant/15"
                        strokeDasharray="2,2"
                    />
                    <line
                        x1={padding.left}
                        y1={padding.top + chartH / 2}
                        x2={width - padding.right}
                        y2={padding.top + chartH / 2}
                        stroke="currentColor"
                        className="text-md-outline-variant/15"
                        strokeDasharray="2,2"
                    />
                    <line
                        x1={padding.left}
                        y1={padding.top + chartH}
                        x2={width - padding.right}
                        y2={padding.top + chartH}
                        stroke="currentColor"
                        className="text-md-outline-variant/20"
                    />

                    {/* Y-axis Labels (Water on left, Flow on right) */}
                    <text
                        x={padding.left - 4}
                        y={padding.top + 4}
                        textAnchor="end"
                        fill="#6F4E37"
                        className="font-bold text-[9px] tabular-nums"
                    >
                        {maxWeight}g
                    </text>
                    <text
                        x={padding.left - 4}
                        y={padding.top + chartH}
                        textAnchor="end"
                        fill="#6F4E37"
                        className="font-bold text-[9px] tabular-nums"
                    >
                        0
                    </text>

                    <text
                        x={width - padding.right + 4}
                        y={padding.top + 4}
                        textAnchor="start"
                        fill="#A07855"
                        className="font-bold text-[9px] tabular-nums"
                    >
                        {maxFlow}
                    </text>
                    <text
                        x={width - padding.right + 4}
                        y={padding.top + chartH}
                        textAnchor="start"
                        fill="#A07855"
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
                            className="fill-md-on-surface-variant/60 text-[9px] tabular-nums font-mono"
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
                            stroke="#6F4E37"
                            strokeOpacity="0.25"
                            strokeDasharray="4,4"
                            strokeWidth="1"
                        />
                    )}

                    {/* Water Curve */}
                    {showWater && waterPath && (
                        <path
                            d={waterPath}
                            fill="none"
                            stroke="#6F4E37"
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
                            stroke="#A07855"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Live Time Cursor */}
                    {cursorX !== null && (
                        <>
                            <line
                                x1={cursorX}
                                y1={padding.top}
                                x2={cursorX}
                                y2={padding.top + chartH}
                                stroke="currentColor"
                                className="text-md-on-surface/50"
                                strokeDasharray="3,3"
                                strokeWidth="1"
                            />
                            {/* Current dot for water */}
                            {showWater && points.length > 0 && (
                                <circle
                                    cx={getX(points[points.length - 1].time)}
                                    cy={getYWater(points[points.length - 1].weight)}
                                    r="3"
                                    fill="#6F4E37"
                                    className="stroke-md-surface stroke-2"
                                />
                            )}
                        </>
                    )}
                </svg>
            </div>
        </div>
    );
};

