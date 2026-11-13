import { useState, useEffect } from 'react';
import { Icon, SplashLogoIcon } from './Icons';
import { useBackHandler } from '../shared/utils/backNavigation';
import type { Recipe, BrewStep } from '../shared/domain/entities';

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

const SYSTEM_PROMPT_TEMPLATE = `Please extract all coffee manual brewing recipes from this text, article, or YouTube link into JSON format strictly as shown below (do not include any explanation or extra text outside JSON).

YOUTUBE VIDEO EXTRACTION INSTRUCTIONS:
- If the source is a YouTube link (e.g. youtu.be or youtube.com/watch):
  1. Access the video transcript, description, or watch the video directly.
  2. Extract the exact brew recipe demonstrated (brewer, coffee dose in grams, total water, grind size, water temperature, and each timed pour step).
  3. If multiple recipes or techniques are demonstrated in the video, extract each as a separate recipe object in the JSON array.

PARAMETER GUIDELINES (STRICT RULES):
Use these exact JSON field names — never rename them. The step text field is "instruction", never "value", "text" or "description".
1. "name": Short, natural recipe title WITHOUT the brewing device or method name (it is stored separately) and without the word "Recipe". e.g. "Immersion Ice Drip", "Tetsu Kasuya 4:6", "James Hoffmann Ultimate".
2. "method_id": Must be ONE of the following exact IDs based on the brewing device:
${METHOD_ID_LINES}
3. "ratio": Format ratio as "1:X" (e.g., "1:15", "1:16.7", "1:14"). If not stated, calculate total_water / coffee_dose.
4. "temperature": Water temperature in Celsius as an integer (e.g., 93, 95, 90). Default to 93 if unspecified.
5. "grind_size": Must be ONE of: "Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse".
6. "difficulty": Must be ONE of: "Beginner", "Intermediate", "Advanced". Default to "Intermediate" if unspecified.
7. "style": Short descriptor of the cup or technique as two parts separated by " / " (e.g. "Balanced / Clean", "Iced / Flash Chilled", "Sweet / Full-bodied").
8. "total_water": Total water volume in grams/ml as an integer (e.g., 225, 250, 500).
9. "description_short": Concise 1-sentence summary of flavor profile or brewing style.
10. "steps": Sequential array of brewing steps:
   - "label": Short step title (e.g., "Bloom", "First Main Pour", "Drawdown").
   - "duration_seconds": REQUIRED positive integer for EVERY step (e.g. 30, 45, 60).
   - "target_weight": Cumulative scale weight in grams (e.g. 50, 150, 250).
   - "instruction": Detailed step instruction preserved from the source text.

REQUIRED JSON OUTPUT FORMAT:
\`\`\`json
[
  {
    "name": "James Hoffmann Ultimate",
    "method_id": "v60",
    "ratio": "1:16.7",
    "temperature": 95,
    "grind_size": "Medium-Fine",
    "difficulty": "Intermediate",
    "style": "Balanced / Sweet",
    "total_water": 250,
    "description_short": "Two-phase pour technique for high sweetness & clarity.",
    "steps": [
      {
        "label": "Bloom & Swirl",
        "duration_seconds": 45,
        "target_weight": 50,
        "instruction": "Pour 50g water in 10s and swirl gently. Wait until 0:45."
      },
      {
        "label": "First Pour (to 60%)",
        "duration_seconds": 30,
        "target_weight": 150,
        "instruction": "Pour up to 150g by 1:15 in gentle spirals."
      },
      {
        "label": "Second Pour (to 100%)",
        "duration_seconds": 30,
        "target_weight": 250,
        "instruction": "Pour up to 250g by 1:45. Stir once clockwise and once anticlockwise."
      },
      {
        "label": "Drawdown",
        "duration_seconds": 45,
        "instruction": "Give one gentle swirl and allow coffee to drain completely."
      }
    ]
  }
]
\`\`\`
`;

const SAMPLE_BREW_JSON = JSON.stringify([
    {
        name: "James Hoffmann Ultimate",
        method_id: "v60",
        ratio: "1:16.7",
        temperature: 95,
        grind_size: "Medium-Fine",
        difficulty: "Intermediate",
        style: "Balanced / Sweet",
        total_water: 250,
        description_short: "Teknik tuang dua fase untuk rasa manis dan ekstraksi merata.",
        steps: [
            {
                label: "Bloom & Swirl",
                duration_seconds: 45,
                target_weight: 50,
                instruction: "Tuang 50g air dalam 10 detik lalu swirl lembut. Tunggu hingga detik 45."
            },
            {
                label: "First Pour (to 60%)",
                duration_seconds: 30,
                target_weight: 150,
                instruction: "Tuang melingkar hingga timbangan menunjukkan 150g di menit 1:15."
            },
            {
                label: "Second Pour (to 100%)",
                duration_seconds: 30,
                target_weight: 250,
                instruction: "Tuang perlahan hingga total 250g. Aduk 1 putaran searah jarum jam dan berlawanan."
            },
            {
                label: "Drawdown",
                duration_seconds: 45,
                instruction: "Beri sedikit swirl terakhir dan biarkan air turun tuntas."
            }
        ]
    }
], null, 2);

const extractUrl = (text: string): string => (text.match(/https?:\/\/\S+/) || [])[0] || '';

const parseRawItemToRecipe = (parsed: Record<string, unknown>, fallbackMethodId: string): Partial<Recipe> => {
    let jsonDiff: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
    if (/beginner|easy/i.test(String(parsed.difficulty))) jsonDiff = 'Beginner';
    else if (/advanced|expert|hard/i.test(String(parsed.difficulty))) jsonDiff = 'Advanced';
    else if (/intermediate|medium/i.test(String(parsed.difficulty))) jsonDiff = 'Intermediate';

    const methodId = METHOD_LABELS[String(parsed.method_id)] ? String(parsed.method_id) : fallbackMethodId;
    const stepsRaw = Array.isArray(parsed.steps) ? parsed.steps : [];

    return {
        name: cleanRecipeName(String(parsed.name || 'Imported Coffee Recipe'), methodId),
        method_id: methodId,
        ratio: String(parsed.ratio || '1:15'),
        temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 93,
        grind_size: String(parsed.grind_size || 'Medium'),
        difficulty: jsonDiff,
        style: String(parsed.style || 'Balanced / Sweet'),
        total_water: typeof parsed.total_water === 'number' ? parsed.total_water : 250,
        description_short: String(parsed.description_short || 'Resep diimpor dari AI'),
        steps: stepsRaw.map((s: Record<string, unknown>, idx: number) => ({
            id: crypto.randomUUID(),
            recipe_id: '',
            step_order: idx + 1,
            label: String(s.label || `Langkah ${idx + 1}`),
            duration_seconds: typeof s.duration_seconds === 'number' ? Math.max(1, s.duration_seconds) : 30,
            target_weight: typeof s.target_weight === 'number' ? s.target_weight : undefined,
            instruction: String(s.instruction || s.value || s.text || ''),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }))
    };
};

export const SmartImportModal = ({
    isOpen,
    onClose,
    onImport,
    onSaveDirect,
    initialParsedRecipes,
    defaultMethodId = 'v60'
}: SmartImportModalProps) => {
    // Steps: 1: Link -> 2: Prompt -> 3: Jawaban -> 4: Cek Resep
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [videoUrl, setVideoUrl] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [parsedRecipes, setParsedRecipes] = useState<ImportableRecipe[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [parseError, setParseError] = useState('');
    const [isSavingDirect, setIsSavingDirect] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        if (isOpen && initialParsedRecipes && initialParsedRecipes.length > 0) {
            setParsedRecipes(initialParsedRecipes);
            setSelectedIndex(0);
            setStep(4);
        }
    }, [isOpen, initialParsedRecipes]);

    const reset = () => {
        setStep(1);
        setVideoUrl('');
        setCopiedPrompt(false);
        setAiResponse('');
        setParsedRecipes([]);
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
        return `${SYSTEM_PROMPT_TEMPLATE}\n\nSOURCE TO EXTRACT FROM:\n${source}`;
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
        setAiResponse(SAMPLE_BREW_JSON);
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
                        .map((item) => parseRawItemToRecipe(item as Record<string, unknown>, defaultMethodId));
                    if (valid.length > 0) {
                        setParsedRecipes(valid);
                        setSelectedIndex(0);
                        setStep(4);
                        return;
                    }
                } else if (parsed && typeof parsed === 'object') {
                    const single = parseRawItemToRecipe(parsed as Record<string, unknown>, defaultMethodId);
                    setParsedRecipes([single]);
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

    const activeRecipe = parsedRecipes[selectedIndex] || parsedRecipes[0];
    const methodLabel = (id?: string) => METHOD_LABELS[id || ''] || (id || 'Unknown').toUpperCase();

    const handleSaveDirect = async () => {
        if (!activeRecipe || !onSaveDirect) return;
        setIsSavingDirect(true);
        setParseError('');
        try {
            await onSaveDirect(activeRecipe);
            const updated = [...parsedRecipes];
            updated[selectedIndex] = { ...activeRecipe, _saved: true };
            setParsedRecipes(updated);
            setJustSaved(true);
            setTimeout(() => {
                if (parsedRecipes.length <= 1) {
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
        if (!activeRecipe) return;
        onImport(activeRecipe, parsedRecipes);
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
                                <h1 className="text-base font-bold leading-tight">Import Resep Seduh</h1>
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
                                        if (s.num < step || (s.num === 4 && parsedRecipes.length > 0)) {
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
                                            setVideoUrl('https://youtu.be/1oB1oDrDkQo');
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
                    {step === 4 && activeRecipe && (
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
                            {parsedRecipes.length > 1 && (
                                <div className="flex items-center justify-between bg-md-surface-container-low p-2 rounded-2xl border border-md-outline-variant/20">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedIndex((prev) => (prev - 1 + parsedRecipes.length) % parsedRecipes.length)}
                                        className="w-7 h-7 rounded-full bg-md-surface flex items-center justify-center text-md-on-surface cursor-pointer"
                                    >
                                        <Icon name="chevron_left" className="text-base" />
                                    </button>
                                    <span className="text-xs font-bold text-md-on-surface">
                                        Resep {selectedIndex + 1} dari {parsedRecipes.length}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedIndex((prev) => (prev + 1) % parsedRecipes.length)}
                                        className="w-7 h-7 rounded-full bg-md-surface flex items-center justify-center text-md-on-surface cursor-pointer"
                                    >
                                        <Icon name="chevron_right" className="text-base" />
                                    </button>
                                </div>
                            )}

                            {/* Recipe Preview Card */}
                            <div className="bg-md-surface-container-low border border-md-outline-variant/30 rounded-2xl overflow-hidden divide-y divide-md-outline-variant/20">
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant">Nama Resep</span>
                                            <h3 className="text-base font-bold text-md-on-surface mt-0.5">{activeRecipe.name}</h3>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wide shrink-0">
                                            {methodLabel(activeRecipe.method_id)}
                                        </span>
                                    </div>
                                    {activeRecipe.description_short && (
                                        <p className="text-xs text-md-on-surface-variant mt-2 leading-relaxed">
                                            {activeRecipe.description_short}
                                        </p>
                                    )}
                                </div>

                                {/* Parameters Grid */}
                                <div className="p-4 grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-0.5">Rasio</p>
                                        <p className="text-xs font-bold text-md-on-surface">{activeRecipe.ratio || '1:15'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-0.5">Total Air</p>
                                        <p className="text-xs font-bold text-md-on-surface">{activeRecipe.total_water ? `${activeRecipe.total_water}g` : '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-0.5">Suhu</p>
                                        <p className="text-xs font-bold text-md-on-surface">{activeRecipe.temperature ? `${activeRecipe.temperature}°C` : '93°C'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-0.5">Gilingan</p>
                                        <p className="text-xs font-bold text-md-on-surface">{activeRecipe.grind_size || 'Medium'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-0.5">Kesulitan</p>
                                        <p className="text-xs font-bold text-md-on-surface">{activeRecipe.difficulty || 'Intermediate'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-md-on-surface-variant uppercase tracking-wider mb-0.5">Langkah</p>
                                        <p className="text-xs font-bold text-primary">{(activeRecipe.steps || []).length} Step</p>
                                    </div>
                                </div>

                                {/* Steps */}
                                <div className="p-4 space-y-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-md-on-surface-variant">
                                        Langkah Seduh ({(activeRecipe.steps || []).length})
                                    </p>
                                    <div className="space-y-2">
                                        {(activeRecipe.steps || []).map((stepItem: BrewStep, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2.5 text-xs text-md-on-surface bg-md-surface-container/40 p-2.5 rounded-xl border border-md-outline-variant/15">
                                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                                        <span className="font-bold text-md-on-surface truncate">{stepItem.label}</span>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-md-on-surface-variant shrink-0 font-medium">
                                                            {stepItem.target_weight && <span>{stepItem.target_weight}g</span>}
                                                            {stepItem.target_weight && <span>•</span>}
                                                            <span>{stepItem.duration_seconds}s</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-md-on-surface-variant leading-relaxed">
                                                        {stepItem.instruction}
                                                    </p>
                                                </div>
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
