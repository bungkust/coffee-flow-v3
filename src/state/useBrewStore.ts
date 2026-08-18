import { create } from 'zustand';
import { BrewEngine } from '../features/brew/application/BrewEngine';
import type { BrewEngineState } from '../features/brew/application/BrewEngine';
import type { Recipe } from '../shared/domain/entities';

interface BrewStoreState {
    activeRecipe: Recipe | null;
    selectedBeanId: string | null;
    selectedFilterId: string | null;
    coffeeConsumed: number | null;
    engine: BrewEngine | null;
    engineState: BrewEngineState | null;
    startBrew: (recipe: Recipe, beanId?: string, filterId?: string, coffeeConsumed?: number) => void;
    hydrateBrew: () => boolean;
    stopBrew: () => void;
    pauseBrew: () => void;
    resumeBrew: () => void;
    skipStep: () => void;
}

const STORAGE_KEY = 'coffee_flow_active_brew';

interface PersistedBrew {
    recipe: Recipe;
    beanId?: string | null;
    filterId?: string | null;
    coffeeConsumed?: number | null;
    stepIndex?: number;
    remainingTime?: number;
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
    engine: null,
    engineState: null,

    startBrew: (recipe: Recipe, beanId?: string, filterId?: string, coffeeConsumed?: number) => {
        const engine = new BrewEngine(recipe.steps);

        engine.addListener((state) => {
            // Persist current position on every tick
            saveBrewToStorage({
                recipe,
                beanId: beanId || null,
                filterId: filterId || null,
                coffeeConsumed: coffeeConsumed ?? null,
                stepIndex: state.currentStepIndex,
                remainingTime: state.remainingTime,
            });
            set({ engineState: state });
        });

        set({
            activeRecipe: recipe,
            selectedBeanId: beanId || null,
            selectedFilterId: filterId || null,
            coffeeConsumed: coffeeConsumed ?? null,
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

        saveBrewToStorage({
            recipe,
            beanId: beanId || null,
            filterId: filterId || null,
            coffeeConsumed: coffeeConsumed ?? null,
            stepIndex: 0,
            remainingTime: recipe.steps[0]?.duration_seconds || 0,
        });
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
        engine.restoreState(stepIndex, remainingTime);

        engine.addListener((state) => {
            saveBrewToStorage({
                recipe: draft.recipe,
                beanId: draft.beanId,
                filterId: draft.filterId,
                coffeeConsumed: draft.coffeeConsumed,
                stepIndex: state.currentStepIndex,
                remainingTime: state.remainingTime,
            });
            set({ engineState: state });
        });

        set({
            activeRecipe: draft.recipe,
            selectedBeanId: draft.beanId || null,
            selectedFilterId: draft.filterId || null,
            coffeeConsumed: draft.coffeeConsumed ?? null,
            engine,
            engineState: {
                currentStepIndex: stepIndex,
                remainingTime,
                totalTime: draft.recipe.steps[stepIndex]?.duration_seconds || 0,
                progress: 0,
                isRunning: false,
                isCompleted: false
            }
        });

        return true;
    },

    stopBrew: () => {
        const { engine } = get();
        engine?.stop();
        sessionStorage.removeItem(STORAGE_KEY);
        set({ activeRecipe: null, selectedBeanId: null, selectedFilterId: null, coffeeConsumed: null, engine: null, engineState: null });
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
