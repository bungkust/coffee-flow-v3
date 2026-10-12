import type { BrewStep } from '../../../shared/domain/entities';

export interface BrewEngineState {
    currentStepIndex: number;
    remainingTime: number;
    totalTime: number;
    progress: number;
    isRunning: boolean;
    isCompleted: boolean;
}

export type BrewEngineListener = (state: BrewEngineState) => void;

export class BrewEngine {
    private steps: BrewStep[];
    private currentStepIndex = 0;
    private remainingTime = 0;
    private interval: number | null = null;
    private listeners: BrewEngineListener[] = [];
    private isRunning = false;
    private isCompleted = false;
    private isTransitioning = false;

    constructor(steps: BrewStep[]) {
        this.steps = steps;
        if (steps.length > 0) {
            this.remainingTime = steps[0].duration_seconds;
        }
    }

    restoreState(stepIndex: number, remainingTime: number): void {
        if (stepIndex >= 0 && stepIndex < this.steps.length) {
            this.currentStepIndex = stepIndex;
            this.remainingTime = remainingTime;
            this.notify();
        }
    }

    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.isCompleted = false;
        this.tick();
    }

    pause(): void {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.notify();
    }

    resume(): void {
        this.start();
    }

    stop(): void {
        this.pause();
        this.currentStepIndex = 0;
        this.remainingTime = this.steps[0]?.duration_seconds || 0;
        this.isCompleted = false;
        this.notify();
    }

    nextStep(): void {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this.remainingTime = this.steps[this.currentStepIndex].duration_seconds;
            this.notify();
        } else {
            this.isRunning = false;
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
            this.isCompleted = true;
            this.notify();
        }
        this.isTransitioning = false;
    }

    addListener(listener: BrewEngineListener): void {
        this.listeners.push(listener);
        this.notify();
    }

    private tick(): void {
        if (this.interval) clearInterval(this.interval);

        this.interval = window.setInterval(() => {
            if (this.remainingTime > 0) {
                this.remainingTime--;
                this.notify();
            } else if (!this.isTransitioning) {
                // Only call nextStep if not already transitioning
                this.nextStep();
            }
        }, 1000);
    }

    private notify(): void {
        const currentStep = this.steps[this.currentStepIndex];
        if (!currentStep) return;
        const totalTime = Math.max(1, currentStep.duration_seconds || 0);

        const state: BrewEngineState = {
            currentStepIndex: this.currentStepIndex,
            remainingTime: this.remainingTime,
            totalTime: currentStep.duration_seconds,
            progress: Math.min(1, Math.max(0, 1 - (this.remainingTime / totalTime))),
            isRunning: this.isRunning,
            isCompleted: this.isCompleted
        };

        this.listeners.forEach(l => l(state));
    }
}
