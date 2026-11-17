import { create } from 'zustand';
import { BrewEngine } from '../features/brew/application/BrewEngine';
import type { BrewEngineState } from '../features/brew/application/BrewEngine';
import type { Recipe } from '../shared/domain/entities';
import { brewService } from '../core/services';

export type BrewMode = 'manual' | 'smart-scale';

interface BrewStoreState {
    activeRecipe: Recipe | null;
    selectedBeanId: string | null;
    selectedFilterId: string | null;
    coffeeConsumed: number | null;
    brewMode: BrewMode;
    engine: BrewEngine | null;
    engineState: BrewEngineState | null;
    activeLogId: string | null;
    setBrewMode: (mode: BrewMode) => void;
    startBrew: (recipe: Recipe, beanId?: string, filterId?: string, coffeeConsumed?: number, mode?: BrewMode) => void;
    hydrateBrew: () => boolean;
    autoLogBrew: () => Promise<string | null>;
    stopBrew: () => void;
    pauseBrew: () => void;
    resumeBrew: () => void;
    skipStep: () => void;
}

const STORAGE_KEY = 'coffee_flow_active_brew';
const LOG_ID_STORAGE_KEY = 'coffee_flow_last_logged_id';
let inFlightLogPromise: Promise<string | null> | null = null;

interface PersistedBrew {
    recipe: Recipe;
    beanId?: string | null;
    filterId?: string | null;
    coffeeConsumed?: number | null;
    brewMode?: BrewMode;
    stepIndex?: number;
    remainingTime?: number;
    isCompleted?: boolean;
}

function saveBrewToStorage(data: PersistedBrew): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore quota errors */ }
}

function loadBrewFromStorage(): PersistedBrew | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as PersistedBrew;
    } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

export const useBrewStore = create<BrewStoreState>((set, get) => ({
    activeRecipe: null,
    selectedBeanId: null,
    selectedFilterId: null,
    coffeeConsumed: null,
    brewMode: 'manual',
    engine: null,
    engineState: null,
    activeLogId: null,

    setBrewMode: (mode: BrewMode) => set({ brewMode: mode }),

    startBrew: (recipe: Recipe, beanId?: string, filterId?: string, coffeeConsumed?: number, mode?: BrewMode) => {
        sessionStorage.removeItem(LOG_ID_STORAGE_KEY);
        const engine = new BrewEngine(recipe.steps);
        const effectiveMode = mode || get().brewMode;

        engine.addListener((state) => {
            // Persist current position on every tick
            saveBrewToStorage({
                recipe,
                beanId: beanId || null,
                filterId: filterId || null,
                coffeeConsumed: coffeeConsumed ?? null,
                brewMode: effectiveMode,
                stepIndex: state.currentStepIndex,
                remainingTime: state.remainingTime,
                isCompleted: state.isCompleted
            });
            set({ engineState: state });
        });

        set({
            activeRecipe: recipe,
            selectedBeanId: beanId || null,
            selectedFilterId: filterId || null,
            coffeeConsumed: coffeeConsumed ?? null,
            brewMode: effectiveMode,
            activeLogId: null,
            engine,
            engineState: {
                currentStepIndex: 0,
                remainingTime: recipe.steps[0]?.duration_seconds || 0,
                totalTime: recipe.steps[0]?.duration_seconds || 0,
                progress: 0,
                isRunning: false,
                isCompleted: false
            }
        });
    },

    autoLogBrew: async () => {
        const state = get();
        if (state.activeLogId) {
            return state.activeLogId;
        }

        // Check sessionStorage in case it was logged earlier in session
        const storedLogId = sessionStorage.getItem(LOG_ID_STORAGE_KEY);
        if (storedLogId) {
            set({ activeLogId: storedLogId });
            return storedLogId;
        }

        if (inFlightLogPromise) {
            return inFlightLogPromise;
        }

        const currentRecipe = get().activeRecipe;
        if (!currentRecipe) return null;

        inFlightLogPromise = (async () => {
            try {
                const logId = await brewService.logBrew(
                    currentRecipe.id,
                    undefined,
                    undefined,
                    undefined,
                    [],
                    get().selectedBeanId || undefined,
                    get().selectedFilterId || undefined,
                    get().coffeeConsumed || undefined
                );
                sessionStorage.setItem(LOG_ID_STORAGE_KEY, logId);
                set({ activeLogId: logId });
                return logId;
            } catch (err) {
                console.error('Failed to auto-log brew session:', err);
                return null;
            } finally {
                inFlightLogPromise = null;
            }
        })();

        return inFlightLogPromise;
    },

    hydrateBrew: () => {
        const current = get();
        if (current.activeRecipe && current.engineState) return true;

        const draft = loadBrewFromStorage();
        if (!draft?.recipe?.steps?.length) return false;

        const engine = new BrewEngine(draft.recipe.steps);

        // Restore position before attaching listener
        const stepIndex = draft.stepIndex ?? 0;
        const remainingTime = draft.remainingTime ?? draft.recipe.steps[0]?.duration_seconds ?? 0;
        const isCompleted = Boolean(
            draft.isCompleted ||
            (stepIndex >= draft.recipe.steps.length - 1 && remainingTime <= 0)
        );

        engine.restoreState(stepIndex, remainingTime);

        engine.addListener((state) => {
            saveBrewToStorage({
                recipe: draft.recipe,
                beanId: draft.beanId,
                filterId: draft.filterId,
                coffeeConsumed: draft.coffeeConsumed,
                brewMode: draft.brewMode || 'manual',
                stepIndex: state.currentStepIndex,
                remainingTime: state.remainingTime,
                isCompleted: state.isCompleted
            });
            set({ engineState: state });
        });

        const storedLogId = sessionStorage.getItem(LOG_ID_STORAGE_KEY);

        set({
            activeRecipe: draft.recipe,
            selectedBeanId: draft.beanId || null,
            selectedFilterId: draft.filterId || null,
            coffeeConsumed: draft.coffeeConsumed ?? null,
            brewMode: draft.brewMode || 'manual',
            activeLogId: storedLogId || null,
            engine,
            engineState: {
                currentStepIndex: stepIndex,
                remainingTime,
                totalTime: draft.recipe.steps[stepIndex]?.duration_seconds || 0,
                progress: isCompleted ? 1 : 0,
                isRunning: false,
                isCompleted
            }
        });

        return true;
    },

    stopBrew: () => {
        const { engine } = get();
        engine?.stop();
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(LOG_ID_STORAGE_KEY);
        set({
            activeRecipe: null,
            selectedBeanId: null,
            selectedFilterId: null,
            coffeeConsumed: null,
            engine: null,
            engineState: null,
            activeLogId: null
        });
    },

    pauseBrew: () => {
        get().engine?.pause();
    },

    resumeBrew: () => {
        get().engine?.resume();
    },

    skipStep: () => {
        const { engine } = get();
        engine?.nextStep();
    }
}));
