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
            set({ engineState: state });
        });

        // Mapping enhanced schema fields to state
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

        sessionStorage.setItem('coffee_flow_active_brew', JSON.stringify({
            recipe,
            beanId: beanId || null,
            filterId: filterId || null,
            coffeeConsumed: coffeeConsumed ?? null
        }));
    },

    hydrateBrew: () => {
        const current = get();
        if (current.activeRecipe && current.engineState) return true;

        const raw = sessionStorage.getItem('coffee_flow_active_brew');
        if (!raw) return false;

        try {
            const draft = JSON.parse(raw) as {
                recipe: Recipe;
                beanId?: string | null;
                filterId?: string | null;
                coffeeConsumed?: number | null;
            };
            if (!draft.recipe?.steps?.length) return false;
            get().startBrew(
                draft.recipe,
                draft.beanId || undefined,
                draft.filterId || undefined,
                draft.coffeeConsumed ?? undefined
            );
            return true;
        } catch {
            sessionStorage.removeItem('coffee_flow_active_brew');
            return false;
        }
    },

    stopBrew: () => {
        const { engine } = get();
        engine?.stop();
        sessionStorage.removeItem('coffee_flow_active_brew');
        set({ activeRecipe: null, selectedBeanId: null, selectedFilterId: null, coffeeConsumed: null, engine: null, engineState: null });
    },

    pauseBrew: () => {
        get().engine?.pause();
    },

    resumeBrew: () => {
        get().engine?.resume();
    }
}));
