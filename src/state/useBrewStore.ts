import { create } from 'zustand';
import { BrewEngine } from '../features/brew/application/BrewEngine';
import type { BrewEngineState } from '../features/brew/application/BrewEngine';
import type { Recipe } from '../shared/domain/entities';

interface BrewStoreState {
    activeRecipe: Recipe | null;
    engine: BrewEngine | null;
    engineState: BrewEngineState | null;
    startBrew: (recipe: Recipe) => void;
    stopBrew: () => void;
    pauseBrew: () => void;
    resumeBrew: () => void;
}

export const useBrewStore = create<BrewStoreState>((set, get) => ({
    activeRecipe: null,
    engine: null,
    engineState: null,

    startBrew: (recipe: Recipe) => {
        const engine = new BrewEngine(recipe.steps);

        engine.addListener((state) => {
            set({ engineState: state });
        });

        // Mapping enhanced schema fields to state
        set({
            activeRecipe: recipe,
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

    stopBrew: () => {
        const { engine } = get();
        engine?.stop();
        set({ activeRecipe: null, engine: null, engineState: null });
    },

    pauseBrew: () => {
        get().engine?.pause();
    },

    resumeBrew: () => {
        get().engine?.resume();
    }
}));
