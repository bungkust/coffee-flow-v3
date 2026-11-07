import { useState, useEffect } from 'react';
import { Icon, SplashLogoIcon } from './Icons';
import { Dropdown } from './Dropdown';
import { useBackHandler } from '../shared/utils/backNavigation';
import type { Drink, DrinkBaseType, DrinkCategory, DrinkIngredient } from '../shared/domain/entities';

export interface ImportableDrink extends Partial<Drink> {
    _saved?: boolean;
    ingredientsList?: (string | DrinkIngredient)[];
    instructionsList?: string[];
}

interface DrinkSmartImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultBaseType?: DrinkBaseType;
    /** Navigate to edit page pre-filled with the drink */
    onImportToEdit: (importedDrink: ImportableDrink, remainingQueue?: ImportableDrink[]) => void;
    /** Save directly to DB without opening edit page */
    onSaveDirect?: (importedDrink: ImportableDrink) => Promise<void>;
    /** Initial parsed drinks list (restored queue) */
    initialParsedDrinks?: ImportableDrink[];
}

const DRINK_PROMPT_TEMPLATE = `Please extract all beverage and drink recipes (both coffee and non-coffee) from this text, caption, or YouTube link into JSON format strictly as shown below (do not include any explanation or extra text outside JSON).

YOUTUBE VIDEO EXTRACTION INSTRUCTIONS:
- If the source is a YouTube link (e.g. youtu.be or youtube.com/watch):
  1. Access the video transcript, description, or watch the video directly.
  2. Extract the exact ingredients (with amounts and units), drink temperature (hot/cold), base type, and preparation instructions.
  3. If multiple drinks are made in the video, extract each as a separate drink object in the JSON array.

PARAMETER GUIDELINES (STRICT RULES):
1. "name": Natural, concise drink title (e.g. "Iced Caramel Oat Macchiato", "Kyoto Ceremonial Dirty Matcha", "Classic Hot Chocolate", "Iced Spanish Latte").
2. "base_type": Must be ONE of:
   - "coffee" (if it contains espresso, cold brew, drip coffee, or coffee concentrate)
   - "non_coffee" (matcha, chocolate/cocoa, tea/chai, milk-based, taro, refresher)
3. "category": Must be either "hot" or "cold".
4. "ingredients": Array of ingredients. For each ingredient:
   - "name": Ingredient name (e.g. "Espresso", "Oat Milk", "Caramel Syrup", "Matcha Powder", "Ice Cubes").
   - "amount": Numerical amount (e.g. 2, 180, 20, 4, 100).
   - "unit": One of "ml", "g", "shot", "pump", "tsp", "tbsp", "pcs", "cube".
   - "category": (Optional) One of "beans", "milk", "syrup", "sugar", "other_ingredient".
5. "instructions": Array of sequential step strings (e.g. ["Brew 2 shots of fresh espresso", "Fill a glass with ice cubes and 180ml oat milk", "Pour caramel syrup", "Gently pour espresso over milk"]).

MULTI-DRINK RULE:
If the source contains MULTIPLE drink recipes, extract ALL drinks into a JSON array:
\`\`\`json
[
  {
    "name": "Drink 1",
    "base_type": "coffee",
    "category": "cold",
    ...
  },
  {
    "name": "Drink 2",
    "base_type": "non_coffee",
    "category": "hot",
    ...
  }
]
\`\`\`

REQUIRED JSON OUTPUT FORMAT:
\`\`\`json
[
  {
    "name": "Iced Caramel Oat Macchiato",
    "base_type": "coffee",
    "category": "cold",
    "ingredients": [
      { "name": "Espresso", "amount": 2, "unit": "shot", "category": "beans" },
      { "name": "Oat Milk", "amount": 160, "unit": "ml", "category": "milk" },
      { "name": "Vanilla Syrup", "amount": 2, "unit": "pump", "category": "syrup" },
      { "name": "Caramel Drizzle", "amount": 10, "unit": "g", "category": "syrup" },
      { "name": "Ice Cubes", "amount": 120, "unit": "g" }
    ],
    "instructions": [
      "Brew 2 shots of fresh espresso.",
      "Fill a glass with ice cubes.",
      "Add 2 pumps vanilla syrup and pour 160ml oat milk.",
      "Gently pour espresso over milk for layered look.",
      "Top with caramel drizzle."
    ]
  }
]
\`\`\`
`;

const extractUrl = (text: string): string => (text.match(/https?:\/\/\S+/) || [])[0] || '';

const formatIngredientToString = (ing: string | DrinkIngredient): string => {
    if (typeof ing === 'string') return ing.trim();
    if (!ing || typeof ing !== 'object') return '';
    const amt = ing.amount != null ? (['ml', 'g'].includes(ing.unit || '') ? `${ing.amount}${ing.unit}` : `${ing.amount} ${ing.unit || ''}`.trim()) : '';
    return `${amt} ${ing.name || ''}`.trim();
};

const parseDrinkItem = (item: Record<string, unknown>, fallbackBaseType: DrinkBaseType): ImportableDrink => {
    const rawName = String(item.name || 'Imported Drink').trim();
    // Clean unwanted prefix like "Recipe: " or "Cara Membuat "
    const name = rawName.replace(/^(resep|recipe|cara membuat)\s*[-:]?\s*/i, '').trim() || 'Imported Drink';

    const baseTypeStr = String(item.base_type || '').toLowerCase();
    const baseType: DrinkBaseType =
        baseTypeStr === 'coffee' || baseTypeStr === 'non_coffee'
            ? baseTypeStr
            : /espresso|kopi|coffee|cold brew|latte|cappuccino|americano|macchiato/i.test(name)
              ? 'coffee'
              : fallbackBaseType;

    const categoryStr = String(item.category || '').toLowerCase();
    const category: DrinkCategory =
        categoryStr === 'cold' || categoryStr === 'hot'
            ? categoryStr
            : /ice|iced|dingin|es|cold|frappe/i.test(name)
              ? 'cold'
              : 'hot';

    const rawIngredients = Array.isArray(item.ingredients)
        ? (item.ingredients as (string | DrinkIngredient)[])
        : [];
    // Convert to normalized string list for storage in SQLite/JSON
    const stringIngredients = rawIngredients.map(formatIngredientToString).filter(Boolean);

    const rawInstructions = Array.isArray(item.instructions)
        ? item.instructions.map(String)
        : typeof item.instructions === 'string'
          ? [item.instructions]
          : [];
    const instructions = rawInstructions.map((s) => s.trim()).filter(Boolean);

    return {
        id: crypto.randomUUID(),
        name,
        base_type: baseType,
        category,
        ingredients_json: JSON.stringify(stringIngredients),
        instructions_json: JSON.stringify(instructions),
        ingredientsList: rawIngredients.length > 0 ? rawIngredients : stringIngredients,
        instructionsList: instructions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
};

const parseSingleOfflineDrinkBlock = (
    text: string,
    fallbackBaseType: DrinkBaseType,
    fallbackCategory: DrinkCategory
): ImportableDrink | null => {
    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    if (lines.length === 0) return null;

    const title = lines[0]
        .replace(/^#+\s*/, '')
        .replace(/^(resep|recipe|cara membuat)\s*[-:]?\s*/i, '')
        .replace(/^[-*•\d+.]\s*/, '')
        .slice(0, 50)
        .trim();

    const lower = text.toLowerCase();

    const detectedBase: DrinkBaseType = /espresso|kopi|coffee|cold brew|ristretto|lungo|americano|latte|cappuccino|macchiato/i.test(lower)
        ? 'coffee'
        : /matcha|cokelat|chocolate|tea|teh|taro|susu|milk|chai|cocoa|red velvet/i.test(lower)
          ? 'non_coffee'
          : fallbackBaseType;

    const detectedCat: DrinkCategory = /ice|iced|dingin|es|cold|frappe|blended|fresh/i.test(lower)
        ? 'cold'
        : /hot|hangat|panas|warm|steamed/i.test(lower)
          ? 'hot'
          : fallbackCategory;

    const ingredients: string[] = [];
    const instructions: string[] = [];
    let currentSection: 'ingredients' | 'instructions' | 'none' = 'none';

    for (const line of lines.slice(1)) {
        if (/^(bahan|ingredients|bahan-bahan|composition|komposisi)/i.test(line)) {
            currentSection = 'ingredients';
            continue;
        }
        if (/^(instruksi|instructions|cara membuat|langkah|steps|method|cara pembuatan)/i.test(line)) {
            currentSection = 'instructions';
            continue;
        }

        const cleanLine = line.replace(/^[-*•\d+.)]\s*/, '').trim();
        if (!cleanLine) continue;

        if (currentSection === 'ingredients') {
            ingredients.push(cleanLine);
        } else if (currentSection === 'instructions') {
            instructions.push(cleanLine);
        } else {
            // Heuristic: line with quantities looks like ingredient
            if (/\d+\s*(?:g|ml|shot|pump|tbsp|tsp|sendok|oz|cube|balok|biji|pcs)/i.test(cleanLine)) {
                ingredients.push(cleanLine);
            } else {
                instructions.push(cleanLine);
            }
        }
    }

    // Fallbacks if one of the lists was empty
    if (ingredients.length === 0 && instructions.length === 0) {
        return null;
    }

    return {
        id: crypto.randomUUID(),
        name: title || 'Imported Drink',
        base_type: detectedBase,
        category: detectedCat,
        ingredients_json: JSON.stringify(ingredients),
        instructions_json: JSON.stringify(instructions),
        ingredientsList: ingredients,
        instructionsList: instructions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
};

const parseOfflineRawText = (
    text: string,
    fallbackBaseType: DrinkBaseType,
    fallbackCategory: DrinkCategory
): ImportableDrink[] => {
    // 1. Check for multiple drink blocks separated by divider lines (--- or ===)
    const blocks = text
        .split(/(?:\r?\n\s*[-=_]{3,}\s*\r?\n)/)
        .map((b) => b.trim())
        .filter(Boolean);

    if (blocks.length > 1) {
        const results = blocks
            .map((b) => parseSingleOfflineDrinkBlock(b, fallbackBaseType, fallbackCategory))
            .filter((d): d is ImportableDrink => d !== null);
        if (results.length > 0) return results;
    }

    // 2. Single block parse
    const single = parseSingleOfflineDrinkBlock(text, fallbackBaseType, fallbackCategory);
    return single ? [single] : [];
};

export const DrinkSmartImportModal = ({
    isOpen,
    onClose,
    defaultBaseType = 'coffee',
    onImportToEdit,
    onSaveDirect,
    initialParsedDrinks
}: DrinkSmartImportModalProps) => {
    const [mode, setMode] = useState<'offline' | 'ai'>('ai');
    const [rawInput, setRawInput] = useState('');
    const [aiJsonResponse, setAiJsonResponse] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [parseError, setParseError] = useState('');
    const [parsedDrinks, setParsedDrinks] = useState<ImportableDrink[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isSavingDirect, setIsSavingDirect] = useState(false);

    // Offline overrides
    const [offlineBaseType, setOfflineBaseType] = useState<DrinkBaseType>(defaultBaseType);
    const [offlineCategory, setOfflineCategory] = useState<DrinkCategory>('cold');

    useEffect(() => {
        if (isOpen) {
            setOfflineBaseType(defaultBaseType);
        }
    }, [isOpen, defaultBaseType]);

    useEffect(() => {
        if (isOpen && initialParsedDrinks && initialParsedDrinks.length > 0) {
            setParsedDrinks(initialParsedDrinks);
            setSelectedIndex(initialParsedDrinks.length === 1 ? 0 : null);
        }
    }, [isOpen, initialParsedDrinks]);

    const resetState = () => {
        setRawInput('');
        setAiJsonResponse('');
        setCopiedPrompt(false);
        setParseError('');
        setParsedDrinks([]);
        setSelectedIndex(null);
        setMode('ai');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    useBackHandler(isOpen, handleClose);

    if (!isOpen) return null;

    const handleCopyPrompt = async () => {
        const sourceUrl = extractUrl(rawInput);
        const sourceText = rawInput.trim();
        const fullPrompt = `${DRINK_PROMPT_TEMPLATE}\n\nSOURCE TO EXTRACT FROM:\n${sourceText || sourceUrl || '(Paste recipe text or link here)'}`;
        try {
            await navigator.clipboard.writeText(fullPrompt);
            setCopiedPrompt(true);
            setTimeout(() => setCopiedPrompt(false), 3000);
        } catch {
            setParseError('Could not copy automatically. Please copy the text manually.');
        }
    };

    const handleExtract = () => {
        setParseError('');
        const source = mode === 'ai' ? (aiJsonResponse || rawInput) : rawInput;
        if (!source.trim()) {
            setParseError(
                mode === 'ai'
                    ? 'Paste the JSON response from Gemini or ChatGPT to continue.'
                    : 'Paste a drink recipe text or caption to get started.'
            );
            return;
        }

        // 1. Try JSON extraction first
        try {
            const jsonMatch = source.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const valid = parsed
                        .filter((item) => item && typeof item === 'object')
                        .map((item) => parseDrinkItem(item as Record<string, unknown>, offlineBaseType));
                    if (valid.length > 0) {
                        setParsedDrinks(valid);
                        setSelectedIndex(valid.length === 1 ? 0 : null);
                        return;
                    }
                } else if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.drinks) && parsed.drinks.length > 0) {
                        const valid = parsed.drinks.map((item: Record<string, unknown>) =>
                            parseDrinkItem(item, offlineBaseType)
                        );
                        setParsedDrinks(valid);
                        setSelectedIndex(valid.length === 1 ? 0 : null);
                        return;
                    }
                    const single = parseDrinkItem(parsed as Record<string, unknown>, offlineBaseType);
                    setParsedDrinks([single]);
                    setSelectedIndex(0);
                    return;
                }
            }
        } catch {
            // Continue to offline parser
        }

        // 2. Offline rule-based parser
        const offlineResults = parseOfflineRawText(source, offlineBaseType, offlineCategory);
        if (offlineResults.length > 0) {
            setParsedDrinks(offlineResults);
            setSelectedIndex(offlineResults.length === 1 ? 0 : null);
        } else {
            setParseError('Could not recognize drink recipe structure. Please check input or use AI prompt.');
        }
    };

    const activePreview = selectedIndex !== null ? parsedDrinks[selectedIndex] : null;

    const handleEditAndSave = () => {
        if (!activePreview || selectedIndex === null) return;

        // If multi-drink import, save remaining queue state in sessionStorage
        if (parsedDrinks.length > 1) {
            const updated = [...parsedDrinks];
            updated[selectedIndex] = { ...activePreview, _saved: true };
            sessionStorage.setItem('coffee_flow_drink_import_queue', JSON.stringify(updated));
        }

        onImportToEdit(activePreview, parsedDrinks);
        resetState();
    };

    const handleSaveDirect = async () => {
        if (!activePreview || !onSaveDirect || selectedIndex === null) return;
        setIsSavingDirect(true);
        try {
            await onSaveDirect(activePreview);
            const updated = [...parsedDrinks];
            updated[selectedIndex] = { ...activePreview, _saved: true };
            setParsedDrinks(updated);

            if (parsedDrinks.length === 1) {
                resetState();
                onClose();
            } else {
                sessionStorage.setItem('coffee_flow_drink_import_queue', JSON.stringify(updated));
                // Move to next unsaved drink if available, otherwise return to list
                const nextUnsaved = updated.findIndex((d, idx) => !d._saved && idx !== selectedIndex);
                if (nextUnsaved !== -1) {
                    setSelectedIndex(nextUnsaved);
                } else {
                    setSelectedIndex(null);
                }
            }
        } catch {
            setParseError('Failed to save drink directly. Please try editing instead.');
        } finally {
            setIsSavingDirect(false);
        }
    };

    const handleSaveSingleCard = async (e: React.MouseEvent, idx: number) => {
        e.stopPropagation();
        const item = parsedDrinks[idx];
        if (!item || item._saved || !onSaveDirect) return;
        setIsSavingDirect(true);
        try {
            await onSaveDirect(item);
            const updated = [...parsedDrinks];
            updated[idx] = { ...item, _saved: true };
            setParsedDrinks(updated);
            sessionStorage.setItem('coffee_flow_drink_import_queue', JSON.stringify(updated));
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
        const updated = [...parsedDrinks];
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

        setParsedDrinks([...updated]);
        sessionStorage.setItem('coffee_flow_drink_import_queue', JSON.stringify(updated));
        setIsSavingDirect(false);
        if (hasError) {
            setParseError('Some drinks failed to save. Please try individual drinks.');
        }
    };

    const handlePrevDrink = () => {
        if (selectedIndex === null || parsedDrinks.length <= 1) return;
        setSelectedIndex((selectedIndex - 1 + parsedDrinks.length) % parsedDrinks.length);
    };

    const handleNextDrink = () => {
        if (selectedIndex === null || parsedDrinks.length <= 1) return;
        setSelectedIndex((selectedIndex + 1) % parsedDrinks.length);
    };

    const savedCount = parsedDrinks.filter((d) => d._saved).length;
    const unsavedCount = parsedDrinks.length - savedCount;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-md-surface rounded-t-[32px] sm:rounded-3xl shadow-2xl border-t sm:border border-md-outline-variant/30 overflow-hidden flex flex-col max-h-[92vh] text-md-on-surface">
                {/* Header */}
                <div className="bg-primary text-white px-5 pt-3 pb-4 flex flex-col shrink-0 shadow-sm">
                    <div className="w-10 h-1 rounded-full bg-white/40 mx-auto mb-3 sm:hidden" />
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-white">
                                <SplashLogoIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold leading-tight">Import Resep Minuman</h2>
                                <p className="text-[11px] text-white/75 font-medium mt-0.5">
                                    {activePreview
                                        ? 'Tinjau detail resep minuman'
                                        : parsedDrinks.length > 1
                                          ? `Pilih dari ${parsedDrinks.length} resep ditemukan`
                                          : 'Dari AI, medsos, atau catatan resep'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                            aria-label="Close"
                        >
                            <Icon name="close" className="text-[18px]" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {parseError && (
                        <div className="m-4 mb-0 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                            <Icon name="error" className="text-[18px] text-red-500 shrink-0 mt-0.5" />
                            <span>{parseError}</span>
                        </div>
                    )}

                    {activePreview ? (
                        /* ── Detailed Preview Card ── */
                        <div className="p-5 space-y-4">
                            <div className="p-3.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center text-green-700 dark:text-green-300 shrink-0 mt-0.5">
                                    <Icon name="check_circle" className="text-[18px]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-green-800 dark:text-green-200">
                                        Drink recipe extracted!
                                    </p>
                                    <p className="text-[11px] text-green-700 dark:text-green-400 mt-0.5">
                                        Save directly or customize in the drink editor.
                                    </p>
                                </div>
                                {/* Prev / Next navigator for multi-drink */}
                                {parsedDrinks.length > 1 && selectedIndex !== null && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={handlePrevDrink}
                                            className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 hover:bg-green-200 flex items-center justify-center text-green-800 dark:text-green-200 transition-colors cursor-pointer"
                                            title="Previous drink"
                                        >
                                            <Icon name="chevron_left" className="text-[18px]" />
                                        </button>
                                        <span className="text-[11px] font-bold text-green-800 dark:text-green-200 tabular-nums px-0.5">
                                            {selectedIndex + 1}/{parsedDrinks.length}
                                        </span>
                                        <button
                                            onClick={handleNextDrink}
                                            className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 hover:bg-green-200 flex items-center justify-center text-green-800 dark:text-green-200 transition-colors cursor-pointer"
                                            title="Next drink"
                                        >
                                            <Icon name="chevron_right" className="text-[18px]" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Details Overview Card */}
                            <div className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl divide-y divide-md-outline-variant/20 overflow-hidden">
                                <div className="px-4 py-3.5">
                                    <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-1">
                                        Drink Name
                                    </p>
                                    <h3 className="text-base font-bold text-md-on-surface leading-snug">
                                        {activePreview.name || '—'}
                                    </h3>
                                </div>

                                <div className="px-4 py-3 grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-1">
                                            Base Type
                                        </p>
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                activePreview.base_type === 'non_coffee'
                                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                                                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                                            }`}
                                        >
                                            <Icon
                                                name={activePreview.base_type === 'non_coffee' ? 'eco' : 'coffee'}
                                                className="text-[14px]"
                                            />
                                            {activePreview.base_type === 'non_coffee' ? 'Non-Coffee' : 'Coffee Base'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-1">
                                            Category
                                        </p>
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                String(activePreview.category).toLowerCase() === 'hot'
                                                    ? 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200'
                                                    : 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200'
                                            }`}
                                        >
                                            <Icon
                                                name={
                                                    String(activePreview.category).toLowerCase() === 'hot'
                                                        ? 'local_fire_department'
                                                        : 'ac_unit'
                                                }
                                                className="text-[14px]"
                                            />
                                            {String(activePreview.category).toLowerCase() === 'hot' ? 'Hot' : 'Cold'}
                                        </span>
                                    </div>
                                </div>

                                {/* Ingredients List */}
                                <div className="px-4 py-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider">
                                            Ingredients ({(activePreview.ingredientsList || []).length})
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 bg-md-surface-container-high/60 rounded-xl p-3 border border-md-outline-variant/20">
                                        {(activePreview.ingredientsList || []).map((ing, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <span className="w-1.5 h-1.5 rounded-full bg-md-primary shrink-0" />
                                                <span className="text-md-on-surface font-medium">
                                                    {formatIngredientToString(ing)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Instructions List */}
                                <div className="px-4 py-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider">
                                            Instructions ({(activePreview.instructionsList || []).length})
                                        </p>
                                    </div>
                                    <div className="space-y-2 bg-md-surface-container-high/60 rounded-xl p-3 border border-md-outline-variant/20">
                                        {(activePreview.instructionsList || []).map((step, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
                                                <span className="font-bold text-md-primary shrink-0 min-w-[18px]">
                                                    {idx + 1}.
                                                </span>
                                                <span className="text-md-on-surface">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : parsedDrinks.length > 1 ? (
                        /* ── Multi-Drink Picker List ── */
                        <div className="p-5 space-y-3">
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-800 dark:text-amber-200">
                                        <SplashLogoIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
                                            {parsedDrinks.length} drinks found
                                            {savedCount > 0 && (
                                                <span className="text-green-700 dark:text-green-400 ml-1.5">
                                                    ({savedCount} saved)
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                            Tap any drink to preview, or save directly:
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-0.5">
                                {parsedDrinks.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`w-full text-left rounded-2xl p-4 transition-all cursor-pointer border ${
                                            item._saved
                                                ? 'bg-green-50/70 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                                                : 'bg-md-surface-container-low border-md-outline-variant/30 hover:bg-md-primary/5 hover:border-md-primary/40'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <h4
                                                className={`font-bold text-sm leading-tight ${
                                                    item._saved
                                                        ? 'text-green-900 dark:text-green-200'
                                                        : 'text-md-on-surface'
                                                }`}
                                            >
                                                {item.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] font-bold uppercase tracking-wide bg-md-surface px-2 py-0.5 rounded-full border border-md-outline-variant/40 text-md-on-surface-variant">
                                                    {item.base_type === 'non_coffee' ? 'Non-Coffee' : 'Coffee'}
                                                </span>
                                                {item._saved ? (
                                                    <span className="text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-green-200 dark:border-green-800">
                                                        <Icon name="check" className="text-[14px]" /> Saved
                                                    </span>
                                                ) : onSaveDirect ? (
                                                    <button
                                                        onClick={(e) => handleSaveSingleCard(e, idx)}
                                                        disabled={isSavingDirect}
                                                        className="text-[11px] font-bold bg-md-primary text-white hover:bg-md-primary/90 px-3 py-0.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                                    >
                                                        <Icon name="add" className="text-[14px]" /> Save
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px] text-md-on-surface-variant font-medium">
                                            <span className="capitalize flex items-center gap-1">
                                                <Icon
                                                    name={
                                                        String(item.category).toLowerCase() === 'hot'
                                                            ? 'local_fire_department'
                                                            : 'ac_unit'
                                                    }
                                                    className="text-[13px]"
                                                />
                                                <span>{String(item.category).toLowerCase() === 'hot' ? 'Hot' : 'Cold'}</span>
                                            </span>
                                            <span>•</span>
                                            <span>{(item.ingredientsList || []).length} ingredients</span>
                                            <span>•</span>
                                            <span>{(item.instructionsList || []).length} steps</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* ── Input Form ── */
                        <div className="p-5 space-y-4">
                            {/* Segmented Control */}
                            <div className="bg-md-surface-container rounded-2xl p-1 flex gap-1 border border-md-outline-variant/20 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('ai');
                                        setParseError('');
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                        mode === 'ai'
                                            ? 'bg-md-surface text-primary shadow-xs'
                                            : 'text-md-on-surface-variant hover:text-md-on-surface'
                                    }`}
                                >
                                    <Icon name="auto_awesome" className="text-sm" />
                                    <span>Smart AI</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('offline');
                                        setParseError('');
                                    }}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                        mode === 'offline'
                                            ? 'bg-md-surface text-primary shadow-xs'
                                            : 'text-md-on-surface-variant hover:text-md-on-surface'
                                    }`}
                                >
                                    <Icon name="edit_note" className="text-base" />
                                    <span>Teks Manual</span>
                                </button>
                            </div>

                            {mode === 'offline' ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Dropdown
                                            label="Base Minuman"
                                            value={offlineBaseType}
                                            options={[
                                                { value: 'coffee', label: 'Coffee', icon: 'coffee' },
                                                { value: 'non_coffee', label: 'Non-Coffee', icon: 'eco' },
                                            ]}
                                            onChange={(val) => setOfflineBaseType(val as DrinkBaseType)}
                                        />
                                        <Dropdown
                                            label="Suhu"
                                            value={offlineCategory}
                                            options={[
                                                { value: 'cold', label: 'Cold / Dingin', icon: 'ac_unit' },
                                                { value: 'hot', label: 'Hot / Hangat', icon: 'local_fire_department' },
                                            ]}
                                            onChange={(val) => setOfflineCategory(val as DrinkCategory)}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-md-on-surface">Teks Resep Minuman</label>
                                        <textarea
                                            value={rawInput}
                                            onChange={(e) => {
                                                setRawInput(e.target.value);
                                                setParseError('');
                                            }}
                                            rows={8}
                                            placeholder={`Iced Spanish Latte\n\nBahan:\n- 2 shot espresso\n- 120ml susu segar\n- 30ml kental manis\n- 120g es batu\n\nLangkah:\n1. Tuang kental manis ke dasar gelas\n2. Masukkan es batu & susu\n3. Tuang espresso di atasnya`}
                                            className="w-full bg-md-surface-container-high/50 border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/40 rounded-2xl p-3 text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Step 1: Sumber */}
                                    <div className="p-3.5 rounded-2xl bg-md-surface-container-low border border-md-outline-variant/30 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="size-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                                                <h3 className="text-xs font-bold text-md-on-surface">Sumber Resep</h3>
                                            </div>
                                            {/youtube\.com|youtu\.be/i.test(rawInput) && (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                                                    <Icon name="smart_display" className="text-sm" /> YouTube
                                                </span>
                                            )}
                                        </div>
                                        <textarea
                                            value={rawInput}
                                            onChange={(e) => {
                                                setRawInput(e.target.value);
                                                setParseError('');
                                                setCopiedPrompt(false);
                                            }}
                                            placeholder="Tempel link YouTube, TikTok, Instagram caption, atau resep..."
                                            rows={2}
                                            className="w-full bg-md-surface-container-high/50 border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/40 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        />
                                        <div className="flex items-center gap-2 pt-0.5">
                                            <button
                                                type="button"
                                                onClick={handleCopyPrompt}
                                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                                                    copiedPrompt
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-primary text-white hover:bg-primary-dark'
                                                }`}
                                            >
                                                <Icon name={copiedPrompt ? 'check' : 'content_copy'} className="text-sm" />
                                                <span>{copiedPrompt ? 'Prompt Disalin!' : 'Salin Prompt AI'}</span>
                                            </button>
                                            <a
                                                href="https://chatgpt.com"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="py-2 px-3 rounded-xl bg-md-surface-container border border-md-outline-variant/30 text-xs font-bold text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center gap-1"
                                            >
                                                <span>ChatGPT</span>
                                                <Icon name="open_in_new" className="text-[12px]" />
                                            </a>
                                            <a
                                                href="https://gemini.google.com"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="py-2 px-3 rounded-xl bg-md-surface-container border border-md-outline-variant/30 text-xs font-bold text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center gap-1"
                                            >
                                                <span>Gemini</span>
                                                <Icon name="open_in_new" className="text-[12px]" />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Step 2: Hasil JSON */}
                                    <div className={`p-3.5 rounded-2xl bg-md-surface-container-low border transition-all space-y-2 ${
                                        copiedPrompt
                                            ? 'border-primary/50 ring-2 ring-primary/15'
                                            : 'border-md-outline-variant/30'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`size-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                                aiJsonResponse.trim() ? 'bg-emerald-600 text-white' : 'bg-md-surface-container-highest text-md-on-surface'
                                            }`}>2</span>
                                            <h3 className="text-xs font-bold text-md-on-surface">Hasil JSON AI</h3>
                                        </div>
                                        <textarea
                                            value={aiJsonResponse}
                                            onChange={(e) => {
                                                setAiJsonResponse(e.target.value);
                                                setParseError('');
                                            }}
                                            placeholder='[ { "name": "Iced Spanish Latte", ... } ]'
                                            rows={3}
                                            className="w-full bg-md-surface-container-high/50 border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/40 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {parseError && (
                                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2 flex items-center gap-2">
                                    <Icon name="error_outline" className="text-[16px] text-red-500 shrink-0" />
                                    <p className="text-[11px] font-semibold text-red-600 dark:text-red-300">{parseError}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 pb-[max(env(safe-area-inset-bottom),1rem)] border-t border-md-outline-variant/30 bg-md-surface-container-low flex items-center justify-between gap-3 shrink-0">
                    {activePreview ? (
                        <>
                            {/* Back button */}
                            <button
                                onClick={() => setSelectedIndex(null)}
                                className="w-10 h-10 border border-md-outline-variant/50 text-md-on-surface-variant rounded-xl hover:bg-md-surface-container-high transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                title={parsedDrinks.length > 1 ? 'Back to list' : 'Try again'}
                            >
                                <Icon name="arrow_back" className="text-[18px]" />
                            </button>

                            {/* Edit & Save */}
                            <button
                                onClick={handleEditAndSave}
                                className="flex-1 py-2.5 px-3 border border-md-primary text-md-primary rounded-xl text-xs font-bold hover:bg-md-primary/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Icon name="edit" className="text-[15px]" />
                                <span>Customize in Editor</span>
                            </button>

                            {/* Direct Save */}
                            {onSaveDirect && (
                                <button
                                    onClick={handleSaveDirect}
                                    disabled={isSavingDirect}
                                    className="flex-1 py-2.5 px-3 bg-md-primary text-white rounded-xl text-xs font-bold shadow-md shadow-md-primary/20 hover:bg-md-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSavingDirect ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="check_circle" className="text-[15px]" />
                                            <span>Save Directly</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </>
                    ) : parsedDrinks.length > 1 ? (
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-2.5 border border-md-outline-variant text-md-on-surface rounded-xl text-xs font-bold hover:bg-md-surface-container-high transition-colors cursor-pointer"
                            >
                                {savedCount === parsedDrinks.length ? 'Done' : 'Cancel'}
                            </button>
                            {onSaveDirect && unsavedCount > 0 && (
                                <button
                                    onClick={handleSaveAll}
                                    disabled={isSavingDirect}
                                    className="flex-1 py-2.5 bg-md-primary text-white rounded-xl text-xs font-bold shadow-md shadow-md-primary/20 hover:bg-md-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                                >
                                    {isSavingDirect ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            <span>Saving All...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="done_all" className="text-[16px]" />
                                            <span>Save All ({unsavedCount})</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 border border-md-outline-variant/30 text-md-on-surface rounded-2xl text-xs font-bold hover:bg-md-surface-container-high transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleExtract}
                                disabled={mode === 'ai' ? (!aiJsonResponse.trim() && !rawInput.trim()) : !rawInput.trim()}
                                className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Icon name={mode === 'ai' ? "auto_awesome" : "local_cafe"} className="text-base" />
                                <span>Ekstrak Minuman</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
