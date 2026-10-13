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

export const formatMethodName = (methodId: string): string =>
    methodId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

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

const DEFAULT_STEP_SECONDS = 30;

/** A step the recipe gives no time for still needs a length to run the timer. */
export const getStepDuration = (step: BrewStep): number => step.duration_seconds || DEFAULT_STEP_SECONDS;

/** "30s", or "—" when the recipe never stated a time for this step. */
export const formatStepSeconds = (seconds?: number): string => (seconds && seconds > 0 ? `${seconds}s` : '—');

/** Steps that only set things up (ice, rinse, dosing) belong on the prep screen, not the brew timer. */
const PREPARATION_STEP_PATTERN = /preparation|prep\b|rinse|preheat|tare|set ?up|assemble|dose|dosing|grind|weigh|\bice\b/i;

const isPreparationStep = (step: BrewStep): boolean =>
    !step.target_weight && PREPARATION_STEP_PATTERN.test(`${step.label ?? ''} ${step.instruction ?? ''}`);

/** The steps the timer actually walks — falling back to all of them if nothing else is left. */
export const getBrewSteps = (steps: BrewStep[]): BrewStep[] => {
    const brewSteps = steps.filter(step => !isPreparationStep(step));
    return brewSteps.length > 0 ? brewSteps : steps;
};

/** Brew time as the scale sees it — only the steps actually poured. */
export const getBrewDuration = (steps: BrewStep[]): number => (
    getBrewSteps(steps).reduce((total, step) => total + getStepDuration(step), 0)
);

// Manual-brew best practice is a 3–5 ml/s flow rate; 4 ml/s is the sweet spot.
const FLOW_RATE_ML_PER_SECOND = 4;

/** A pour the recipe never timed gets a duration from its volume at the best-practice flow rate. */
export const withDerivedPourDurations = (steps: BrewStep[]): BrewStep[] =>
    steps.map((step, index) => {
        if (step.duration_seconds) return step;
        const pour = getPourAmount(steps, index);
        return pour > 0 ? { ...step, duration_seconds: Math.round(pour / FLOW_RATE_ML_PER_SECOND) } : step;
    });

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

/** The final scale target of the recipe — the water actually poured. */
export const getTotalTargetWeight = (steps: BrewStep[]): number => (
    Math.max(0, ...steps.map(step => (typeof step.target_weight === 'number' && step.target_weight > 0 ? step.target_weight : 0)))
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

export interface StepIntervalInfo {
    pourSeconds: number;
    restSeconds: number;
}

/** Splits a step into pour/rest only when the recipe itself states the pour duration. */
export const getStepIntervalInfo = (step: BrewStep): StepIntervalInfo => {
    const statedPour = step.instruction?.match(/(?:within|in|over)\s+(\d+)\s*(?:seconds|sec|s)\b/i);
    if (!statedPour) return { pourSeconds: 0, restSeconds: 0 };

    const duration = step.duration_seconds || 0;
    const pourSeconds = Math.min(parseInt(statedPour[1], 10), duration);
    return { pourSeconds, restSeconds: Math.max(0, duration - pourSeconds) };
};


