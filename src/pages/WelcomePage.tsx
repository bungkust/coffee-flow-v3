import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import welcomeHero from '../assets/welcome-hero.jpg';

export const WelcomePage = () => {
    const navigate = useNavigate();

    return (
        <div className="relative flex h-screen w-full flex-col bg-cream font-display overflow-hidden">
            {/* Hero Section */}
            <div className="relative h-[45%] w-full overflow-hidden rounded-b-[3rem] shadow-lg z-0">
                <img
                    src={welcomeHero}
                    alt="Freshly brewed coffee"
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col items-center justify-center -mt-8 z-10">
                {/* Logo */}
                <div className="relative flex items-center justify-center mb-6">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-xl shadow-primary/10">
                        <Icon name="coffee_maker" className="text-[48px] text-primary" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center space-y-2 px-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-coffee-brown">
                        CoffeeFlow
                    </h1>
                    <p className="text-primary/80 font-medium tracking-wide text-sm uppercase">
                        Brew Perfection
                    </p>
                </div>

                <p className="mt-4 px-10 text-center text-sm text-gray-500 leading-relaxed">
                    Discover recipes, track your brews, and master the art of coffee making.
                </p>
            </div>

            {/* Actions Section */}
            <div className="pb-10 px-8 w-full flex flex-col gap-4 z-10">
                <button
                    onClick={() => navigate('/onboarding')}
                    className="w-full bg-coffee-brown hover:bg-[#3d3029] text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-coffee-brown/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                >
                    <span>Start New Journey</span>
                    <Icon name="arrow_forward" className="text-xl" />
                </button>

                <button className="w-full bg-transparent border-2 border-coffee-brown/30 hover:border-coffee-brown/60 text-coffee-brown font-semibold text-base py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
                    <Icon name="cloud_sync" className="text-xl" />
                    <span>Restore Backup Data</span>
                </button>

                <div className="pt-2 flex justify-center gap-4 text-[10px] text-gray-400 uppercase tracking-wider">
                    <a href="#" className="hover:text-primary no-underline text-inherit">Terms</a>
                    <span>•</span>
                    <a href="#" className="hover:text-primary no-underline text-inherit">Privacy</a>
                </div>
            </div>
        </div>
    );
};
