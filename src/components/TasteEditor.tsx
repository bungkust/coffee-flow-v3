import { useState } from 'react';
import { PROFILE_FIELDS, PRESET_FLAVOR_TAGS, describeProfile, type TasteProfileValues } from '../shared/utils/tasteProfile';

interface TasteEditorProps {
    profile: TasteProfileValues;
    onProfileChange: (profile: TasteProfileValues) => void;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
}

export const TasteEditor = ({ profile, onProfileChange, tags, onTagsChange }: TasteEditorProps) => {
    const [customTagInput, setCustomTagInput] = useState('');
    const customTags = tags.filter(tag => !PRESET_FLAVOR_TAGS.includes(tag));

    const toggleTag = (tag: string) => {
        onTagsChange(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
    };

    const addCustomTag = () => {
        const trimmed = customTagInput.trim();
        if (trimmed && !tags.includes(trimmed)) onTagsChange([...tags, trimmed]);
        setCustomTagInput('');
    };

    return (
        <>
            <div className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-5">
                <h2 className="typescale-title-medium font-bold text-md-on-surface">Taste Profile</h2>

                {PROFILE_FIELDS.map(field => {
                    const value = profile[field.key];
                    return (
                        <div key={field.key} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="typescale-label-large font-bold text-md-on-surface">{field.label}</label>
                                <span className="typescale-label-small font-bold text-md-on-secondary-container bg-md-secondary-container px-2.5 py-0.5 rounded-full">
                                    {value == null ? 'Not set' : describeProfile(value)}
                                </span>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input
                                    className="w-full h-2 bg-md-surface-container-high rounded-lg appearance-none cursor-pointer accent-md-primary"
                                    max="100" min="0" type="range"
                                    value={value ?? 0}
                                    onChange={(e) => onProfileChange({ ...profile, [field.key]: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-between typescale-label-small text-md-on-surface-variant/70 font-semibold uppercase tracking-wider">
                                <span>Low</span>
                                <span>High</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-5 bg-md-surface-container-low rounded-2xl border border-md-outline-variant/30 shadow-md-1 space-y-3">
                <h2 className="typescale-title-medium font-bold text-md-on-surface">Flavor Tags</h2>
                <div className="flex flex-wrap gap-2">
                    {PRESET_FLAVOR_TAGS.map(tag => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-3.5 py-1.5 rounded-full typescale-label-medium font-semibold transition-all cursor-pointer border ${tags.includes(tag)
                                ? 'bg-md-secondary-container border-md-primary text-md-on-secondary-container shadow-sm'
                                : 'bg-md-surface-container-high text-md-on-surface-variant border-md-outline-variant/30 hover:bg-md-surface-container-highest'
                                }`}
                        >
                            {tag}
                        </button>
                    ))}
                    {customTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className="px-3.5 py-1.5 rounded-full typescale-label-medium font-semibold transition-all border bg-md-primary-container/40 text-md-primary border-md-primary/30 hover:bg-md-primary-container cursor-pointer"
                        >
                            {tag}
                            <span className="ml-1 text-md-primary/70">&times;</span>
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 pt-2">
                    <input
                        type="text"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addCustomTag(); }}
                        placeholder="Add custom tag..."
                        className="flex-1 rounded-full border border-md-outline-variant/30 bg-md-surface-container-high px-4 py-2 typescale-body-medium text-md-on-surface placeholder:text-md-on-surface-variant/70 outline-none focus:ring-2 focus:ring-md-primary/40"
                    />
                    <button
                        onClick={addCustomTag}
                        disabled={!customTagInput.trim()}
                        className="rounded-full bg-md-secondary-container px-4 py-2 typescale-label-medium font-bold text-md-on-secondary-container hover:bg-md-secondary-container/80 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                        Add
                    </button>
                </div>
            </div>
        </>
    );
};
