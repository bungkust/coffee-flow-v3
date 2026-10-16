import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type BackHandler = () => boolean; // return true if handled (consumed)

const backHandlers: BackHandler[] = [];

/**
 * Register a priority handler for back button actions (modals, sheets, active flows).
 * Handlers are invoked in LIFO order (last registered runs first).
 */
export const registerBackHandler = (handler: BackHandler): (() => void) => {
    backHandlers.push(handler);
    return () => {
        const index = backHandlers.indexOf(handler);
        if (index > -1) {
            backHandlers.splice(index, 1);
        }
    };
};

/**
 * Trigger the highest-priority registered back handler.
 * Returns true if an active modal, sheet, or flow intercepted the back action.
 */
export const handleBackPress = (): boolean => {
    for (let i = backHandlers.length - 1; i >= 0; i--) {
        const handled = backHandlers[i]();
        if (handled) return true;
    }
    return false;
};

// Global escape key listener for desktop & web parity with Android back button
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            handleBackPress();
        }
    });
}

/**
 * Hook to register a back action for an open modal or active component.
 */
export const useBackHandler = (isActive: boolean, onBack: () => void) => {
    useEffect(() => {
        if (!isActive) return;
        return registerBackHandler(() => {
            onBack();
            return true;
        });
    }, [isActive, onBack]);
};

/**
 * Hook that provides a safe back navigation function.
 * If prior session history exists, it invokes navigate(-1).
 * If no history exists (direct entry, deep link, or page reload), it redirects to the fallback path.
 */
export const useSafeBack = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return useCallback((fallbackPath?: string) => {
        if (Number(window.history.state?.idx) > 0) {
            navigate(-1);
            return;
        }

        if (fallbackPath) {
            navigate(fallbackPath);
            return;
        }

        const path = location.pathname;
        if (path.startsWith('/recipes/')) navigate('/recipes');
        else if (path.startsWith('/recipes')) navigate('/brew-methods');
        else if (path.startsWith('/drinks/list')) navigate('/drinks');
        else if (path.startsWith('/drinks/')) navigate('/drinks');
        else if (path.startsWith('/pantry/add/')) navigate('/pantry/add');
        else if (path.startsWith('/pantry/')) navigate('/pantry');
        else if (path.startsWith('/journal/')) navigate('/journal');
        else if (path.startsWith('/settings/')) navigate('/settings');
        else navigate('/home');
    }, [navigate, location.pathname]);
};
