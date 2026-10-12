import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { Button } from '../components/Button';
import welcomeHero from '../assets/welcome-hero.jpg';
import { settingsService } from '../core/services';

export const WelcomePage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const checkDone = async () => {
            try {
                if (await settingsService.isOnboardingComplete()) {
                    navigate('/home', { replace: true });
                }
            } catch {
                // Ignore
            }
        };
        checkDone();
    }, [navigate]);

    return (
        <div className="relative flex min-h-screen w-full max-w-md mx-auto flex-col bg-md-surface text-md-on-surface font-sans overflow-hidden">
            {/* Hero Section */}
            <div className="relative h-[45%] w-full overflow-hidden rounded-b-3xl shadow-md-2 z-0">
                <img
                    src={welcomeHero}
                    alt="Freshly brewed coffee"
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-md-surface/80 via-transparent to-transparent"></div>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col items-center justify-center -mt-8 z-10 px-6">
                {/* Logo */}
                <div className="relative flex items-center justify-center mb-5">
                    <div className="relative flex size-20 items-center justify-center rounded-3xl bg-md-primary-container text-md-on-primary-container shadow-md-2 border border-md-outline-variant/30">
                        <Icon name="coffee_maker" className="text-4xl text-md-primary" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="text-center space-y-1">
                    <h1 className="typescale-headline-large font-extrabold tracking-tight text-md-on-surface">
                        CoffeeFlow
                    </h1>
                    <p className="typescale-label-medium font-bold tracking-wider text-md-primary uppercase">
                        Brew Perfection
                    </p>
                </div>

                <p className="mt-3 text-center typescale-body-medium text-md-on-surface-variant leading-relaxed max-w-xs">
                    Discover recipes, track your brews, and master the art of coffee making.
                </p>
            </div>

            {/* Actions Section */}
            <div className="pb-10 px-6 w-full flex flex-col gap-3 z-10">
                <Button
                    variant="filled"
                    size="lg"
                    onClick={() => navigate('/onboarding')}
                    className="w-full"
                >
                    <span>Start New Journey</span>
                    <Icon name="arrow_forward" className="text-xl" />
                </Button>

                <button
                    onClick={() => navigate('/settings/backup')}
                    className="w-full bg-md-surface-container-high text-md-on-surface font-semibold py-3.5 px-6 rounded-full border border-md-outline-variant/30 hover:bg-md-surface-container-highest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer typescale-label-large"
                >
                    <Icon name="cloud_sync" className="text-xl text-md-primary" />
                    <span>Restore Backup Data</span>
                </button>
            </div>
        </div>
    );
};
