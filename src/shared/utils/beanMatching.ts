import type { Recipe } from '../domain/entities';
import { stripTagPrefix } from '../../features/pantry/domain/beanOptions';

export interface MethodSuggestion {
    methodId: string;
    score: number;
    reason: string;
}

// Roast levels appear as "medium" on beans and "Medium Roast" on recipes;
// process and variety ("Washed", "Arabica") match exactly either way.
const normalize = (tag: string) => tag.trim().toLowerCase();

const matches = (beanTag: string, recipeTag: string) => normalize(recipeTag).includes(normalize(beanTag));

/**
 * Ranks brewing methods for a bean by how strongly its recipes pair with
 * the bean's tags. Returns at most three, best first. An untagged bean
 * yields no suggestions — the caller then shows every method instead.
 */
export const suggestMethods = (beanTags: string[], recipes: Recipe[]): MethodSuggestion[] => {
    const cleanTags = beanTags.map(tag => normalize(stripTagPrefix(tag))).filter(Boolean);
    if (cleanTags.length === 0) return [];

    const byMethod = new Map<string, { score: number, reasons: Set<string> }>();

    for (const recipe of recipes) {
        let score = 0;
        const entry = byMethod.get(recipe.method_id) ?? { score: 0, reasons: new Set<string>() };
        for (const tag of cleanTags) {
            if (recipe.best_for_tags?.some(r => matches(tag, r))) {
                score += 1;
                entry.reasons.add(tag);
            }
            if (recipe.not_recommended_tags?.some(r => matches(tag, r))) {
                score -= 1;
            }
        }
        if (score <= 0) continue;

        entry.score += score;
        byMethod.set(recipe.method_id, entry);
    }

    return [...byMethod.entries()]
        .map(([methodId, entry]) => ({
            methodId,
            score: entry.score,
            reason: [...entry.reasons].slice(0, 2).join(', ')
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
};
