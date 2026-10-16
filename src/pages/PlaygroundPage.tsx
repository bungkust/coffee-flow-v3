import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Icon } from '../components/Icons';
import { BottomNav } from '../components/BottomNav';
import { Toast } from '../components/Toast';
import { ProgressBar } from '../components/ProgressBar';
import { useSafeBack } from '../shared/utils/backNavigation';

export const PlaygroundPage = () => {
    const safeBack = useSafeBack();

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center bg-white p-4 sticky top-0 z-10 border-b border-neutral-border">
                <button
                    onClick={() => safeBack('/home')}
                    className="text-neutral-text flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-neutral-100 rounded-full transition-colors"
                    aria-label="Go back"
                >
                    <Icon name="arrow_back" className="text-2xl" />
                </button>
                <h2 className="text-neutral-text text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Design System</h2>
            </div>

            <div className="flex-1 overflow-y-auto pb-8">
                {/* 01. Color Palette */}
                <section className="border-b border-neutral-border pb-6">
                    <div className="px-5 py-4 flex items-center gap-2">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">01</span>
                        <h3 className="text-neutral-text text-lg font-bold leading-tight">Color Palette</h3>
                    </div>
                    <div className="px-5 grid grid-cols-2 gap-4">
                        {/* Primary */}
                        <div className="flex flex-col gap-2">
                            <div className="h-24 w-full rounded-xl bg-primary shadow-sm flex items-end p-3">
                                <span className="text-white text-xs font-medium bg-black/20 px-2 py-1 rounded backdrop-blur-sm">Primary</span>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-sm font-semibold text-neutral-text">Coffee Brown</span>
                                <span className="text-xs text-gray-500 font-mono">#B86614</span>
                            </div>
                        </div>
                        {/* Secondary */}
                        <div className="flex flex-col gap-2">
                            <div className="h-24 w-full rounded-xl bg-secondary shadow-sm flex items-end p-3 border border-neutral-border">
                                <span className="text-neutral-text text-xs font-medium bg-white/60 px-2 py-1 rounded backdrop-blur-sm">Secondary</span>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-sm font-semibold text-neutral-text">Latte Cream</span>
                                <span className="text-xs text-gray-500 font-mono">#F5E6D3</span>
                            </div>
                        </div>
                        {/* Accent */}
                        <div className="flex flex-col gap-2">
                            <div className="h-24 w-full rounded-xl bg-accent shadow-sm flex items-end p-3">
                                <span className="text-neutral-text text-xs font-medium bg-white/60 px-2 py-1 rounded backdrop-blur-sm">Accent</span>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-sm font-semibold text-neutral-text">Crema Gold</span>
                                <span className="text-xs text-gray-500 font-mono">#FFC107</span>
                            </div>
                        </div>
                        {/* Neutrals Stack */}
                        <div className="flex flex-col gap-2 h-full">
                            <div className="flex-1 rounded-xl bg-neutral-800 shadow-sm flex items-center justify-center mb-1">
                                <span className="text-white text-xs font-mono">#1F2937</span>
                            </div>
                            <div className="flex-1 rounded-xl bg-gray-400 shadow-sm flex items-center justify-center mb-1">
                                <span className="text-white text-xs font-mono">#9CA3AF</span>
                            </div>
                            <div className="flex-1 rounded-xl bg-gray-100 shadow-sm flex items-center justify-center border border-neutral-border">
                                <span className="text-gray-500 text-xs font-mono">#F3F4F6</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 02. Typography */}
                <section className="border-b border-neutral-border pb-6 bg-gray-50/50">
                    <div className="px-5 py-4 flex items-center gap-2">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">02</span>
                        <h3 className="text-neutral-text text-lg font-bold leading-tight">Typography</h3>
                    </div>
                    <div className="px-5 space-y-6">
                        <div className="border-l-4 border-primary pl-4">
                            <h1 className="text-3xl font-bold text-neutral-text mb-1">H1 Headline</h1>
                            <p className="text-xs text-gray-400 font-mono">Plus Jakarta Sans / Bold / 30px</p>
                        </div>
                        <div className="border-l-4 border-primary/60 pl-4">
                            <h2 className="text-2xl font-semibold text-neutral-text mb-1">H2 Title</h2>
                            <p className="text-xs text-gray-400 font-mono">Plus Jakarta Sans / SemiBold / 24px</p>
                        </div>
                        <div className="border-l-4 border-primary/30 pl-4">
                            <p className="text-base text-neutral-text mb-1 leading-relaxed">Body Regular. The perfect cup of coffee requires precision, patience, and the right beans.</p>
                            <p className="text-xs text-gray-400 font-mono">Plus Jakarta Sans / Regular / 16px</p>
                        </div>
                        <div className="border-l-4 border-neutral-300 pl-4">
                            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Caption & Label</p>
                            <p className="text-xs text-gray-400 font-mono">Plus Jakarta Sans / Bold / 12px</p>
                        </div>
                    </div>
                </section>

                {/* 03. Iconography */}
                <section className="border-b border-neutral-border pb-6">
                    <div className="px-5 py-4 flex items-center gap-2">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">03</span>
                        <h3 className="text-neutral-text text-lg font-bold leading-tight">Iconography</h3>
                    </div>

                    <div className="px-5 space-y-8">
                        {/* Brewing Methods */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-6 w-1 rounded-full bg-primary"></div>
                                <h4 className="text-sm font-bold text-neutral-text">Brewing Methods</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: 'coffee_maker', label: 'V60' },
                                    { icon: 'science', label: 'Chemex' },
                                    { icon: 'opacity', label: 'Aeropress' },
                                    { icon: 'local_cafe', label: 'French Press' },
                                    { icon: 'kitchen', label: 'Moka Pot' },
                                    { icon: 'experiment', label: 'Siphon' }
                                ].map((item) => (
                                    <div key={item.label} className="group flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <Icon name={item.icon} className="text-2xl" />
                                        </div>
                                        <span className="text-xs font-semibold text-center text-gray-600">{item.label}</span>
                                    </div>
                                ))}
                                {/* Espresso Machine Large Item */}
                                <div className="col-span-3 group flex items-center justify-between rounded-2xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
                                    <span className="text-sm font-semibold text-gray-800 ml-2">Espresso Machine</span>
                                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Icon name="mode_heat" className="text-2xl" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tools & Params */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-6 w-1 rounded-full bg-primary"></div>
                                <h4 className="text-sm font-bold text-neutral-text">Tools & Params</h4>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
                                {[
                                    { icon: 'grain', label: 'Grinder' },
                                    { icon: 'water_drop', label: 'Kettle' },
                                    { icon: 'thermostat', label: 'Temp' },
                                    { icon: 'scale', label: 'Scale' },
                                    { icon: 'timer', label: 'Timer' }
                                ].map((item) => (
                                    <div key={item.label} className="snap-start shrink-0 group flex h-24 w-20 flex-col items-center justify-center gap-2 rounded-2xl bg-white border border-gray-100 p-2 shadow-sm transition-all hover:scale-105">
                                        <Icon name={item.icon} className="text-3xl text-primary" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Icons */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-6 w-1 rounded-full bg-primary"></div>
                                <h4 className="text-sm font-bold text-neutral-text">Action Icons</h4>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                <div className="aspect-square flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                                    <Icon name="add" className="text-2xl" />
                                </div>
                                {['search', 'ios_share', 'favorite', 'history'].map((icon) => (
                                    <div key={icon} className="aspect-square flex items-center justify-center rounded-xl bg-white text-gray-600 border border-transparent shadow-sm hover:border-primary/20 transition-all">
                                        <Icon name={icon} className="text-2xl" />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-5 gap-2 pt-1 text-center">
                                <span className="text-[10px] font-medium text-gray-400">Add</span>
                                <span className="text-[10px] font-medium text-gray-400">Search</span>
                                <span className="text-[10px] font-medium text-gray-400">Share</span>
                                <span className="text-[10px] font-medium text-gray-400">Fave</span>
                                <span className="text-[10px] font-medium text-gray-400">History</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 04. Components */}
                <section className="pb-6 bg-gray-50/50">
                    <div className="px-5 py-4 flex items-center gap-2">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">04</span>
                        <h3 className="text-neutral-text text-lg font-bold leading-tight">Components</h3>
                    </div>
                    <div className="px-5 space-y-8">
                        {/* Buttons */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Buttons</h4>
                            <Button className="w-full">
                                <Icon name="play_arrow" className="text-xl" />
                                Start Brewing
                            </Button>
                            <div className="flex gap-3">
                                <Button variant="secondary" className="flex-1">Secondary</Button>
                                <Button variant="ghost" className="flex-1">Ghost</Button>
                            </div>
                        </div>

                        {/* Inputs */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Input Fields</h4>
                            {/* Default */}
                            <Input label="Recipe Name" placeholder="e.g. Morning V60" />

                            {/* Active State Visual */}
                            <Input
                                label="Coffee Weight (g)"
                                value="18.5"
                                active
                                rightElement={<span className="text-gray-400 text-sm font-medium">grams</span>}
                                readOnly
                            />

                            {/* Error State */}
                            <Input
                                label="Water Temperature"
                                value="300"
                                error="Value exceeds recommended maximum."
                                readOnly
                            />
                        </div>

                        {/* Chips */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Selection Chips</h4>
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="secondary" active>V60</Button>
                                <Button size="sm" variant="ghost">AeroPress</Button>
                                <Button size="sm" variant="ghost">French Press</Button>
                                <Button size="sm" variant="ghost">Chemex</Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 06. Feedback */}
                <section>
                    <div className="flex items-center gap-2 mb-4 px-5 pt-6">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-400">06. Feedback</span>
                        <div className="h-px bg-stone-200 flex-1"></div>
                    </div>
                    <div className="px-5 space-y-6 pb-6">
                        <ProgressBar progress={45} label="Brewing..." valueLabel="45%" />
                        <Toast message="Recipe saved successfully" actionLabel="Undo" />

                        {/* Alert Modal Preview */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-100 text-center">
                            <div className="h-10 w-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Icon name="delete" className="text-2xl" />
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1">Delete Recipe?</h4>
                            <p className="text-sm text-stone-500 mb-4">This action cannot be undone.</p>
                            <div className="flex gap-2">
                                <button onClick={() => alert('Preview cancelled.')} className="flex-1 py-2 rounded-lg bg-stone-100 text-stone-600 text-sm font-semibold border-none cursor-pointer">Cancel</button>
                                <button onClick={() => alert('Preview delete action.')} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold border-none cursor-pointer">Delete</button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="p-6 text-center">
                    <p className="text-xs text-gray-400">CoffeeFlow Design System v1.0</p>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};
