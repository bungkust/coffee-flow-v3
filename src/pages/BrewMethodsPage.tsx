import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';

export const BrewMethodsPage = () => {
    const navigate = useNavigate();

    const methods = [
        { id: 'v60', name: 'V60', icon: 'filter_alt', desc: 'Clean & Bright' },
        { id: 'aeropress', name: 'AeroPress', icon: 'science', desc: 'Versatile & Full' },
        { id: 'french_press', name: 'French Press', icon: 'coffee', desc: 'Rich & Bold' },
        { id: 'chemex', name: 'Chemex', icon: 'hourglass_empty', desc: 'Crisp & Floral' },
        { id: 'espresso', name: 'Espresso', icon: 'local_cafe', desc: 'Intense & Creamy' },
        { id: 'moka_pot', name: 'Moka Pot', icon: 'fireplace', desc: 'Strong Classic' },
    ];

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-background-light shadow-2xl pb-32">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background-light/95 backdrop-blur-md pt-12 pb-4 px-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-neutral-text tracking-tight text-2xl font-bold leading-tight">Brew Methods</h1>
                    <button className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-neutral-text hover:bg-gray-100 transition-colors shadow-sm cursor-pointer">
                        <Icon name="history" className="text-[20px]" />
                    </button>
                </div>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <Icon name="search" className="text-[20px]" />
                    </span>
                    <input
                        className="w-full bg-white text-neutral-text placeholder-gray-400 rounded-xl py-3 pl-10 pr-4 border-none shadow-sm focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                        placeholder="Search methods or recipes..."
                        type="text"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-5 pt-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 ml-1">Select Method</p>
                <div className="grid grid-cols-2 gap-4">
                    {methods.map((method) => (
                        <button
                            key={method.id}
                            onClick={() => navigate(`/recipes?method=${method.id}`)}
                            className="group flex flex-col items-center p-5 rounded-2xl bg-white text-neutral-text shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <div className="w-14 h-14 rounded-full bg-accent-light text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                                <Icon name={method.icon} className="text-[32px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                            </div>
                            <h3 className="font-bold text-lg mb-1">{method.name}</h3>
                            <p className="text-xs text-gray-500 text-center font-medium">{method.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="mt-8 mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Other Tools</p>
                    <div className="flex flex-col gap-3">
                        <button className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 hover:border-primary/30 group cursor-pointer text-left w-full">
                            <div className="w-10 h-10 rounded-full bg-accent-light text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center mr-4 shadow-sm">
                                <Icon name="timer" className="text-[20px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-neutral-text">Quick Timer</h4>
                                <p className="text-xs text-gray-500">Just timing, no recipe</p>
                            </div>
                            <Icon name="chevron_right" className="text-gray-300" />
                        </button>
                        <button className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 hover:border-primary/30 group cursor-pointer text-left w-full">
                            <div className="w-10 h-10 rounded-full bg-accent-light text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center mr-4 shadow-sm">
                                <Icon name="calculate" className="text-[20px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-neutral-text">Ratio Calculator</h4>
                                <p className="text-xs text-gray-500">Find your perfect strength</p>
                            </div>
                            <Icon name="chevron_right" className="text-gray-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Add Button */}

            {/* Navigation */}
            <BottomNav activeTab="brewing" />
        </div>
    );
};
