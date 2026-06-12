import type { BrewStep } from '../domain/entities';

export const roundTo = (value: number, decimals = 1): number => {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const parseRatio = (ratio: string): number | null => {
    const [coffeePart, waterPart, ...extraParts] = ratio.split(':').map(part => Number(part.trim()));
    if (extraParts.length > 0) return null;
    if (!Number.isFinite(coffeePart) || !Number.isFinite(waterPart)) return null;
    if (coffeePart <= 0 || waterPart <= 0) return null;
    return waterPart / coffeePart;
};

export const calculateCoffeeDose = (totalWater?: number, ratio?: string): number => {
    const ratioMultiplier = parseRatio(ratio || '');
    if (!ratioMultiplier || !totalWater || totalWater <= 0) return 0;
    return roundTo(totalWater / ratioMultiplier, 1);
};

export const formatWeight = (grams: number): string => {
    if (!Number.isFinite(grams)) return '0g';
    return Number.isInteger(grams) ? `${grams}g` : `${grams.toFixed(1)}g`;
};

export const formatDuration = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.round(seconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const sumStepDuration = (steps: BrewStep[]): number => (
    steps.reduce((total, step) => total + Math.max(0, step.duration_seconds || 0), 0)
);

export const getPreviousTargetWeight = (steps: BrewStep[], currentStepIndex: number): number => {
    for (let index = currentStepIndex - 1; index >= 0; index--) {
        const target = steps[index]?.target_weight;
        if (typeof target === 'number' && target > 0) return target;
    }
    return 0;
};

export const getCurrentTargetWeight = (steps: BrewStep[], currentStepIndex: number): number => {
    const currentTarget = steps[currentStepIndex]?.target_weight;
    if (typeof currentTarget === 'number' && currentTarget > 0) return currentTarget;
    return getPreviousTargetWeight(steps, currentStepIndex);
};

export const getPourAmount = (steps: BrewStep[], currentStepIndex: number): number => (
    Math.max(0, getCurrentTargetWeight(steps, currentStepIndex) - getPreviousTargetWeight(steps, currentStepIndex))
);

export const getWaterProgressPercent = (currentTargetWeight: number, totalWater?: number): number => {
    if (!totalWater || totalWater <= 0) return 0;
    return Math.min(100, Math.max(0, (currentTargetWeight / totalWater) * 100));
};
