import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const SplashPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/welcome');
        }, 2800); // Slightly longer than the 2.5s progress animation

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-between bg-cream p-8 font-display overflow-hidden">
            <div className="flex-1"></div>

            {/* Logo Container */}
            <div className="flex flex-col items-center justify-center z-10 logo-container">
                <div className="relative w-48 h-48 mb-8 text-gold">
                    <svg className="w-full h-full drop-shadow-md" fill="none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path d="M40 50 L80 140 H120 L160 50 H40 Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6"></path>
                        <path d="M160 50 C175 50 185 60 185 75 C185 90 170 100 155 105" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6"></path>
                        <path d="M55 50 C55 50 65 90 75 120" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                        <path d="M80 50 C80 50 90 85 95 120" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                        <path d="M105 50 C105 50 105 85 105 120" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                        <path d="M130 50 C130 50 120 85 115 120" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                        <path d="M150 50 C150 50 140 85 130 120" stroke="currentColor" strokeLinecap="round" strokeWidth="4"></path>
                        <path d="M70 148 H130 L120 160 H80 L70 148 Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="6"></path>
                        <path d="M100 170 C100 170 90 185 90 192 C90 198 94 202 100 202 C106 202 110 198 110 192 C110 185 100 170 100 170 Z" fill="currentColor"></path>
                    </svg>
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
                    <span>Powered by Gemini</span>
                </div>
            </div>
        </div>
    );
};
