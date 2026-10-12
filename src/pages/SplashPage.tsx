import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../core/services';
import { SplashLogoIcon } from '../components/Icons';

export const SplashPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            settingsService.isOnboardingComplete()
                .then((done) => navigate(done ? '/home' : '/welcome'))
                .catch(() => navigate('/welcome'));
        }, 2800);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="relative flex h-screen max-w-md mx-auto flex-col items-center justify-between bg-md-surface p-8 font-sans overflow-hidden text-md-on-surface">
            <div className="flex-1"></div>

            {/* Logo Container */}
            <div className="flex flex-col items-center justify-center z-10 logo-container">
                <div className="relative size-48 mb-6 text-md-primary flex items-center justify-center">
                    <SplashLogoIcon className="w-full h-full" />
                </div>
                <h1 className="typescale-headline-large font-bold tracking-tight text-md-on-surface mt-2">
                    CoffeeFlow
                </h1>
                <p className="typescale-label-medium font-bold tracking-[0.2em] text-md-primary uppercase mt-1">
                    Brew Perfection
                </p>
            </div>

            {/* Bottom Section */}
            <div className="flex-1 flex flex-col items-center justify-end w-full pb-10 space-y-6">
                <div className="w-48 h-1 bg-md-outline-variant/30 rounded-full overflow-hidden">
                    <div className="h-full bg-md-primary rounded-full progress-bar-fill w-0"></div>
                </div>
                <div className="flex items-center gap-2 text-md-on-surface-variant/60 typescale-label-small font-medium tracking-wide uppercase">
                    <span>A Kulino Tech Project</span>
                </div>
            </div>
        </div>
    );
};
