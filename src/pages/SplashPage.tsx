import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../core/services';
import { SplashLogoIcon } from '../components/Icons';

export const SplashPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const checkOnboardingState = async () => {
            try {
                const name = await settingsService.getUserName();
                const methods = await settingsService.getUserPreferredMethods();

                const hasCompletedName = name && name.trim().length > 0;
                // Assuming Step 2 mandates exactly 6 selected equipment methods:
                const hasCompletedEquipment = methods && methods.length === 6;

                const timer = setTimeout(() => {
                    if (hasCompletedName && hasCompletedEquipment) {
                        navigate('/home');
                    } else {
                        navigate('/welcome');
                    }
                }, 2800); // Slightly longer than the 2.5s progress animation

                return () => clearTimeout(timer);
            } catch (err) {
                console.error("Failed to check onboarding state", err);
                const timer = setTimeout(() => navigate('/welcome'), 2800);
                return () => clearTimeout(timer);
            }
        };

        checkOnboardingState();
    }, [navigate]);

    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-between bg-cream p-8 font-display overflow-hidden">
            <div className="flex-1"></div>

            {/* Logo Container */}
            <div className="flex flex-col items-center justify-center z-10 logo-container">
                <div className="relative w-48 h-48 mb-8 text-gold drop-shadow-md flex items-center justify-center">
                    <SplashLogoIcon className="w-full h-full" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-coffee-brown mt-4">
                    CoffeeFlow
                </h1>
                <p className="text-gold font-medium tracking-[0.2em] text-xs uppercase mt-2">
                    Brew Perfection
                </p>
            </div>

            {/* Bottom Section */}
            <div className="flex-1 flex flex-col items-center justify-end w-full pb-10 space-y-6">
                <div className="w-48 h-1 bg-coffee-brown/10 rounded-full overflow-hidden">
                    <div className="h-full bg-coffee-brown/40 rounded-full progress-bar-fill w-0"></div>
                </div>
                <div className="flex items-center gap-2 text-coffee-brown/40 text-[10px] font-medium tracking-wide uppercase">
                    <span>A Kulino Tech Project</span>
                </div>
            </div>
        </div>
    );
};
