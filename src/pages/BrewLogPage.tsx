import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { useBrewStore } from '../state/useBrewStore';
import { brewService } from '../core/services';

const PRESET_TAGS = ['Fruity', 'Nutty', 'Chocolatey', 'Floral', 'Spicy'];

export const BrewLogPage = () => {
    const navigate = useNavigate();
    const { activeRecipe, selectedBeanId, selectedFilterId, coffeeConsumed, stopBrew, hydrateBrew } = useBrewStore();

    const [rating, setRating] = useState(4);
    const [notes, setNotes] = useState('');
    const [profile, setProfile] = useState({
        sweetness: 75,
        acidity: 50,
        body: 30,
        bitterness: 20
    });
    const [selectedTags, setSelectedTags] = useState<string[]>(['Fruity']);
    const [customTagInput, setCustomTagInput] = useState('');

    useEffect(() => {
        if (!activeRecipe) {
            const restored = hydrateBrew();
            if (!restored) {
                navigate('/home');
            }
        }
    }, [activeRecipe, hydrateBrew, navigate]);

    if (!activeRecipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const tags = PRESET_TAGS;
    const customTags = selectedTags.filter(t => !PRESET_TAGS.includes(t));

    const handleToggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleAddCustomTag = () => {
        const trimmed = customTagInput.trim();
        if (trimmed && !selectedTags.includes(trimmed)) {
            setSelectedTags([...selectedTags, trimmed]);
        }
        setCustomTagInput('');
    };

    const getRatingLabel = (r: number) => {
        const labels: Record<number, string> = {
            1: '1.0 - Poor',
            2: '2.0 - Fair',
            3: '3.0 - Good',
            4: '4.0 - Very Good',
            5: '5.0 - Excellent'
        };
        return labels[r] || '';
    };

    const getProfileLabel = (value: number) => {
        if (value < 20) return 'Very Low';
        if (value < 40) return 'Low';
        if (value < 60) return 'Balanced';
        if (value < 80) return 'Medium-High';
        return 'High';
    };

    const handleSave = async () => {
        try {
            await brewService.logBrew(
                activeRecipe.id,
                rating,
                notes,
                profile,
                selectedTags,
                selectedBeanId || undefined,
                selectedFilterId || undefined,
                coffeeConsumed || undefined
            );
            stopBrew();
            navigate('/home');
        } catch (error) {
            console.error('Failed to save brew log:', error);
            alert('Failed to save your brew log. Please try again.');
        }
    };

    const handleDiscard = () => {
        if (window.confirm('Discard this log entry?')) {
            stopBrew();
            navigate('/home');
        }
    };

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-white shadow-2xl font-display text-[#181411]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100">
                <div className="flex flex-col mb-4">
                    <h1 className="text-neutral-text tracking-tight text-xl font-bold leading-tight">
                        How was it?
                    </h1>
                    <p className="text-xs font-medium text-gray-500 mt-1">{activeRecipe.method_id.toUpperCase()} • {activeRecipe.name}</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto pb-10">
                {/* Rating */}
                <div className="flex flex-col items-center justify-center mb-10">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="focus:outline-none group"
                            >
                                <Icon
                                    name="star"
                                    className={`text-[42px] transition-transform group-active:scale-110 ${Math.min(5, Math.max(0, rating)) >= star ? 'text-primary' : 'text-gray-200'}`}
                                    style={{ fontVariationSettings: Math.min(5, Math.max(0, rating)) >= star ? "'FILL' 1" : "'FILL' 0" }}
                                />
                            </button>
                        ))}
                    </div>
                    <p className="text-sm font-bold text-primary-dark mt-2">{getRatingLabel(rating)}</p>
                </div>

                {/* Taste Profile */}
                <div className="space-y-6 mb-10">
                    <h2 className="text-lg font-bold text-[#181411] mb-4">Taste Profile</h2>

                    {Object.entries(profile).map(([key, value]) => (
                        <div key={key}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-[#181411] capitalize">{key}</label>
                                <span className="text-xs font-bold text-white bg-primary px-2 py-0.5 rounded-full">
                                    {getProfileLabel(value)}
                                </span>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input
                                    className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                    max="100" min="0" type="range"
                                    value={value}
                                    onChange={(e) => setProfile({ ...profile, [key]: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-wider">
                                <span>Low</span>
                                <span>High</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Flavor Tags */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-[#181411] mb-3">Flavor Tags</h2>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleToggleTag(tag)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${selectedTags.includes(tag)
                                    ? 'bg-primary text-white border-transparent shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary/30 hover:text-primary'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                        {customTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleToggleTag(tag)}
                                className="px-4 py-2 rounded-xl text-sm font-medium transition-all border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                            >
                                {tag}
                                <span className="ml-1 text-primary/60">&times;</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                        <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomTag(); }}
                            placeholder="Add custom tag..."
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                        />
                        <button
                            onClick={handleAddCustomTag}
                            disabled={!customTagInput.trim()}
                            className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-40"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Notes */}
                <div className="mb-2">
                    <label className="block text-lg font-bold text-[#181411] mb-3" htmlFor="notes">Tasting Notes</label>
                    <textarea
                        className="w-full rounded-2xl border-gray-200 bg-gray-50 p-4 text-base placeholder:text-gray-400 focus:border-primary focus:ring-primary shadow-sm resize-none outline-none"
                        id="notes"
                        placeholder="The blueberry notes really came through as it cooled down..."
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="sticky bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200 z-20 pb-8 pt-4">
                <div className="flex w-full flex-col gap-3">
                    <button
                        onClick={handleSave}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                    >
                        <Icon name="bookmark" style={{ fontVariationSettings: "'FILL' 1" }} className="text-[20px]" />
                        Save to Journal
                    </button>
                    <button
                        onClick={handleDiscard}
                        className="w-full bg-transparent hover:bg-gray-50 text-gray-600 hover:text-red-600 font-bold py-3 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base"
                    >
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
};
