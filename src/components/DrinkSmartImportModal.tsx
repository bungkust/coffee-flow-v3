import { useState, useEffect } from 'react';
import { Icon, SplashLogoIcon } from './Icons';
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
5. "instructions": Array of sequential step strings (e.g. ["Brew 2 shots of fresh espresso", "Fill a glass with ice cubes and 180ml oat milk", "Pour caramel syrup", "Gently drop espresso over milk"]).

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
      "Siapkan 2 shot espresso segar.",
      "Isi gelas saji dengan es batu hingga 3/4 penuh.",
      "Masukkan 2 pump sirup vanilla dan tuang 160ml susu oat.",
      "Tuang espresso perlahan di atas susu agar membentuk layer bertingkat.",
      "Beri topping saus karamel di atasnya dan sajikan segera."
    ]
  }
]
\`\`\`
`;

const SAMPLE_DRINK_JSON = JSON.stringify([
    {
        name: "Iced Caramel Oat Macchiato",
        base_type: "coffee",
        category: "cold",
        ingredients: [
            { name: "Espresso", amount: 2, unit: "shot", category: "beans" },
            { name: "Oat Milk", amount: 160, unit: "ml", category: "milk" },
            { name: "Vanilla Syrup", amount: 2, unit: "pump", category: "syrup" },
            { name: "Caramel Drizzle", amount: 10, unit: "g", category: "syrup" },
            { name: "Ice Cubes", amount: 120, unit: "g" }
        ],
        instructions: [
            "Siapkan 2 shot espresso segar.",
            "Isi gelas saji dengan es batu hingga 3/4 penuh.",
            "Masukkan 2 pump sirup vanilla dan tuang 160ml susu oat.",
            "Tuang espresso perlahan di atas susu agar membentuk layer bertingkat.",
            "Beri topping saus karamel di atasnya dan sajikan segera."
        ]
    }
], null, 2);

const extractUrl = (text: string): string => (text.match(/https?:\/\/\S+/) || [])[0] || '';

const formatIngredientToString = (ing: string | DrinkIngredient): string => {
    if (typeof ing === 'string') return ing.trim();
    if (!ing || typeof ing !== 'object') return '';
    const amt = ing.amount != null ? (['ml', 'g'].includes(ing.unit || '') ? `${ing.amount}${ing.unit}` : `${ing.amount} ${ing.unit || ''}`.trim()) : '';
    return `${amt} ${ing.name || ''}`.trim();
};

const parseDrinkItem = (item: Record<string, unknown>, fallbackBaseType: DrinkBaseType): ImportableDrink => {
    const rawName = String(item.name || 'Imported Drink').trim();
    const name = rawName.replace(/^(resep|recipe|cara membuat)\s*[-:]?\s*/i, '').trim() || 'Imported Drink';

    const baseTypeStr = String(item.base_type || '').toLowerCase();
    const baseType: DrinkBaseType =
        baseTypeStr === 'coffee' || baseTypeStr === 'non_coffee'
            ? baseTypeStr
            : /espresso|kopi|coffee|cold brew|latte|cappuccino|macchiato/i.test(name)
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

export const DrinkSmartImportModal = ({
    isOpen,
    onClose,
    defaultBaseType = 'coffee',
    onImportToEdit,
    onSaveDirect,
    initialParsedDrinks
}: DrinkSmartImportModalProps) => {
    // Steps: 1: Link -> 2: Prompt -> 3: Jawaban -> 4: Cek Resep
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [videoUrl, setVideoUrl] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [parsedDrinks, setParsedDrinks] = useState<ImportableDrink[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [parseError, setParseError] = useState('');
    const [isSavingDirect, setIsSavingDirect] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        if (isOpen && initialParsedDrinks && initialParsedDrinks.length > 0) {
            setParsedDrinks(initialParsedDrinks);
            setSelectedIndex(0);
            setStep(4);
        }
    }, [isOpen, initialParsedDrinks]);

    const reset = () => {
        setStep(1);
        setVideoUrl('');
        setCopiedPrompt(false);
        setAiResponse('');
        setParsedDrinks([]);
        setSelectedIndex(0);
        setParseError('');
        setIsSavingDirect(false);
        setJustSaved(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    useBackHandler(isOpen, handleClose);

    if (!isOpen) return null;

    const getPromptText = () => {
        const source = videoUrl.trim() || extractUrl(videoUrl) || '(Tempel link video YouTube)';
        return `${DRINK_PROMPT_TEMPLATE}\n\nSOURCE TO EXTRACT FROM:\n${source}`;
    };

    const handleGoToPrompt = () => {
        if (!videoUrl.trim()) {
            setParseError('Tempel link video YouTube terlebih dahulu.');
            return;
        }
        setParseError('');
        setStep(2);
    };

    const handleCopyPrompt = async () => {
        setParseError('');
        const fullPrompt = getPromptText();
        try {
            await navigator.clipboard.writeText(fullPrompt);
            setCopiedPrompt(true);
            setTimeout(() => setCopiedPrompt(false), 4000);
        } catch {
            setParseError('Gagal menyalin otomatis. Silakan salin teks secara manual.');
        }
    };

    const handlePasteFromClipboard = async () => {
        setParseError('');
        try {
            const clipText = await navigator.clipboard.readText();
            if (clipText) {
                setAiResponse(clipText);
            } else {
                setParseError('Clipboard kosong. Silakan salin jawaban AI terlebih dahulu.');
            }
        } catch {
            setParseError('Tidak bisa membaca clipboard otomatis. Silakan tempel manual.');
        }
    };

    const handleFillExample = () => {
        setAiResponse(SAMPLE_DRINK_JSON);
        setParseError('');
    };

    const handleParseResponse = () => {
        setParseError('');
        const source = aiResponse.trim();
        if (!source) {
            setParseError('Tempel jawaban AI terlebih dahulu.');
            return;
        }

        try {
            const jsonMatch = source.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const valid = parsed
                        .filter((item) => item && typeof item === 'object')
                        .map((item) => parseDrinkItem(item as Record<string, unknown>, defaultBaseType));
                    if (valid.length > 0) {
                        setParsedDrinks(valid);
                        setSelectedIndex(0);
                        setStep(4);
                        return;
                    }
                } else if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.drinks) && parsed.drinks.length > 0) {
                        const valid = parsed.drinks.map((item: Record<string, unknown>) =>
                            parseDrinkItem(item, defaultBaseType)
                        );
                        setParsedDrinks(valid);
                        setSelectedIndex(0);
                        setStep(4);
                        return;
                    }
                    const single = parseDrinkItem(parsed as Record<string, unknown>, defaultBaseType);
                    setParsedDrinks([single]);
                    setSelectedIndex(0);
                    setStep(4);
                    return;
                }
            }
        } catch {
            // Error handling below
        }

        setParseError('Format belum sesuai. Pastikan menyalin jawaban lengkap dari AI.');
    };

    const activeDrink = parsedDrinks[selectedIndex] || parsedDrinks[0];

    const handleSaveDirect = async () => {
        if (!activeDrink || !onSaveDirect) return;
        setIsSavingDirect(true);
        setParseError('');
        try {
            await onSaveDirect(activeDrink);
            const updated = [...parsedDrinks];
            updated[selectedIndex] = { ...activeDrink, _saved: true };
            setParsedDrinks(updated);
            setJustSaved(true);
            setTimeout(() => {
                if (parsedDrinks.length <= 1) {
                    handleClose();
                }
            }, 1200);
        } catch {
            setParseError('Gagal menyimpan resep. Silakan coba lagi.');
        } finally {
            setIsSavingDirect(false);
        }
    };

    const handleEditAndSave = () => {
        if (!activeDrink) return;
        onImportToEdit(activeDrink, parsedDrinks);
        reset();
    };

    const isYouTube = /youtube\.com|youtu\.be/i.test(videoUrl);

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-md-surface-container-high text-md-on-surface rounded-t-[32px] sm:rounded-3xl shadow-2xl border-t sm:border border-md-outline-variant/30 overflow-hidden flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="bg-primary text-white px-5 pt-3.5 pb-4 flex flex-col shrink-0">
                    <div className="w-10 h-1 rounded-full bg-white/40 mx-auto mb-3 sm:hidden" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                                    className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 text-white transition-colors cursor-pointer"
                                    title="Kembali ke langkah sebelumnya"
                                >
                                    <Icon name="arrow_back" className="text-[18px]" />
                                </button>
                            ) : (
                                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-white">
                                    <SplashLogoIcon className="w-5 h-5" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-base font-bold leading-tight">Import Resep Minuman</h1>
                                <p className="text-[11px] text-white/80 font-medium">Dari video YouTube</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                            title="Tutup"
                        >
                            <Icon name="close" className="text-[18px]" />
                        </button>
                    </div>

                    {/* Stepper Progress */}
                    <div className="flex items-center justify-between mt-4 px-1">
                        {[
                            { num: 1, label: 'Link' },
                            { num: 2, label: 'Prompt' },
                            { num: 3, label: 'Jawaban' },
                            { num: 4, label: 'Cek Resep' }
                        ].map((s, idx) => (
                            <div key={s.num} className="flex items-center flex-1 last:flex-none">
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Allow navigating back to completed steps
                                        if (s.num < step || (s.num === 4 && parsedDrinks.length > 0)) {
                                            setStep(s.num as 1 | 2 | 3 | 4);
                                        }
                                    }}
                                    className="flex flex-col items-center cursor-pointer focus:outline-none"
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                                        step === s.num
                                            ? 'bg-white text-primary ring-2 ring-white/40 shadow-xs scale-105'
                                            : step > s.num
                                                ? 'bg-white/90 text-primary'
                                                : 'bg-white/20 text-white/70'
                                    }`}>
                                        {step > s.num ? <Icon name="check" className="text-[14px]" /> : s.num}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-medium ${
                                        step === s.num ? 'text-white font-bold' : 'text-white/70'
                                    }`}>
                                        {s.label}
                                    </span>
                                </button>
                                {idx < 3 && (
                                    <div className={`flex-1 h-0.5 mx-2 mb-3.5 transition-colors ${
                                        step > s.num ? 'bg-white/80' : 'bg-white/20'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* ═════════ STEP 1: TEMPEL LINK VIDEO ═════════ */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-base font-bold text-md-on-surface">Tempel link video</h2>
                                <p className="text-xs text-md-on-surface-variant mt-0.5">Resep kopinya kita ambil dari video ini.</p>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <textarea
                                        value={videoUrl}
                                        onChange={(e) => {
                                            setVideoUrl(e.target.value);
                                            setParseError('');
                                        }}
                                        placeholder="https://youtube.com/watch?v=... atau https://youtu.be/..."
                                        rows={3}
                                        className="w-full bg-md-surface-container-low border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/40 rounded-2xl p-3.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none font-mono"
                                    />
                                    {isYouTube && (
                                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-bold">
                                            <Icon name="smart_display" className="text-[14px]" />
                                            <span>YouTube</span>
                                        </div>
                                    )}
                                </div>

                                {/* Symmetrical 2-column Helper Buttons */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                if (text) {
                                                    setVideoUrl(text);
                                                    setParseError('');
                                                }
                                            } catch {
                                                // ignore
                                            }
                                        }}
                                        className="py-2.5 px-3 rounded-xl bg-md-surface-container border border-md-outline-variant/30 text-xs font-semibold text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                    >
                                        <Icon name="content_paste" className="text-[15px] text-primary" />
                                        <span>Tempel link</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setVideoUrl('https://youtu.be/sample-drink-video');
                                            setParseError('');
                                        }}
                                        className="py-2.5 px-3 rounded-xl bg-md-surface-container border border-md-outline-variant/30 text-xs font-semibold text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                    >
                                        <Icon name="lightbulb" className="text-[15px] text-primary" />
                                        <span>Contoh link</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═════════ STEP 2: PROMPT SUDAH SIAP ═════════ */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-base font-bold text-md-on-surface">Prompt sudah siap</h2>
                                <p className="text-xs text-md-on-surface-variant mt-0.5 leading-relaxed">
                                    Salin prompt, tempel di Gemini, lalu kembali ke sini untuk menempel jawabannya.
                                </p>
                            </div>

                            {/* Copy Prompt Button */}
                            <button
                                type="button"
                                onClick={handleCopyPrompt}
                                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                                    copiedPrompt
                                        ? 'bg-primary/15 text-primary border border-primary/40'
                                        : 'bg-primary text-white hover:bg-primary-dark active:scale-[0.99]'
                                }`}
                            >
                                <Icon name={copiedPrompt ? 'check_circle' : 'content_copy'} className="text-base" />
                                <span>{copiedPrompt ? 'Prompt Berhasil Disalin!' : 'Salin Prompt AI'}</span>
                            </button>

                            {/* Symmetrical External AI Buttons */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <a
                                    href="https://gemini.google.com/app"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-3 px-3.5 rounded-2xl bg-md-surface-container border border-md-outline-variant/30 text-xs font-bold text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                >
                                    <Icon name="auto_awesome" className="text-base text-primary" />
                                    <span>Buka Gemini</span>
                                    <Icon name="open_in_new" className="text-[13px] text-md-on-surface-variant" />
                                </a>

                                <a
                                    href="https://chatgpt.com"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-3 px-3.5 rounded-2xl bg-md-surface-container border border-md-outline-variant/30 text-xs font-bold text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                >
                                    <Icon name="chat" className="text-base text-primary" />
                                    <span>Buka ChatGPT</span>
                                    <Icon name="open_in_new" className="text-[13px] text-md-on-surface-variant" />
                                </a>
                            </div>

                            {/* Informative Hint */}
                            <div className="bg-md-surface-container-low border border-md-outline-variant/25 rounded-2xl p-3 flex items-start gap-2.5">
                                <Icon name="info" className="text-primary text-[17px] shrink-0 mt-0.5" />
                                <p className="text-[11px] font-medium text-md-on-surface-variant leading-relaxed">
                                    Buka Gemini atau ChatGPT, tempel prompt yang sudah disalin, lalu salin kembali seluruh hasil jawabannya.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ═════════ STEP 3: TEMPEL JAWABAN AI ═════════ */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-base font-bold text-md-on-surface">Tempel jawaban AI</h2>
                                <p className="text-xs text-md-on-surface-variant mt-0.5 leading-relaxed">
                                    Salin seluruh jawaban dari ChatGPT atau Gemini, lalu tekan tombol di bawah.
                                </p>
                            </div>

                            {/* Symmetrical 2-column Action Buttons */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={handlePasteFromClipboard}
                                    className="py-2.5 px-3 rounded-xl bg-md-surface-container border border-md-outline-variant/30 text-xs font-semibold text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                >
                                    <Icon name="content_paste" className="text-base text-primary" />
                                    <span>Tempel Clipboard</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFillExample}
                                    className="py-2.5 px-3 rounded-xl bg-md-surface-container border border-md-outline-variant/30 text-xs font-semibold text-md-on-surface hover:bg-md-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                >
                                    <Icon name="science" className="text-base text-primary" />
                                    <span>Isi contoh</span>
                                </button>
                            </div>

                            {/* Response Textarea */}
                            <textarea
                                value={aiResponse}
                                onChange={(e) => {
                                    setAiResponse(e.target.value);
                                    setParseError('');
                                }}
                                placeholder='Tempel teks jawaban lengkap dari Gemini atau ChatGPT di sini...'
                                rows={7}
                                className="w-full bg-md-surface-container-low border border-md-outline-variant/30 text-md-on-surface placeholder:text-md-on-surface-variant/40 rounded-2xl p-3.5 text-xs font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            />
                        </div>
                    )}

                    {/* ═════════ STEP 4: CEK RESEPNYA ═════════ */}
                    {step === 4 && activeDrink && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-base font-bold text-md-on-surface">Cek resepnya</h2>
                                <p className="text-xs text-md-on-surface-variant mt-0.5">
                                    Hasil dari AI bisa keliru. Periksa dulu sebelum disimpan.
                                </p>
                            </div>

                            {/* Success Alert */}
                            {justSaved && (
                                <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3.5 flex items-center gap-2.5 animate-in fade-in">
                                    <Icon name="check_circle" className="text-primary text-lg shrink-0" />
                                    <p className="text-xs font-bold text-primary">Resep tersimpan.</p>
                                </div>
                            )}

                            {/* Multiple recipes switcher */}
                            {parsedDrinks.length > 1 && (
                                <div className="flex items-center justify-between bg-md-surface-container-low p-2 rounded-2xl border border-md-outline-variant/20">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedIndex((prev) => (prev - 1 + parsedDrinks.length) % parsedDrinks.length)}
                                        className="w-7 h-7 rounded-full bg-md-surface flex items-center justify-center text-md-on-surface cursor-pointer"
                                    >
                                        <Icon name="chevron_left" className="text-base" />
                                    </button>
                                    <span className="text-xs font-bold text-md-on-surface">
                                        Resep {selectedIndex + 1} dari {parsedDrinks.length}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedIndex((prev) => (prev + 1) % parsedDrinks.length)}
                                        className="w-7 h-7 rounded-full bg-md-surface flex items-center justify-center text-md-on-surface cursor-pointer"
                                    >
                                        <Icon name="chevron_right" className="text-base" />
                                    </button>
                                </div>
                            )}

                            {/* Drink Preview Card */}
                            <div className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl overflow-hidden divide-y divide-md-outline-variant/20">
                                <div className="p-4">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant">Nama Minuman</span>
                                    <h3 className="text-base font-bold text-md-on-surface mt-0.5">{activeDrink.name}</h3>

                                    <div className="flex items-center gap-2 mt-2.5">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                            activeDrink.base_type === 'non_coffee'
                                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                                                : 'bg-primary/10 text-primary'
                                        }`}>
                                            <Icon name={activeDrink.base_type === 'non_coffee' ? 'eco' : 'coffee'} className="text-[13px]" />
                                            <span>{activeDrink.base_type === 'non_coffee' ? 'Non-Kopi' : 'Kopi'}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-md-surface-container text-md-on-surface-variant border border-md-outline-variant/30">
                                            <Icon name={activeDrink.category === 'hot' ? 'local_fire_department' : 'ac_unit'} className="text-[13px]" />
                                            <span>{activeDrink.category === 'hot' ? 'Panas' : 'Dingin'}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Ingredients */}
                                <div className="p-4 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant">
                                        Bahan-Bahan ({(activeDrink.ingredientsList || []).length})
                                    </p>
                                    <div className="space-y-1.5">
                                        {(activeDrink.ingredientsList || []).map((ing, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs text-md-on-surface">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                                <span>{formatIngredientToString(ing)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="p-4 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant">
                                        Langkah Pembuatan ({(activeDrink.instructionsList || []).length})
                                    </p>
                                    <div className="space-y-2">
                                        {(activeDrink.instructionsList || []).map((stepItem, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-xs text-md-on-surface">
                                                <span className="font-bold text-primary shrink-0 min-w-[16px]">{idx + 1}.</span>
                                                <span className="leading-relaxed">{stepItem}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Notice */}
                    {parseError && (
                        <div className="mt-3 bg-md-error-container/40 border border-md-error/30 rounded-xl px-3 py-2 flex items-center gap-2">
                            <Icon name="error_outline" className="text-[16px] text-md-error shrink-0" />
                            <p className="text-[11px] font-semibold text-md-on-error-container">{parseError}</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls — Completely Symmetrical 2-Column Grid */}
                <div className="p-4 pb-[max(env(safe-area-inset-bottom),1rem)] border-t border-md-outline-variant/20 bg-md-surface-container flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {step === 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="w-full py-3 rounded-2xl bg-md-surface-container-highest hover:bg-md-surface-container-highest/80 text-md-on-surface border border-md-outline-variant/30 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGoToPrompt}
                                    disabled={!videoUrl.trim()}
                                    className="w-full py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer text-center active:scale-95"
                                >
                                    <span>Lanjut</span>
                                    <Icon name="arrow_forward" className="text-base" />
                                </button>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full py-3 rounded-2xl bg-md-surface-container-highest hover:bg-md-surface-container-highest/80 text-md-on-surface border border-md-outline-variant/30 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <Icon name="arrow_back" className="text-base" />
                                    <span>Kembali</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="w-full py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                >
                                    <span>Tempel Jawaban</span>
                                    <Icon name="arrow_forward" className="text-base" />
                                </button>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="w-full py-3 rounded-2xl bg-md-surface-container-highest hover:bg-md-surface-container-highest/80 text-md-on-surface border border-md-outline-variant/30 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <Icon name="arrow_back" className="text-base" />
                                    <span>Kembali</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleParseResponse}
                                    disabled={!aiResponse.trim()}
                                    className="w-full py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                >
                                    <span>Cek Resep</span>
                                    <Icon name="arrow_forward" className="text-base" />
                                </button>
                            </>
                        )}

                        {step === 4 && (
                            <>
                                {justSaved ? (
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="col-span-2 w-full py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                    >
                                        <Icon name="check" className="text-base" />
                                        <span>Resep tersimpan. Selesai</span>
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleEditAndSave}
                                            className="w-full py-3 rounded-2xl bg-md-surface-container-highest hover:bg-md-surface-container-highest/80 text-md-on-surface border border-md-outline-variant/30 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Icon name="edit" className="text-base text-primary" />
                                            <span>Edit Resep</span>
                                        </button>
                                        {onSaveDirect && (
                                            <button
                                                type="button"
                                                onClick={handleSaveDirect}
                                                disabled={isSavingDirect}
                                                className="w-full py-3 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                                            >
                                                {isSavingDirect ? (
                                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Icon name="bookmark_added" className="text-base" />
                                                )}
                                                <span>Simpan</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
