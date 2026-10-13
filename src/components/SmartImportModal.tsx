import { useState, useEffect } from 'react';
import { Icon, SplashLogoIcon } from './Icons';
import { Dropdown } from './Dropdown';
import { brewService } from '../core/services';
import type { Recipe, BrewStep, BrewingMethod } from '../shared/domain/entities';

export interface ImportableRecipe extends Partial<Recipe> {
    _saved?: boolean;
}

interface SmartImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Navigate to edit page pre-filled with the recipe */
    onImport: (importedRecipe: ImportableRecipe, remainingQueue?: ImportableRecipe[]) => void;
    /** Save directly to DB without opening edit page */
    onSaveDirect?: (importedRecipe: ImportableRecipe) => Promise<void>;
    /** Initial parsed recipes list (restored queue) */
    initialParsedRecipes?: ImportableRecipe[];
    /** Show the brew-tool picker (recipe imports only) */
    showMethodPicker?: boolean;
    /** Pre-selected brew method id */
    defaultMethodId?: string;
}

const METHOD_LABELS: Record<string, string> = {
    v60: 'V60', hario_switch: 'Hario Switch', aeropress: 'AeroPress',
    french_press: 'French Press', chemex: 'Chemex', espresso: 'Espresso',
    moka_pot: 'Moka Pot', cold_brew: 'Cold Brew', cold_drip: 'Cold Drip',
    kalita: 'Kalita Wave', clever: 'Clever Dripper', siphon: 'Siphon',
    turkish: 'Turkish Coffee', phin: 'Vietnamese Phin', percolator: 'Percolator',
    tubruk: 'Tubruk', drip_machine: 'Drip Coffee Maker', south_indian_filter: 'South Indian Filter',
    sock_coffee: 'Sock Coffee', keurig: 'Keurig (Single Pod)', clover: 'Clover Machine',
    dallah: 'Arabic Coffee (Dallah)', jebena: 'Ethiopian Coffee (Jebena)', portable_all_in_one: 'All-in-One Portable'
};

const METHOD_ID_LINES = Object.entries(METHOD_LABELS).map(([id, label]) => `   - "${id}" (${label})`).join('\n');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Titles describe the recipe, not the brewer it is filed under. */
const cleanRecipeName = (name: string, methodId?: string): string => {
    const devices = [METHOD_LABELS[methodId || ''], (methodId || '').replace(/_/g, ' ')].filter(Boolean) as string[];
    let cleaned = name;
    for (const device of devices) {
        cleaned = cleaned.replace(new RegExp(`\\s*[-–—|,:]?\\s*${escapeRegExp(device)}\\s*(recipe|method|brewer|dripper)?`, 'ig'), ' ');
    }
    const result = cleaned.replace(/\s{2,}/g, ' ').replace(/^[\s\-–—|,:]+|[\s\-–—|,:]+$/g, '').trim();
    return result || name.trim();
};

const SYSTEM_PROMPT_TEMPLATE = `Please extract all coffee recipes from this text/link into JSON format strictly as shown below (do not include any explanation or extra text outside JSON).

PARAMETER GUIDELINES (STRICT RULES):
1. "name": Short, natural recipe title WITHOUT the brewing device or method name (it is stored separately) and without the word "Recipe". e.g. "Immersion Ice Drip", "Tetsu Kasuya 4:6", "James Hoffmann Ultimate".
2. "method_id": Must be ONE of the following exact IDs based on the brewing device:
${METHOD_ID_LINES}
3. "ratio": Format ratio as "1:X" (e.g., "1:15", "1:16.7", "1:14"). If not stated, calculate total_water / coffee_dose.
4. "temperature": Water temperature in Celsius as an integer (e.g., 93, 95, 90). Default to 93 if unspecified.
5. "grind_size": Must be ONE of: "Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse".
6. "difficulty": Must be ONE of: "Beginner", "Intermediate", "Advanced". Default to "Intermediate" if unspecified.
7. "style": Short descriptor of the cup or technique as two parts separated by " / " (e.g. "Balanced / Clean", "Iced / Flash Chilled", "Sweet / Full-bodied"). Never leave empty — it is shown on the recipe card.
8. "total_water": Total water volume in grams/ml as an integer (e.g., 225, 500).
9. "description_short": Concise 1-sentence summary of flavor profile or brewing style in English.
10. "description_detailed": Detailed explanation of brewing approach from article/source. Leave empty "" if not provided.
11. "philosophy": Philosophy or creator rationale behind this recipe. Leave empty "" if not provided.
12. "best_for_tags": String array of recommended bean origin/roast/process tags (e.g., ["Arabica", "Light Roast", "Washed"]). Leave empty [] if not provided.
13. "not_recommended_tags": String array of non-recommended bean tags (e.g., ["Dark Roast", "Robusta"]). Leave empty [] if not provided.
14. "steps": Sequential array of brewing steps. PRESERVE THE EXACT STEP BREAKDOWN FROM SOURCE TEXT:
   - Do NOT aggressively merge distinct instructions into one step unless they occur simultaneously.
   - If timestamps are given (e.g. 0:45 to 1:15), calculate exact step duration (1:15 - 0:45 = 30 seconds).
   - "label": Short step title matching source (e.g., "Bloom", "First Main Pour", "Second Main Pour", "Stir & Swirl", "Drawdown").
   - "duration_seconds": REQUIRED positive integer for EVERY step — never null and never 0. Use the source's timing when it states one; otherwise give a realistic estimate so the brew timer runs end to end (e.g. bloom 30-45, pour 30-60, drawdown 30).
   - "target_weight": Cumulative scale weight at the end of this pour in grams as an integer (e.g., 60, 300, 500). Omit/null for non-pour steps (stir, drawdown) or when the source does not state one.
   - "instruction": Complete, detailed step instruction preserved from the source text. When the brewer has a valve or switch (Hario Switch, Clever, siphon), begin the instruction with the valve position — "Close the switch ..." or "Open the switch ..." — and repeat it on every step where the position changes.
15. "source": Copy the URL/reference from the SOURCE section below verbatim (use "" if none). This lets the user revisit the original recipe later.

ACCURACY (CRITICAL — NO HALLUCINATION):
- Extract ONLY what the source actually states. Never invent, estimate or round numbers the source does not give — the one exception is "duration_seconds", which must always be a usable number (rule 14).
- If the source omits a value, use null (for numbers) or "" (for text) — do not guess temperature, ratio, dose, water or pour weights.
- When the source times its steps cumulatively (e.g. "wait for the timer to reach 2:00"), keep the instruction wording and set each step's duration to the gap between its start and end time.

MULTI-RECIPE RULE:
If the source text or link contains MULTIPLE distinct recipes (e.g., Scott Rao V60, James Hoffmann V60, Tetsu Kasuya 4:6 Method), extract ALL recipes into a JSON array:
\`\`\`json
[
  {
    "name": "Recipe 1 Name",
    "method_id": "v60",
    ...
  },
  {
    "name": "Recipe 2 Name",
    "method_id": "v60",
    ...
  }
]
\`\`\`
If there is only 1 recipe, return a JSON array with 1 item \`[ { ... } ]\` or a single JSON object.

REQUIRED JSON OUTPUT FORMAT:
\`\`\`json
[
  {
    "name": "James Hoffmann V60 Method",
    "method_id": "v60",
    "ratio": "1:16.7",
    "temperature": 93,
    "grind_size": "Medium-Fine",
    "difficulty": "Intermediate",
    "style": "Balanced / Clean",
    "total_water": 500,
    "description_short": "Two-phase pour technique for high sweetness & clarity.",
    "description_detailed": "James Hoffmann's technique...",
    "philosophy": "Higher water temperatures and strict heat retention...",
    "best_for_tags": ["Arabica", "Light Roast"],
    "not_recommended_tags": ["Dark Roast"],
    "steps": [
      {
        "label": "Bloom",
        "duration_seconds": 45,
        "target_weight": 60,
        "instruction": "Pour 60g water into central well and swirl. Wait until 0:45."
      }
    ]
  }
]
\`\`\`
`;

const extractUrl = (text: string): string => (text.match(/https?:\/\/\S+/) || [])[0] || '';

const parseRawItemToRecipe = (parsed: Record<string, unknown>): Partial<Recipe> => {
    let jsonDiff: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
    if (/beginner|easy/i.test(String(parsed.difficulty))) jsonDiff = 'Beginner';
    else if (/advanced|expert|hard/i.test(String(parsed.difficulty))) jsonDiff = 'Advanced';
    else if (/intermediate|medium/i.test(String(parsed.difficulty))) jsonDiff = 'Intermediate';

    const methodId = METHOD_LABELS[String(parsed.method_id)] ? String(parsed.method_id) : 'v60';
    const stepsRaw = Array.isArray(parsed.steps) ? parsed.steps : [];

    return {
        name: cleanRecipeName(String(parsed.name || 'Imported Recipe'), methodId),
        method_id: methodId,
        ratio: String(parsed.ratio || '1:15'),
        temperature: parsed.temperature ? Number(parsed.temperature) : 93,
        grind_size: String(parsed.grind_size || 'Medium'),
        difficulty: jsonDiff,
        style: parsed.style ? String(parsed.style) : undefined,
        total_water: parsed.total_water ? Number(parsed.total_water) : 225,
        description_short: String(parsed.description_short || 'Imported via Smart Importer'),
        description_detailed: String(parsed.description_detailed || ''),
        philosophy: String(parsed.philosophy || ''),
        source: parsed.source ? String(parsed.source) : undefined,
        best_for_tags: Array.isArray(parsed.best_for_tags) ? parsed.best_for_tags.map(String) : [],
        not_recommended_tags: Array.isArray(parsed.not_recommended_tags) ? parsed.not_recommended_tags.map(String) : [],
        steps: stepsRaw.map((s: Record<string, unknown>, idx: number) => ({
            id: crypto.randomUUID(),
            recipe_id: '',
            step_order: idx + 1,
            label: String(s.label || `Step ${idx + 1}`),
            duration_seconds: Number(s.duration_seconds ?? s.duration) || 0,
            target_weight: s.target_weight ? Number(s.target_weight) : undefined,
            instruction: String(s.instruction || ''),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }))
    };
};

const parseRawTextToRecipes = (rawText: string): Partial<Recipe>[] => {
    // 1. Try JSON parsing first
    try {
        const jsonMatch = rawText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            // Handle Array of recipes
            if (Array.isArray(parsed)) {
                const validList = parsed
                    .filter(item => item && typeof item === 'object' && item.name)
                    .map(item => parseRawItemToRecipe(item));
                if (validList.length > 0) return validList;
            }

            // Handle { recipes: [ ... ] }
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.recipes)) {
                const validList = parsed.recipes
                    .filter((item: Record<string, unknown>) => item && typeof item === 'object' && item.name)
                    .map((item: Record<string, unknown>) => parseRawItemToRecipe(item));
                if (validList.length > 0) return validList;
            }

            // Handle Single Object
            if (parsed && typeof parsed === 'object' && parsed.name && Array.isArray(parsed.steps)) {
                return [parseRawItemToRecipe(parsed)];
            }
        }
    } catch {
        // Fallback to Regex text parsing
    }

    // 2. Local Regex Text Parsing (Offline Rule-Based)
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] ? lines[0].replace(/^#+\s*/, '').slice(0, 40) : 'Imported Recipe';

    let method_id = 'v60';
    const lowerRaw = rawText.toLowerCase();
    if (lowerRaw.includes('switch')) method_id = 'hario_switch';
    else if (lowerRaw.includes('aeropress')) method_id = 'aeropress';
    else if (lowerRaw.includes('french press') || lowerRaw.includes('french_press')) method_id = 'french_press';
    else if (lowerRaw.includes('chemex')) method_id = 'chemex';
    else if (lowerRaw.includes('espresso')) method_id = 'espresso';
    else if (lowerRaw.includes('moka pot') || lowerRaw.includes('moka_pot') || lowerRaw.includes('mokapot')) method_id = 'moka_pot';
    else if (lowerRaw.includes('cold brew') || lowerRaw.includes('cold_brew')) method_id = 'cold_brew';
    else if (lowerRaw.includes('cold drip') || lowerRaw.includes('kyoto')) method_id = 'cold_drip';
    else if (lowerRaw.includes('kalita')) method_id = 'kalita';
    else if (lowerRaw.includes('clever')) method_id = 'clever';
    else if (lowerRaw.includes('siphon')) method_id = 'siphon';
    else if (lowerRaw.includes('turkish') || lowerRaw.includes('cezve')) method_id = 'turkish';
    else if (lowerRaw.includes('phin')) method_id = 'phin';
    else if (lowerRaw.includes('percolator')) method_id = 'percolator';
    else if (lowerRaw.includes('tubruk') || lowerRaw.includes('cowboy')) method_id = 'tubruk';
    else if (lowerRaw.includes('drip machine') || lowerRaw.includes('drip coffee')) method_id = 'drip_machine';
    else if (lowerRaw.includes('south indian')) method_id = 'south_indian_filter';

    let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
    if (/beginner|easy|simple|pemula|mudah/i.test(rawText)) difficulty = 'Beginner';
    else if (/advanced|expert|hard|mahir|sulit|rumit/i.test(rawText)) difficulty = 'Advanced';

    const doseMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\s*(?:kopi|coffee|biji|grounds)?/i);
    const dose = doseMatch ? parseFloat(doseMatch[1]) : 15;

    const waterMatch = rawText.match(/(\d{3,4})\s*(?:ml|g|gram|grams)\s*(?:air|water|total)?/i);
    const total_water = waterMatch ? parseInt(waterMatch[1], 10) : 225;

    const tempMatch = rawText.match(/(\d{2})\s*(?:°C|℃|C|deg|degree|suhu)/i);
    const temperature = tempMatch ? parseInt(tempMatch[1], 10) : 93;

    const ratioMatch = rawText.match(/1\s*:\s*(\d+(?:\.\d+)?)/i);
    const ratio = ratioMatch ? `1:${ratioMatch[1]}` : `1:${Math.round(total_water / dose)}`;

    let grind_size = 'Medium';
    if (/coarse|kasar/i.test(rawText)) grind_size = 'Coarse';
    else if (/fine|halus/i.test(rawText)) grind_size = 'Fine';
    else if (/medium[- ]fine/i.test(rawText)) grind_size = 'Medium-Fine';
    else if (/medium[- ]coarse/i.test(rawText)) grind_size = 'Medium-Coarse';

    const parsedSteps: BrewStep[] = [];
    const stepRegex = /(?:rinse|filter|pre-heat|grounds|well|bloom|tuang|pour|step|langkah|drawdown|tunggu|pause|stir|swirl|aim|\d+[.)]|\b\d+s\b|\b\d+\s*detik\b)/i;
    const isMetaHeader = /^(?:grind size|ratio|brew time|recipe|method|temp|temperature):/i;

    let cumulativeWeight = 0;
    lines.forEach((line) => {
        if (!isMetaHeader.test(line) && stepRegex.test(line) && line.length < 200) {
            let duration = 30;
            const durMatch = line.match(/(\d+)\s*(?:s|sec|detik)/i);
            const minSecMatch = line.match(/(\d+):(\d+)/);
            if (durMatch) {
                duration = parseInt(durMatch[1], 10);
            } else if (minSecMatch) {
                duration = parseInt(minSecMatch[1], 10) * 60 + parseInt(minSecMatch[2], 10);
            }

            const weightMatch = line.match(/(?:\+|target|to|till|\b)(\d+(?:\.\d+)?)\s*(?:g|ml|gram)/i);
            let targetWeight: number | undefined = undefined;
            if (weightMatch) {
                const val = parseFloat(weightMatch[1]);
                if (line.includes('+')) {
                    cumulativeWeight += val;
                    targetWeight = cumulativeWeight;
                } else if (val <= total_water) {
                    targetWeight = val;
                    cumulativeWeight = Math.max(cumulativeWeight, val);
                }
            }

            let label = line.split(/[:\---.]/)[0].trim();
            if (label.length > 30) label = label.slice(0, 30) + '...';

            parsedSteps.push({
                id: crypto.randomUUID(),
                recipe_id: '',
                step_order: parsedSteps.length + 1,
                label: label || `Step ${parsedSteps.length + 1}`,
                duration_seconds: duration,
                target_weight: targetWeight,
                instruction: line,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
    });

    if (parsedSteps.length === 0) {
        parsedSteps.push(
            { id: crypto.randomUUID(), recipe_id: '', step_order: 1, label: 'Bloom', duration_seconds: 30, target_weight: Math.round(dose * 3), instruction: `Pour ${Math.round(dose * 3)}g water and bloom for 30s.`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: crypto.randomUUID(), recipe_id: '', step_order: 2, label: 'Main Pour', duration_seconds: 60, target_weight: total_water, instruction: `Pour remaining water up to ${total_water}g.`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: crypto.randomUUID(), recipe_id: '', step_order: 3, label: 'Drawdown', duration_seconds: 30, instruction: 'Allow coffee to drain completely.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        );
    }

    return [{
        name: cleanRecipeName(title.length > 3 ? title : 'Imported Coffee Recipe', method_id),
        method_id,
        ratio,
        temperature,
        grind_size,
        difficulty,
        total_water,
        description_short: 'Imported via Smart Offline Parser',
        source: extractUrl(rawText) || undefined,
        steps: parsedSteps
    }];
};

export const SmartImportModal = ({
    isOpen,
    onClose,
    onImport,
    onSaveDirect,
    initialParsedRecipes,
    showMethodPicker,
    defaultMethodId
}: SmartImportModalProps) => {
    const [mode, setMode] = useState<'offline' | 'ai'>('offline');
    const [rawInput, setRawInput] = useState('');
    const [aiJsonResponse, setAiJsonResponse] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [parsedRecipes, setParsedRecipes] = useState<ImportableRecipe[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [parseError, setParseError] = useState('');
    const [isSavingDirect, setIsSavingDirect] = useState(false);
    const [methodId, setMethodId] = useState(defaultMethodId || 'v60');
    const [methodTouched, setMethodTouched] = useState(false);
    const [methods, setMethods] = useState<BrewingMethod[]>([]);

    useEffect(() => {
        if (!showMethodPicker) return;
        brewService.getAllMethods().then(setMethods).catch((err) => console.error('Error loading methods:', err));
    }, [showMethodPicker]);

    useEffect(() => {
        if (isOpen) {
            setMethodId(defaultMethodId || 'v60');
            setMethodTouched(false);
        }
    }, [isOpen, defaultMethodId]);

    useEffect(() => {
        if (isOpen && initialParsedRecipes && initialParsedRecipes.length > 0) {
            setParsedRecipes(initialParsedRecipes);
            setSelectedIndex(null);
        }
    }, [isOpen, initialParsedRecipes]);

    if (!isOpen) return null;

    const reset = () => {
        setRawInput('');
        setAiJsonResponse('');
        setCopiedPrompt(false);
        setParsedRecipes([]);
        setSelectedIndex(null);
        setParseError('');
        setMode('offline');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleCopyPrompt = async () => {
        if (!rawInput.trim()) {
            setParseError('Please paste a recipe link or text first.');
            return;
        }
        setParseError('');
        const fullPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\nSOURCE (cite this back in each recipe's "source" field):\n${rawInput.trim()}`;
        try {
            await navigator.clipboard.writeText(fullPrompt);
            setCopiedPrompt(true);
            setTimeout(() => setCopiedPrompt(false), 3000);
        } catch {
            setParseError('Could not copy automatically. Please copy the text manually.');
        }
    };

    const handleExtract = () => {
        const source = mode === 'ai' ? (aiJsonResponse || rawInput) : rawInput;
        if (!source.trim()) {
            setParseError(mode === 'ai'
                ? 'Paste the JSON response from Gemini or ChatGPT to continue.'
                : 'Paste a recipe or caption to get started.');
            return;
        }
        setParseError('');
        const sourceUrl = extractUrl(rawInput);
        const results: ImportableRecipe[] = parseRawTextToRecipes(source).map((r) => ({
            ...r,
            source: r.source || sourceUrl || undefined,
            ...(methodTouched ? { method_id: methodId } : {})
        }));
        if (!methodTouched && results.length === 1 && results[0].method_id) setMethodId(results[0].method_id);
        setParsedRecipes(results);
        if (results.length === 1) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(null);
        }
    };

    const activePreview = selectedIndex !== null ? parsedRecipes[selectedIndex] : null;

    const handleEditAndSave = () => {
        if (!activePreview || selectedIndex === null) return;

        // If multi-recipe import, save remaining queue state in sessionStorage
        if (parsedRecipes.length > 1) {
            const updated = [...parsedRecipes];
            updated[selectedIndex] = { ...activePreview, _saved: true };
            sessionStorage.setItem('coffee_flow_import_queue', JSON.stringify(updated));
        }

        onImport(activePreview, parsedRecipes);
        reset();
    };

    const handleSaveDirect = async () => {
        if (!activePreview || !onSaveDirect || selectedIndex === null) return;
        setIsSavingDirect(true);
        try {
            await onSaveDirect(activePreview);
            const updated = [...parsedRecipes];
            updated[selectedIndex] = { ...activePreview, _saved: true };
            setParsedRecipes(updated);

            if (parsedRecipes.length === 1) {
                reset();
                onClose();
            } else {
                // Multi recipe: update session storage queue
                sessionStorage.setItem('coffee_flow_import_queue', JSON.stringify(updated));
                // Move to next unsaved recipe if available, otherwise return to list
                const nextUnsaved = updated.findIndex((r, idx) => !r._saved && idx !== selectedIndex);
                if (nextUnsaved !== -1) {
                    setSelectedIndex(nextUnsaved);
                } else {
                    setSelectedIndex(null);
                }
            }
        } catch {
            setParseError('Failed to save recipe. Please try again.');
        } finally {
            setIsSavingDirect(false);
        }
    };

    const handleSaveSingleCard = async (e: React.MouseEvent, idx: number) => {
        e.stopPropagation();
        const item = parsedRecipes[idx];
        if (!item || item._saved || !onSaveDirect) return;
        setIsSavingDirect(true);
        try {
            await onSaveDirect(item);
            const updated = [...parsedRecipes];
            updated[idx] = { ...item, _saved: true };
            setParsedRecipes(updated);
            sessionStorage.setItem('coffee_flow_import_queue', JSON.stringify(updated));
        } catch {
            setParseError(`Failed to save "${item.name}". Please try again.`);
        } finally {
            setIsSavingDirect(false);
        }
    };

    const handleSaveAll = async () => {
        if (!onSaveDirect) return;
        setIsSavingDirect(true);
        setParseError('');
        const updated = [...parsedRecipes];
        let hasError = false;

        for (let i = 0; i < updated.length; i++) {
            if (!updated[i]._saved) {
                try {
                    await onSaveDirect(updated[i]);
                    updated[i] = { ...updated[i], _saved: true };
                } catch {
                    hasError = true;
                }
            }
        }

        setParsedRecipes([...updated]);
        sessionStorage.setItem('coffee_flow_import_queue', JSON.stringify(updated));
        setIsSavingDirect(false);
        if (hasError) {
            setParseError('Some recipes failed to save. Please try individual recipes.');
        }
    };

    const handlePrevRecipe = () => {
        if (selectedIndex === null || parsedRecipes.length <= 1) return;
        setSelectedIndex((selectedIndex - 1 + parsedRecipes.length) % parsedRecipes.length);
    };

    const handleNextRecipe = () => {
        if (selectedIndex === null || parsedRecipes.length <= 1) return;
        setSelectedIndex((selectedIndex + 1) % parsedRecipes.length);
    };

    const methodLabel = (id?: string) => METHOD_LABELS[id || ''] || (id || 'Unknown').toUpperCase();

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="bg-primary text-white px-5 pt-5 pb-4 flex items-start justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-white">
                            <SplashLogoIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold leading-tight">Import Recipe</h2>
                            <p className="text-[11px] text-white/65 font-medium mt-0.5">
                                {activePreview
                                    ? 'Review recipe details'
                                    : parsedRecipes.length > 1
                                        ? `Select from ${parsedRecipes.length} recipes found`
                                        : 'Paste text, caption, or use AI'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                    >
                        <Icon name="close" className="text-[18px]" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activePreview ? (
                        /* ── Preview Card ── */
                        <div className="p-5 space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon name="check" className="text-[18px] text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-green-800">Recipe extracted successfully</p>
                                    <p className="text-[11px] text-green-600 mt-0.5">Looks good? Save directly, or open the editor to fine-tune.</p>
                                </div>
                                {/* Prev / Next navigator for multi-recipe */}
                                {parsedRecipes.length > 1 && selectedIndex !== null && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={handlePrevRecipe}
                                            className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors cursor-pointer"
                                            title="Previous recipe"
                                        >
                                            <Icon name="chevron_left" className="text-[18px] text-green-700" />
                                        </button>
                                        <span className="text-[10px] font-bold text-green-700 tabular-nums">{selectedIndex + 1}/{parsedRecipes.length}</span>
                                        <button
                                            onClick={handleNextRecipe}
                                            className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors cursor-pointer"
                                            title="Next recipe"
                                        >
                                            <Icon name="chevron_right" className="text-[18px] text-green-700" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                                <div className="px-4 py-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Recipe Name</p>
                                    <p className="text-sm font-bold text-gray-900">{activePreview.name || '—'}</p>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Method</p>
                                        <p className="text-sm font-bold text-primary">{methodLabel(activePreview.method_id)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ratio</p>
                                        <p className="text-sm font-bold text-gray-900">{activePreview.ratio || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Temp</p>
                                        <p className="text-sm font-bold text-gray-900">{activePreview.temperature ? `${activePreview.temperature}°C` : '—'}</p>
                                    </div>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Water</p>
                                        <p className="text-sm font-bold text-gray-900">{activePreview.total_water ? `${activePreview.total_water}g` : '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Grind</p>
                                        <p className="text-sm font-bold text-gray-900">{activePreview.grind_size || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Level</p>
                                        <p className="text-sm font-bold text-gray-900">{activePreview.difficulty || 'Intermediate'}</p>
                                    </div>
                                </div>
                                <div className="px-4 py-3 flex items-center gap-2">
                                    <Icon name="format_list_numbered" className="text-[16px] text-gray-400" />
                                    <p className="text-xs font-semibold text-gray-700">
                                        {(activePreview.steps || []).length} steps detected
                                    </p>
                                </div>
                            </div>

                        </div>
                    ) : parsedRecipes.length > 1 ? (
                        /* ── Multi-Recipe Picker ── */
                        <div className="p-5 space-y-3">
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                                        <SplashLogoIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-900">
                                            {parsedRecipes.length} recipes found
                                            {parsedRecipes.some(r => r._saved) && (
                                                <span className="text-green-700 ml-1">({parsedRecipes.filter(r => r._saved).length} saved)</span>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-amber-700">Select a recipe to preview, or save directly:</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-0.5">
                                {parsedRecipes.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`w-full text-left rounded-2xl p-4 transition-all cursor-pointer border ${item._saved
                                            ? 'bg-green-50/60 border-green-200/80 hover:border-green-300'
                                            : 'bg-gray-50 border-gray-200 hover:bg-primary/5 hover:border-primary/40'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5 gap-2">
                                            <h4 className={`font-bold text-sm ${item._saved ? 'text-green-900' : 'text-gray-900'}`}>{item.name}</h4>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] font-bold uppercase tracking-wide bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600">
                                                    {methodLabel(item.method_id)}
                                                </span>
                                                {item._saved ? (
                                                    <span className="text-[11px] font-bold bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                                                        <Icon name="check" className="text-[14px]" /> Saved
                                                    </span>
                                                ) : onSaveDirect ? (
                                                    <button
                                                        onClick={(e) => handleSaveSingleCard(e, idx)}
                                                        disabled={isSavingDirect}
                                                        className="text-[11px] font-bold bg-primary text-white hover:bg-primary-dark px-3 py-0.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                                    >
                                                        <Icon name="add" className="text-[14px]" /> Save
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">{item.description_short || 'No description'}</p>
                                        <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                                            <span>Ratio: {item.ratio || '1:15'}</span>
                                            <span>•</span>
                                            <span>Water: {item.total_water ? `${item.total_water}g` : '—'}</span>
                                            <span>•</span>
                                            <span>{(item.steps || []).length} steps</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* ── Input Form ── */
                        <div className="p-5 space-y-4">
                            {showMethodPicker && (
                                <Dropdown
                                    label="Brew Tool"
                                    value={methodId}
                                    options={methods.map((m) => ({ value: m.id, label: m.name }))}
                                    onChange={(val) => {
                                        setMethodId(val);
                                        setMethodTouched(true);
                                        setParsedRecipes((prev) => prev.map((r) => ({ ...r, method_id: val })));
                                    }}
                                    placeholder="Select brew tool"
                                />
                            )}

                            {/* Mode Selector */}
                            <div className="bg-gray-50 rounded-2xl p-1 flex gap-1">
                                <button
                                    onClick={() => setMode('offline')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${mode === 'offline' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Paste Text
                                </button>
                                <button
                                    onClick={() => setMode('ai')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${mode === 'ai' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Use AI
                                </button>
                            </div>

                            {mode === 'offline' ? (
                                <div className="space-y-2">
                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                        Paste a recipe caption, YouTube description, or your own brew notes. We'll detect the method, dose, water, temp, and steps automatically.
                                    </p>
                                    <textarea
                                        value={rawInput}
                                        onChange={(e) => { setRawInput(e.target.value); setParseError(''); }}
                                        placeholder={`Example:\nV60 Daily Driver\n15g coffee, 225g water, 93°C\nBloom 45g — 30s\nPour to 180g — 60s\nDrawdown — 30s`}
                                        rows={7}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Step 1 */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${copiedPrompt ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}>
                                                {copiedPrompt ? <Icon name="check" className="text-[14px]" /> : '1'}
                                            </div>
                                            <p className="text-xs font-bold text-gray-800">Paste your recipe link or text</p>
                                        </div>
                                        <textarea
                                            value={rawInput}
                                            onChange={(e) => { setRawInput(e.target.value); setParseError(''); setCopiedPrompt(false); }}
                                            placeholder="YouTube link, TikTok caption, blog URL, or recipe text..."
                                            rows={3}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        />
                                        <button
                                            onClick={handleCopyPrompt}
                                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${copiedPrompt ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-dark shadow-sm'}`}
                                        >
                                            <Icon name={copiedPrompt ? "check_circle" : "content_copy"} className="text-[16px]" />
                                            {copiedPrompt ? 'Prompt copied — open Gemini or ChatGPT' : 'Copy prompt for Gemini / ChatGPT'}
                                        </button>
                                    </div>

                                    {/* Divider */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-[1px] bg-gray-100" />
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">then</span>
                                        <div className="flex-1 h-[1px] bg-gray-100" />
                                    </div>

                                    {/* Step 2 */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">2</div>
                                            <p className="text-xs font-bold text-gray-800">Paste the JSON response here</p>
                                        </div>
                                        <p className="text-[11px] text-gray-400 ml-7">After sending the prompt, copy the AI's JSON reply and paste it below.</p>
                                        <textarea
                                            value={aiJsonResponse}
                                            onChange={(e) => { setAiJsonResponse(e.target.value); setParseError(''); }}
                                            placeholder={'[ { "name": "Recipe 1", ... }, { "name": "Recipe 2", ... } ]'}
                                            rows={4}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {parseError && (
                                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                                    <Icon name="error_outline" className="text-[16px] text-red-400 shrink-0" />
                                    <p className="text-[11px] font-semibold text-red-600">{parseError}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex gap-3 shrink-0">
                    {activePreview ? (
                        <>
                            {/* Back button */}
                            <button
                                onClick={() => setSelectedIndex(null)}
                                className="w-10 h-10 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                title={parsedRecipes.length > 1 ? 'Back to list' : 'Try again'}
                            >
                                <Icon name="arrow_back" className="text-[18px]" />
                            </button>

                            {/* Edit & Save */}
                            <button
                                onClick={handleEditAndSave}
                                className="flex-1 py-3 border-2 border-primary text-primary rounded-2xl text-xs font-bold hover:bg-primary/5 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Icon name="edit" className="text-[15px]" />
                                Edit & Save
                            </button>

                            {/* Save Now — only shown when onSaveDirect is provided */}
                            {onSaveDirect && (
                                <button
                                    onClick={handleSaveDirect}
                                    disabled={isSavingDirect}
                                    className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/30 hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSavingDirect ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="check_circle" className="text-[15px]" />
                                            Save Now
                                        </>
                                    )}
                                </button>
                            )}
                        </>
                    ) : parsedRecipes.length > 1 ? (
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-2xl text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                {parsedRecipes.every(r => r._saved) ? 'Done' : 'Cancel'}
                            </button>
                            {onSaveDirect && parsedRecipes.some(r => !r._saved) && (
                                <button
                                    onClick={handleSaveAll}
                                    disabled={isSavingDirect}
                                    className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/30 hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                                >
                                    {isSavingDirect ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Saving All...
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="done_all" className="text-[16px]" />
                                            Save All ({parsedRecipes.filter(r => !r._saved).length})
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-2xl text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExtract}
                                className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/30 hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <SplashLogoIcon className="w-4 h-4" />
                                Extract Recipe
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

