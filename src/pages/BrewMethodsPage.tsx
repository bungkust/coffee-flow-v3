import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { settingsService } from '../core/services';

const ALL_METHODS = [
    { id: 'v60', name: 'V60', icon: 'filter_alt', image: '/assets/methods/v60.png', desc: 'Clean & Bright' },
    { id: 'aeropress', name: 'AeroPress', icon: 'science', image: '/assets/methods/aeropress.png', desc: 'Versatile & Full' },
    { id: 'french_press', name: 'French Press', icon: 'coffee_maker', image: '/assets/methods/french_press.png', desc: 'Rich & Bold' },
    { id: 'chemex', name: 'Chemex', icon: 'hourglass_top', image: '/assets/methods/chemex.png', desc: 'Crisp & Floral' },
    { id: 'espresso', name: 'Espresso', icon: 'coffee', image: '/assets/methods/espresso.png', desc: 'Intense & Creamy' },
    { id: 'moka_pot', name: 'Moka Pot', icon: 'local_cafe', image: '/assets/methods/moka_pot.png', desc: 'Strong Classic' },
    { id: 'siphon', name: 'Siphon', icon: 'science_off', image: '/assets/methods/siphon.png', desc: 'Theatrical Brew' },
    { id: 'clever', name: 'Clever Dripper', icon: 'filter_list', image: '/assets/methods/clever.png', desc: 'Immersion & Drip' },
    { id: 'cold_brew', name: 'Cold Brew', icon: 'ac_unit', image: '/assets/methods/cold_brew.png', desc: 'Smooth & Sweet' },
    { id: 'kalita', name: 'Kalita Wave', icon: 'waves', image: '/assets/methods/kalita.png', desc: 'Consistent & Balanced' },
];

export const BrewMethodsPage = () => {
    const navigate = useNavigate();
    const [availableMethods, setAvailableMethods] = useState<typeof ALL_METHODS>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const preferredMethods = await settingsService.getUserPreferredMethods();

                // If the user has preferred methods saved, filter ALL_METHODS
                if (preferredMethods && preferredMethods.length > 0) {
                    const methodNames = new Set(preferredMethods);
                    const filtered = ALL_METHODS.filter(method => methodNames.has(method.name));
                    setAvailableMethods(filtered.length > 0 ? filtered : ALL_METHODS.slice(0, 6));
                } else {
                    // Fallback to core methods if none are saved
                    setAvailableMethods(ALL_METHODS.slice(0, 6));
                }
            } catch (error) {
                console.error("Failed to load preferred methods:", error);
                setAvailableMethods(ALL_METHODS.slice(0, 6)); // Fallback
            } finally {
                setLoading(false);
            }
        };

        fetchMethods();
    }, [isEditing]);

    const handleEditToggle = () => {
        if (!isEditing) {
            setSelectedEquipment(availableMethods.map(m => m.name));
        }
        setIsEditing(!isEditing);
    };

    const toggleEquipment = (item: string) => {
        if (selectedEquipment.includes(item)) {
            setSelectedEquipment(selectedEquipment.filter(i => i !== item));
        } else {
            if (selectedEquipment.length < 6) {
                setSelectedEquipment([...selectedEquipment, item]);
            }
        }
    };

    const handleSaveEquipment = async () => {
        try {
            await settingsService.setUserPreferredMethods(selectedEquipment);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save equipment", error);
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl pb-32 transition-colors duration-300">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md pt-12 pb-2 px-4 border-b border-gray-100 dark:border-white/5 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {isEditing && (
                            <button onClick={handleEditToggle} className="flex items-center text-neutral-text dark:text-white/60 hover:text-coffee-brown transition-colors">
                                <Icon name="arrow_back" className="text-2xl" />
                            </button>
                        )}
                        <h1 className="text-neutral-text dark:text-white tracking-tight text-xl font-bold leading-tight">
                            {isEditing ? 'Edit Equipment' : 'Brew Methods'}
                        </h1>
                    </div>
                </div>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <Icon name="search" className="text-[20px]" />
                    </span>
                    <input
                        className="w-full bg-white dark:bg-white/5 text-neutral-text dark:text-white placeholder-gray-400 rounded-xl py-3 pl-10 pr-4 border-none shadow-sm focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all"
                        placeholder="Search methods or recipes..."
                        type="text"
                    />
                </div>
            </div>

            {/* Content */}
            {isEditing ? (
                <div className="flex-1 flex flex-col pt-6 px-5 pb-24 relative">
                    <div className="mb-6 text-center space-y-2">
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                            Select <span className="text-primary font-bold">exactly 6</span> items to show on your dashboard. ({selectedEquipment.length}/6)
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pb-20">
                        {ALL_METHODS.map((item) => {
                            const isSelected = selectedEquipment.includes(item.name);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleEquipment(item.name)}
                                    className={`group relative flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-[0.98] border ${isSelected
                                        ? 'bg-primary/5 border-primary/50 shadow-sm'
                                        : 'bg-white dark:bg-[#2C241B] border-gray-100 dark:border-white/5 shadow-sm hover:border-primary/30'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 text-primary">
                                            <Icon name="check_circle" className="text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                                        </div>
                                    )}
                                    <div className={`h-12 w-12 mb-2 rounded-lg flex items-center justify-center transition-colors overflow-hidden ${isSelected
                                        ? 'bg-primary/10'
                                        : 'bg-gray-50 dark:bg-white/5'
                                        }`}>
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className={`font-bold text-xs text-center ${isSelected
                                        ? 'text-primary'
                                        : 'text-neutral-text dark:text-gray-300'
                                        }`}>
                                        {item.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="fixed bottom-0 w-full bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-black/5 dark:border-white/5 p-6 z-30 max-w-md mx-auto left-0 right-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-none">
                        <button
                            onClick={handleSaveEquipment}
                            disabled={selectedEquipment.length !== 6}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Save Changes</span>
                            <Icon name="check" className="text-xl" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 px-5 pt-6">
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Equipment</p>
                        <button onClick={handleEditToggle} className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 cursor-pointer">
                            <Icon name="edit" className="text-[14px]" />
                            Edit
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {availableMethods.map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => navigate(`/recipes?method=${method.id}`)}
                                    className="group flex flex-col items-center p-5 rounded-2xl bg-white dark:bg-[#2C241B] text-neutral-text dark:text-white shadow-sm border border-gray-100 dark:border-white/5 hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center mb-4 transition-colors overflow-hidden border border-gray-100 dark:border-white/5">
                                        <img src={method.image} alt={method.name} className="w-full h-full object-cover p-1" />
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">{method.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">{method.desc}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {availableMethods.length === 0 && !loading && (
                        <div className="text-center py-10 px-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <Icon name="coffee_maker" className="text-4xl text-gray-300 mb-3 mx-auto" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No brewing equipment found in your pantry.</p>
                            <button onClick={() => navigate('/pantry')} className="text-primary font-bold text-sm mt-2 hover:underline">
                                Add Equipment
                            </button>
                        </div>
                    )}


                    <div className="mt-8 mb-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Other Tools</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => navigate('/quick-timer')} className="flex items-center p-4 bg-white dark:bg-[#2C241B] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 hover:border-primary/30 group cursor-pointer text-left w-full transition-all">
                                <div className="w-10 h-10 rounded-full bg-accent-light dark:bg-white/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center mr-4 shadow-sm">
                                    <Icon name="timer" className="text-[20px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-neutral-text dark:text-white">Quick Timer</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Just timing, no recipe</p>
                                </div>
                                <Icon name="chevron_right" className="text-gray-300 dark:text-gray-600" />
                            </button>
                            <button onClick={() => navigate('/ratio-calculator')} className="flex items-center p-4 bg-white dark:bg-[#2C241B] rounded-xl shadow-sm border border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-white/5 hover:border-primary/30 group cursor-pointer text-left w-full transition-all">
                                <div className="w-10 h-10 rounded-full bg-accent-light dark:bg-white/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center mr-4 shadow-sm">
                                    <Icon name="calculate" className="text-[20px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-neutral-text dark:text-white">Ratio Calculator</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Find your perfect strength</p>
                                </div>
                                <Icon name="chevron_right" className="text-gray-300 dark:text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation (Hide when editing) */}
            {!isEditing && <BottomNav activeTab="brewing" />}
        </div>
    );
};
