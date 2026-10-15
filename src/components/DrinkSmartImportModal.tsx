import { useState } from 'react';
import { Icon } from './Icons';
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
    onImportToEdit: (importedDrink: ImportableDrink) => void;
    onSaveDirect?: (importedDrink: ImportableDrink) => Promise<void>;
}

const DRINK_PROMPT_TEMPLATE = `Please extract all beverage/drink recipes from this text/link into JSON format strictly as shown below (do not include any explanation or extra text outside JSON).

PARAMETER GUIDELINES (STRICT RULES):
1. "name": Natural drink title (e.g. "Iced Vanilla Oat Latte", "Kyoto Dirty Matcha", "Classic Hot Chocolate").
2. "base_type": Must be either "coffee" (if it contains espresso, cold brew, or coffee) or "non_coffee" (matcha, chocolate, tea, milk).
3. "category": Must be either "Hot" or "Cold".
4. "ingredients": Array of ingredients. For each ingredient:
   - "name": Ingredient name (e.g. "Espresso", "Oat Milk", "Vanilla Syrup", "Matcha Powder", "Ice Cubes").
   - "amount": Numerical amount (e.g. 2, 180, 20, 5, 100).
   - "unit": One of "ml", "g", "shot", "pump", "tsp", "tbsp", "pcs", "cube".
   - "category": (Optional) One of "beans", "milk", "syrup", "sugar", "other_ingredient".
5. "instructions": Array of step-by-step strings (e.g. ["Pull double shot espresso", "Add syrup and milk to cup", "Pour espresso over milk"]).

REQUIRED JSON OUTPUT FORMAT:
\`\`\`json
[
  {
    "name": "Iced Vanilla Oat Latte",
    "base_type": "coffee",
    "category": "Cold",
    "ingredients": [
      { "name": "Espresso", "amount": 2, "unit": "shot", "category": "beans" },
      { "name": "Oat Milk", "amount": 150, "unit": "ml", "category": "milk" },
      { "name": "Vanilla Syrup", "amount": 2, "unit": "pump", "category": "syrup" },
      { "name": "Ice Cubes", "amount": 100, "unit": "g" }
    ],
    "instructions": [
      "Brew 2 shots of fresh espresso.",
      "Fill a glass with ice cubes.",
      "Add 2 pumps of vanilla syrup and pour 150ml oat milk.",
      "Gently pour espresso over milk for layered presentation."
    ]
  }
]
\`\`\`
`;

const SAMPLE_DRINK_JSON = `[
  {
    "name": "Dirty Matcha Oat Latte",
    "base_type": "coffee",
    "category": "Cold",
    "ingredients": [
      { "name": "Espresso", "amount": 1, "unit": "shot", "category": "beans" },
      { "name": "Matcha Powder", "amount": 4, "unit": "g", "category": "other_ingredient" },
      { "name": "Warm Water", "amount": 30, "unit": "ml" },
      { "name": "Oat Milk", "amount": 150, "unit": "ml", "category": "milk" },
      { "name": "Simple Syrup", "amount": 1, "unit": "pump", "category": "syrup" },
      { "name": "Ice Cubes", "amount": 100, "unit": "g" }
    ],
    "instructions": [
      "Whisk 4g matcha powder with 30ml warm water until smooth and frothy.",
      "Fill tall glass with ice cubes, simple syrup, and 150ml oat milk.",
      "Pour whisked matcha over oat milk.",
      "Float 1 freshly brewed espresso shot on top."
    ]
  }
]`;

export const DrinkSmartImportModal = ({
    isOpen,
    onClose,
    defaultBaseType = 'coffee',
    onImportToEdit,
    onSaveDirect
}: DrinkSmartImportModalProps) => {
    const [activeTab, setActiveTab] = useState<'ai' | 'offline'>('ai');
    const [rawInput, setRawInput] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [parseError, setParseError] = useState('');
    const [parsedDrinks, setParsedDrinks] = useState<ImportableDrink[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isSavingDirect, setIsSavingDirect] = useState(false);

    // Offline mode overrides
    const [offlineBaseType, setOfflineBaseType] = useState<DrinkBaseType>(defaultBaseType);
    const [offlineCategory, setOfflineCategory] = useState<DrinkCategory>('Cold');

    if (!isOpen) return null;

    const resetState = () => {
        setRawInput('');
        setParseError('');
        setParsedDrinks([]);
        setSelectedIndex(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(DRINK_PROMPT_TEMPLATE);
            setCopiedPrompt(true);
            setTimeout(() => setCopiedPrompt(false), 2000);
        } catch {
            // Fallback
        }
    };

    const parseDrinkItem = (item: Record<string, unknown>, fallbackBaseType: DrinkBaseType): ImportableDrink => {
        const name = String(item.name || 'Imported Drink').trim();
        const baseTypeStr = String(item.base_type || '').toLowerCase();
        const baseType: DrinkBaseType =
            baseTypeStr === 'coffee' || baseTypeStr === 'non_coffee' ? baseTypeStr : fallbackBaseType;

        const categoryStr = String(item.category || '').toLowerCase();
        const category: DrinkCategory = categoryStr === 'hot' ? 'Hot' : 'Cold';

        const ingredients = Array.isArray(item.ingredients)
            ? (item.ingredients as (string | DrinkIngredient)[])
            : [];
        const instructions = Array.isArray(item.instructions)
            ? item.instructions.map(String)
            : typeof item.instructions === 'string'
              ? [item.instructions]
              : [];

        return {
            id: crypto.randomUUID(),
            name,
            base_type: baseType,
            category,
            ingredients_json: JSON.stringify(ingredients),
            instructions_json: JSON.stringify(instructions),
            ingredientsList: ingredients,
            instructionsList: instructions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    };

    const parseOfflineRawText = (text: string): ImportableDrink[] => {
        const lines = text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
        if (lines.length === 0) return [];

        const title = lines[0].replace(/^#+\s*/, '').replace(/^(resep|recipe|cara membuat)\s*/i, '').slice(0, 40);
        const lower = text.toLowerCase();

        // Detect base_type
        let detectedBase: DrinkBaseType = offlineBaseType;
        if (/espresso|kopi|coffee|cold brew|ristretto|lungo/i.test(lower)) {
            detectedBase = 'coffee';
        } else if (/matcha|cokelat|chocolate|tea|teh|taro|susu|milk/i.test(lower)) {
            detectedBase = 'non_coffee';
        }

        // Detect category
        let detectedCat: DrinkCategory = offlineCategory;
        if (/ice|iced|dingin|es|cold|frappe|blended/i.test(lower)) {
            detectedCat = 'Cold';
        } else if (/hot|hangat|panas/i.test(lower)) {
            detectedCat = 'Hot';
        }

        const ingredients: string[] = [];
        const instructions: string[] = [];

        let currentSection: 'ingredients' | 'instructions' | 'none' = 'none';

        for (const line of lines.slice(1)) {
            if (/^(bahan|ingredients|bahan-bahan)/i.test(line)) {
                currentSection = 'ingredients';
                continue;
            }
            if (/^(instruksi|instructions|cara membuat|langkah|steps|method)/i.test(line)) {
                currentSection = 'instructions';
                continue;
            }

            const cleanLine = line.replace(/^[-*•\d+.]\s*/, '').trim();
            if (!cleanLine) continue;

            if (currentSection === 'ingredients') {
                ingredients.push(cleanLine);
            } else if (currentSection === 'instructions') {
                instructions.push(cleanLine);
            } else {
                // Heuristic: line with quantities looks like ingredient
                if (/\d+\s*(?:g|ml|shot|pump|tbsp|tsp|sendok|oz|cube)/i.test(cleanLine)) {
                    ingredients.push(cleanLine);
                } else {
                    instructions.push(cleanLine);
                }
            }
        }

        return [
            {
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
            }
        ];
    };

    const handleExtract = () => {
        setParseError('');
        if (!rawInput.trim()) {
            setParseError('Please paste some text or JSON first.');
            return;
        }

        // 1. Try JSON extraction
        try {
            const jsonMatch = rawInput.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const valid = parsed.map((item) => parseDrinkItem(item, defaultBaseType));
                    setParsedDrinks(valid);
                    setSelectedIndex(0);
                    return;
                } else if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.drinks) && parsed.drinks.length > 0) {
                        const valid = parsed.drinks.map((item: Record<string, unknown>) =>
                            parseDrinkItem(item, defaultBaseType)
                        );
                        setParsedDrinks(valid);
                        setSelectedIndex(0);
                        return;
                    }
                    const single = parseDrinkItem(parsed as Record<string, unknown>, defaultBaseType);
                    setParsedDrinks([single]);
                    setSelectedIndex(0);
                    return;
                }
            }
        } catch {
            // Continue to fallback
        }

        // 2. Fallback to offline rule-based parser
        const offlineResults = parseOfflineRawText(rawInput);
        if (offlineResults.length > 0) {
            setParsedDrinks(offlineResults);
            setSelectedIndex(0);
        } else {
            setParseError('Could not recognize drink recipe structure. Please check input or use AI prompt.');
        }
    };

    const activePreview = selectedIndex !== null ? parsedDrinks[selectedIndex] : null;

    const handleEditAndSave = () => {
        if (!activePreview) return;
        onImportToEdit(activePreview);
        handleClose();
    };

    const handleSaveDirectAction = async () => {
        if (!activePreview || !onSaveDirect || selectedIndex === null) return;
        setIsSavingDirect(true);
        try {
            await onSaveDirect(activePreview);
            const updated = [...parsedDrinks];
            updated[selectedIndex] = { ...activePreview, _saved: true };
            setParsedDrinks(updated);

            if (parsedDrinks.length === 1) {
                handleClose();
            } else {
                const nextUnsaved = updated.findIndex((d, idx) => !d._saved && idx !== selectedIndex);
                if (nextUnsaved !== -1) {
                    setSelectedIndex(nextUnsaved);
                } else {
                    handleClose();
                }
            }
        } catch {
            setParseError('Failed to save drink directly. Please try editing instead.');
        } finally {
            setIsSavingDirect(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-md-surface rounded-3xl border border-md-outline-variant/30 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-md-on-surface">
                {/* Header */}
                <div className="p-5 pb-4 bg-gradient-to-r from-amber-900 to-amber-700 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-amber-200">
                            <Icon name="auto_awesome" className="text-[22px]" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold leading-tight">Smart Import Drink</h2>
                            <p className="text-xs text-amber-100/80">From AI, blogs, or social media recipes</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <Icon name="close" className="text-[18px]" />
                    </button>
                </div>

                {/* Tabs */}
                {!activePreview && (
                    <div className="flex border-b border-md-outline-variant/30 px-5 pt-3 gap-6 shrink-0 bg-md-surface-container-low">
                        <button
                            onClick={() => {
                                setActiveTab('ai');
                                setParseError('');
                            }}
                            className={`pb-3 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors relative ${
                                activeTab === 'ai' ? 'text-md-primary' : 'text-md-on-surface-variant'
                            }`}
                        >
                            <Icon name="smart_toy" className="text-[16px]" />
                            <span>AI Prompt Assist</span>
                            {activeTab === 'ai' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-md-primary rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('offline');
                                setParseError('');
                            }}
                            className={`pb-3 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors relative ${
                                activeTab === 'offline' ? 'text-md-primary' : 'text-md-on-surface-variant'
                            }`}
                        >
                            <Icon name="bolt" className="text-[16px]" />
                            <span>Quick Parse (Offline)</span>
                            {activeTab === 'offline' && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-md-primary rounded-full" />
                            )}
                        </button>
                    </div>
                )}

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {parseError && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                            <Icon name="error" className="text-[18px] text-red-500 shrink-0 mt-0.5" />
                            <span>{parseError}</span>
                        </div>
                    )}

                    {activePreview ? (
                        /* Extracted Preview View */
                        <div className="space-y-4">
                            <div className="p-3.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center text-green-700 dark:text-green-300 shrink-0">
                                    <Icon name="check_circle" className="text-[20px]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-green-800 dark:text-green-200">
                                        Drink recipe extracted!
                                    </p>
                                    <p className="text-[11px] text-green-700 dark:text-green-400">
                                        Review below, then save directly or customize in editor.
                                    </p>
                                </div>
                                {parsedDrinks.length > 1 && selectedIndex !== null && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                                            disabled={selectedIndex === 0}
                                            className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-800 disabled:opacity-40"
                                        >
                                            <Icon name="chevron_left" className="text-[16px]" />
                                        </button>
                                        <span className="text-[11px] font-bold text-green-800 px-1">
                                            {selectedIndex + 1}/{parsedDrinks.length}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setSelectedIndex(Math.min(parsedDrinks.length - 1, selectedIndex + 1))
                                            }
                                            disabled={selectedIndex === parsedDrinks.length - 1}
                                            className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-800 disabled:opacity-40"
                                        >
                                            <Icon name="chevron_right" className="text-[16px]" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Details Card */}
                            <div className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl p-4 space-y-3.5">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant">
                                        Drink Name
                                    </span>
                                    <h3 className="text-base font-bold text-md-on-surface mt-0.5">
                                        {activePreview.name}
                                    </h3>
                                </div>

                                <div className="flex gap-2">
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                                            activePreview.base_type === 'coffee'
                                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                                                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                                        }`}
                                    >
                                        <Icon
                                            name={activePreview.base_type === 'coffee' ? 'coffee' : 'eco'}
                                            className="text-[14px]"
                                        />
                                        {activePreview.base_type === 'coffee' ? '☕ Coffee Base' : '🍵 Non-Coffee'}
                                    </span>
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                                            activePreview.category === 'Hot'
                                                ? 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200'
                                                : 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200'
                                        }`}
                                    >
                                        <Icon
                                            name={activePreview.category === 'Hot' ? 'local_fire_department' : 'ac_unit'}
                                            className="text-[14px]"
                                        />
                                        {activePreview.category}
                                    </span>
                                </div>

                                {/* Ingredients List */}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant block mb-1.5">
                                        Ingredients ({(activePreview.ingredientsList || []).length})
                                    </span>
                                    <div className="space-y-1 bg-md-surface-container-high/60 rounded-xl p-3 border border-md-outline-variant/20">
                                        {(activePreview.ingredientsList || []).map((ing, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <span className="w-1.5 h-1.5 rounded-full bg-md-primary shrink-0" />
                                                <span className="text-md-on-surface">
                                                    {typeof ing === 'string'
                                                        ? ing
                                                        : `${ing.amount ? `${ing.amount} ` : ''}${ing.unit ? `${ing.unit} ` : ''}${ing.name}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Instructions List */}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant block mb-1.5">
                                        Instructions ({(activePreview.instructionsList || []).length})
                                    </span>
                                    <div className="space-y-1.5 bg-md-surface-container-high/60 rounded-xl p-3 border border-md-outline-variant/20">
                                        {(activePreview.instructionsList || []).map((step, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
                                                <span className="font-bold text-md-primary shrink-0 min-w-[16px]">
                                                    {idx + 1}.
                                                </span>
                                                <span className="text-md-on-surface">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'ai' ? (
                        /* AI Prompt Assist Tab */
                        <div className="space-y-4">
                            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon name="lightbulb" className="text-[18px] text-amber-600" />
                                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                            1. Copy AI Prompt Template
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleCopyPrompt}
                                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <Icon name={copiedPrompt ? 'check' : 'content_copy'} className="text-[13px]" />
                                        <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
                                    </button>
                                </div>
                                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-normal">
                                    Paste this prompt into ChatGPT, Claude, or Gemini along with your recipe notes or
                                    link. Then paste the generated JSON result below.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="ai-json-input"
                                        className="text-xs font-bold text-md-on-surface flex items-center gap-1.5"
                                    >
                                        <span>2. Paste JSON Result</span>
                                    </label>
                                    <button
                                        onClick={() => setRawInput(SAMPLE_DRINK_JSON)}
                                        className="text-[11px] font-bold text-md-primary hover:underline cursor-pointer"
                                    >
                                        Try Sample
                                    </button>
                                </div>
                                <textarea
                                    id="ai-json-input"
                                    rows={8}
                                    value={rawInput}
                                    onChange={(e) => setRawInput(e.target.value)}
                                    placeholder='Paste JSON array here, e.g. [{"name": "Iced Matcha Latte", ...}]'
                                    className="w-full rounded-2xl border border-md-outline-variant/40 bg-md-surface-container-high p-3.5 text-xs text-md-on-surface placeholder:text-md-on-surface-variant/50 focus:ring-2 focus:ring-md-primary font-mono outline-none resize-none"
                                />
                            </div>
                        </div>
                    ) : (
                        /* Quick Parse (Offline) Tab */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        htmlFor="offline-base-type"
                                        className="text-[11px] font-bold text-md-on-surface-variant block mb-1"
                                    >
                                        Base Type
                                    </label>
                                    <select
                                        id="offline-base-type"
                                        value={offlineBaseType}
                                        onChange={(e) => setOfflineBaseType(e.target.value as DrinkBaseType)}
                                        className="w-full rounded-xl border border-md-outline-variant/40 bg-md-surface-container-high px-3 py-2 text-xs text-md-on-surface outline-none"
                                    >
                                        <option value="coffee">☕ Coffee Base</option>
                                        <option value="non_coffee">🍵 Non-Coffee</option>
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="offline-category"
                                        className="text-[11px] font-bold text-md-on-surface-variant block mb-1"
                                    >
                                        Category
                                    </label>
                                    <select
                                        id="offline-category"
                                        value={offlineCategory}
                                        onChange={(e) => setOfflineCategory(e.target.value as DrinkCategory)}
                                        className="w-full rounded-xl border border-md-outline-variant/40 bg-md-surface-container-high px-3 py-2 text-xs text-md-on-surface outline-none"
                                    >
                                        <option value="Cold">Cold</option>
                                        <option value="Hot">Hot</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="offline-text-input"
                                    className="text-xs font-bold text-md-on-surface block"
                                >
                                    Paste Recipe Text
                                </label>
                                <textarea
                                    id="offline-text-input"
                                    rows={8}
                                    value={rawInput}
                                    onChange={(e) => setRawInput(e.target.value)}
                                    placeholder={`Iced Caramel Macchiato\n\nBahan:\n- 2 shot espresso\n- 180ml fresh milk\n- 2 pump caramel syrup\n- Es batu secukupnya\n\nCara membuat:\n1. Masukkan es batu dan susu ke dalam gelas\n2. Tambahkan sirup karamel\n3. Tuang espresso di atas susu`}
                                    className="w-full rounded-2xl border border-md-outline-variant/40 bg-md-surface-container-high p-3.5 text-xs text-md-on-surface placeholder:text-md-on-surface-variant/50 focus:ring-2 focus:ring-md-primary outline-none resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-md-outline-variant/30 bg-md-surface-container-low flex items-center justify-between gap-3 shrink-0">
                    {activePreview ? (
                        <>
                            <button
                                onClick={() => setSelectedIndex(null)}
                                className="px-4 py-2.5 rounded-xl border border-md-outline-variant text-xs font-bold text-md-on-surface hover:bg-md-surface-container-high transition-colors cursor-pointer"
                            >
                                Back
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleEditAndSave}
                                    className="px-4 py-2.5 rounded-xl border border-md-primary text-xs font-bold text-md-primary hover:bg-md-primary/10 transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    <Icon name="edit" className="text-[16px]" />
                                    <span>Customize in Editor</span>
                                </button>
                                {onSaveDirect && (
                                    <button
                                        onClick={handleSaveDirectAction}
                                        disabled={isSavingDirect}
                                        className="px-4 py-2.5 rounded-xl bg-md-primary hover:bg-md-primary/90 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <Icon name="save" className="text-[16px]" />
                                        <span>{isSavingDirect ? 'Saving...' : 'Save Directly'}</span>
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleClose}
                                className="px-4 py-2.5 rounded-xl border border-md-outline-variant text-xs font-bold text-md-on-surface hover:bg-md-surface-container-high transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExtract}
                                className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Icon name="auto_awesome" className="text-[16px]" />
                                <span>Extract & Preview</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
