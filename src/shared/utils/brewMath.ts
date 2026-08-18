import type { BrewStep, Recipe } from '../domain/entities';

export type UnitSystem = 'metric' | 'imperial';

const GRAMS_PER_OZ = 28.3495;
const ML_PER_FL_OZ = 29.5735;

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

export const convertWeight = (grams: number, toUnit: UnitSystem): number => {
    return toUnit === 'imperial' ? grams / GRAMS_PER_OZ : grams;
};

export const convertVolume = (ml: number, toUnit: UnitSystem): number => {
    return toUnit === 'imperial' ? ml / ML_PER_FL_OZ : ml;
};

export const formatWeight = (grams: number, unit: UnitSystem = 'metric'): string => {
    if (!Number.isFinite(grams)) return unit === 'metric' ? '0g' : '0oz';
    const value = convertWeight(grams, unit);
    const rounded = roundTo(value, unit === 'metric' ? 1 : 2);
    const suffix = unit === 'metric' ? 'g' : 'oz';
    return Number.isInteger(rounded) ? `${rounded}${suffix}` : `${rounded.toFixed(unit === 'metric' ? 1 : 2)}${suffix}`;
};

export const formatVolume = (ml: number, unit: UnitSystem = 'metric'): string => {
    if (!Number.isFinite(ml)) return unit === 'metric' ? '0ml' : '0fl oz';
    const value = convertVolume(ml, unit);
    const rounded = roundTo(value, unit === 'metric' ? 0 : 1);
    const suffix = unit === 'metric' ? 'ml' : 'fl oz';
    return Number.isInteger(rounded) ? `${rounded}${suffix}` : `${rounded.toFixed(unit === 'metric' ? 0 : 1)}${suffix}`;
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
    roundTo(Math.max(0, getCurrentTargetWeight(steps, currentStepIndex) - getPreviousTargetWeight(steps, currentStepIndex)), 1)
);

export const getWaterProgressPercent = (currentTargetWeight: number, totalWater?: number): number => {
    if (!totalWater || totalWater <= 0) return 0;
    return Math.min(100, Math.max(0, (currentTargetWeight / totalWater) * 100));
};

export const scaleInstructionText = (instruction: string | undefined, scaleFactor: number): string => {
    if (!instruction) return '';
    if (scaleFactor === 1 || !Number.isFinite(scaleFactor) || scaleFactor <= 0) return instruction;

    return instruction.replace(/\b(\d+(?:\.\d+)?)\s*(g|ml)\b/gi, (match, numStr, unit) => {
        const val = parseFloat(numStr);
        if (isNaN(val)) return match;
        const scaledVal = roundTo(val * scaleFactor, 1);
        const formatted = Number.isInteger(scaledVal) ? scaledVal.toString() : scaledVal.toFixed(1);
        return `${formatted}${unit}`;
    });
};

export const scaleRecipe = (recipe: Recipe, targetDose: number): Recipe => {
    const initialDose = calculateCoffeeDose(recipe.total_water, recipe.ratio) || 15;
    if (initialDose <= 0 || targetDose <= 0) return recipe;

    const scaleFactor = targetDose / initialDose;
    const scaledTotalWater = roundTo((recipe.total_water || 0) * scaleFactor, 1);

    const scaledSteps: BrewStep[] = recipe.steps.map(step => {
        const scaledTarget = (typeof step.target_weight === 'number' && step.target_weight > 0)
            ? roundTo(step.target_weight * scaleFactor, 1)
            : step.target_weight;
        const scaledInstruction = scaleInstructionText(step.instruction, scaleFactor);

        return {
            ...step,
            target_weight: scaledTarget,
            instruction: scaledInstruction
        };
    });

    return {
        ...recipe,
        total_water: scaledTotalWater,
        steps: scaledSteps
    };
};

