import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import masterImg from '../assets/onboarding-master.jpg';
import explore1 from '../assets/onboarding-explore-1.jpg';
import explore2 from '../assets/onboarding-explore-2.jpg';
import explore3 from '../assets/onboarding-explore-3.jpg';
import explore4 from '../assets/onboarding-explore-4.jpg';
import trackImg from '../assets/onboarding-track.jpg';

type Step = 1 | 2 | 3;

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>(1);

    const handleNext = () => {
        if (step < 3) {
            setStep((s) => (s + 1) as Step);
        } else {
            navigate('/home');
        }
    };

    const handleSkip = () => navigate('/home');

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <main className="flex-1 flex flex-col items-center justify-start pt-20 pb-8 px-6 bg-white">
                        <div className="w-full flex-1 flex flex-col justify-center items-center min-h-[360px]">
                            <div className="relative w-full aspect-[4/5] max-h-[50vh] overflow-hidden rounded-2xl bg-coffee-light/20">
                                <img src={masterImg} alt="Barista pouring" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent"></div>
                            </div>
                        </div>
                        <div className="w-full flex flex-col items-center text-center space-y-4 mt-8 mb-6">
                            <h1 className="text-coffee-brown text-3xl font-extrabold leading-tight tracking-tight">
                                Master Your <span className="text-primary">Brew</span>
                            </h1>
                            <p className="text-coffee-medium text-base font-medium leading-relaxed max-w-[280px]">
                                Unlock the true potential of your beans. From grind size to pour speed, we guide you to the perfect cup.
                            </p>
                        </div>
                        <div className="w-full flex flex-col items-center gap-8 mt-auto">
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-2 w-6 rounded-full bg-primary transition-all duration-300"></div>
                                <div className="h-2 w-2 rounded-full bg-coffee-light transition-all duration-300"></div>
                                <div className="h-2 w-2 rounded-full bg-coffee-light transition-all duration-300"></div>
                            </div>
                            <button onClick={handleNext} className="group relative w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer">
                                <span>Next</span>
                                <Icon name="arrow_forward" className="text-xl font-bold group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </main>
                );
            case 2:
                return (
                    <main className="flex-1 flex flex-col px-6 pt-12 pb-8 bg-background-light overflow-y-auto">
                        <div className="mb-8 text-center mt-8">
                            <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-text">
                                Discover Your <br />
                                <span className="text-primary">Perfect Brew</span>
                            </h1>
                            <p className="mt-3 text-base font-medium text-coffee-medium px-4">
                                From classic hot espressos to refreshing cold brews, explore over 100+ recipes.
                            </p>
                        </div>
                        <div className="relative grid grid-cols-2 gap-4 h-[420px]">
                            <div className="flex flex-col gap-4 pt-8">
                                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-lg group bg-coffee-light">
                                    <img src={explore1} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90">
                                        <Icon name="local_fire_department" className="text-lg" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Hot</span>
                                    </div>
                                </div>
                                <div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-lg group bg-coffee-light">
                                    <img src={explore2} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-lg group bg-coffee-light">
                                    <img src={explore3} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90">
                                        <Icon name="ac_unit" className="text-lg" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Cold</span>
                                    </div>
                                </div>
                                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg group bg-coffee-light">
                                    <img src={explore4} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-auto w-full flex flex-col items-center gap-8 pt-6">
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary/20 transition-all duration-300"></div>
                                <div className="h-2 w-6 rounded-full bg-primary transition-all duration-300"></div>
                                <div className="h-2 w-2 rounded-full bg-primary/20 transition-all duration-300"></div>
                            </div>
                            <button onClick={handleNext} className="group relative w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer">
                                <span>Continue</span>
                                <Icon name="arrow_forward" className="text-xl font-bold group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </main>
                );
            case 3:
                return (
                    <main className="flex-1 flex flex-col items-center justify-center px-6 pt-4 pb-8 bg-background-light relative">
                        <div className="absolute top-10 left-[-50px] w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-40 right-[-50px] w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="w-full relative z-10 transform transition-transform hover:scale-[1.02] duration-500 ease-out mb-8">
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                                <div className="relative h-48 w-full bg-gray-200">
                                    <img src={trackImg} className="absolute inset-0 h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                    <div className="absolute bottom-4 left-4 right-4 text-white">
                                        <p className="text-xs font-medium uppercase tracking-wider opacity-90 mb-1">Morning Brew</p>
                                        <h3 className="text-xl font-bold leading-tight">Ethiopian Yirgacheffe</h3>
                                        <div className="flex items-center gap-2 mt-2 text-white/90 text-sm">
                                            <Icon name="schedule" className="text-[18px]" />
                                            <span>Today, 8:00 AM</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-gray-500">Rating</span>
                                        <div className="flex gap-1 text-primary">
                                            {[1, 2, 3, 4].map(i => <Icon key={i} name="star" className="text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} />)}
                                            <Icon name="star" className="text-[20px] text-gray-300" />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">Tasting Notes</span>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">Blueberry</div>
                                            <div className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold">Jasmine</div>
                                            <div className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold">Tea-like</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                                        <div className="flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-bold">Ratio</span><span className="text-sm font-semibold text-gray-800">1:16</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-bold">Time</span><span className="text-sm font-semibold text-gray-800">3:30</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] text-gray-400 uppercase font-bold">Method</span><span className="text-sm font-semibold text-gray-800">V60</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center space-y-3 max-w-xs mx-auto z-10 mb-8">
                            <h1 className="text-3xl font-extrabold text-neutral-text leading-tight">Track Your Journey</h1>
                            <p className="text-gray-500 text-base leading-relaxed">Keep a detailed log of every brew. Rate your coffees, note the flavors, and watch your barista skills grow.</p>
                        </div>

                        <div className="mt-auto w-full flex flex-col items-center gap-8">
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-coffee-light transition-all duration-300"></div>
                                <div className="h-2 w-2 rounded-full bg-coffee-light transition-all duration-300"></div>
                                <div className="h-2 w-8 rounded-full bg-primary transition-all duration-300"></div>
                            </div>
                            <button onClick={handleNext} className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer">
                                <span>Get Started</span>
                                <Icon name="arrow_forward" className="text-xl group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </main>
                );
        }
    };

    return (
        <div className="relative flex h-screen w-full max-w-md mx-auto flex-col overflow-hidden bg-background-light shadow-2xl">
            <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-end p-6 pt-8">
                <button onClick={handleSkip} className="text-sm font-bold tracking-wide text-coffee-medium hover:text-primary transition-colors cursor-pointer">
                    Skip
                </button>
            </header>
            {renderStep()}
        </div>
    );
};
