import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';

const SplashPage = lazy(() => import('./pages/SplashPage').then(m => ({ default: m.SplashPage })));
const WelcomePage = lazy(() => import('./pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const BrewMethodsPage = lazy(() => import('./pages/BrewMethodsPage').then(m => ({ default: m.BrewMethodsPage })));
const RecipeListPage = lazy(() => import('./pages/RecipeListPage').then(m => ({ default: m.RecipeListPage })));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage').then(m => ({ default: m.RecipeDetailPage })));
const RecipePreparationPage = lazy(() => import('./pages/RecipePreparationPage').then(m => ({ default: m.RecipePreparationPage })));
const BrewFlowPage = lazy(() => import('./pages/BrewFlowPage').then(m => ({ default: m.BrewFlowPage })));
const BrewLogPage = lazy(() => import('./pages/BrewLogPage').then(m => ({ default: m.BrewLogPage })));
const JournalPage = lazy(() => import('./pages/JournalPage').then(m => ({ default: m.JournalPage })));
const JournalDetailPage = lazy(() => import('./pages/JournalDetailPage').then(m => ({ default: m.JournalDetailPage })));
const PantryPage = lazy(() => import('./pages/PantryPage').then(m => ({ default: m.PantryPage })));
const PantryAddSelectionPage = lazy(() => import('./pages/PantryAddSelectionPage').then(m => ({ default: m.PantryAddSelectionPage })));
const PantryAddFormPage = lazy(() => import('./pages/PantryAddFormPage').then(m => ({ default: m.PantryAddFormPage })));
const PantryEditPage = lazy(() => import('./pages/PantryEditPage').then(m => ({ default: m.PantryEditPage })));
const RecipeEditPage = lazy(() => import('./pages/RecipeEditPage').then(m => ({ default: m.RecipeEditPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BackupRestorePage = lazy(() => import('./pages/BackupRestorePage').then(m => ({ default: m.BackupRestorePage })));
const DrinkMenuPage = lazy(() => import('./pages/DrinkMenuPage').then(m => ({ default: m.DrinkMenuPage })));
const DrinkDetailPage = lazy(() => import('./pages/DrinkDetailPage').then(m => ({ default: m.DrinkDetailPage })));
const DrinkPreparationPage = lazy(() => import('./pages/DrinkPreparationPage').then(m => ({ default: m.DrinkPreparationPage })));
const DrinkLogPage = lazy(() => import('./pages/DrinkLogPage').then(m => ({ default: m.DrinkLogPage })));
const DrinkEditPage = lazy(() => import('./pages/DrinkEditPage').then(m => ({ default: m.DrinkEditPage })));
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage').then(m => ({ default: m.PlaygroundPage })));
const QuickTimerPage = lazy(() => import('./pages/QuickTimerPage').then(m => ({ default: m.QuickTimerPage })));
const RatioCalculatorPage = lazy(() => import('./pages/RatioCalculatorPage').then(m => ({ default: m.RatioCalculatorPage })));

function AndroidBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let listener: any = null;
    const setupListener = async () => {
      try {
        listener = await CapApp.addListener('backButton', () => {
          const rootPages = ['/home', '/welcome', '/', '/onboarding'];
          if (rootPages.includes(location.pathname)) {
            CapApp.exitApp();
          } else {
            navigate(-1);
          }
        });
      } catch (e) {
        console.warn('Capacitor App backButton listener failed:', e);
      }
    };
    setupListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [navigate, location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AndroidBackButtonHandler />
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center bg-background-light">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/brew-methods" element={<BrewMethodsPage />} />
          <Route path="/recipes" element={<RecipeListPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
          <Route path="/recipes/:id/prepare" element={<RecipePreparationPage />} />
          <Route path="/brew-flow" element={<BrewFlowPage />} />
          <Route path="/brew-log" element={<BrewLogPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/:type/:id" element={<JournalDetailPage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/pantry/add" element={<PantryAddSelectionPage />} />
          <Route path="/pantry/add/:category" element={<PantryAddFormPage />} />
          <Route path="/pantry/:id/edit" element={<PantryEditPage />} />
          <Route path="/drinks" element={<DrinkMenuPage />} />
          <Route path="/drinks/:id/edit" element={<DrinkEditPage />} />
          <Route path="/drinks/:id" element={<DrinkDetailPage />} />
          <Route path="/drinks/:id/prepare" element={<DrinkPreparationPage />} />
          <Route path="/drink-log/:id" element={<DrinkLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/backup" element={<BackupRestorePage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/quick-timer" element={<QuickTimerPage />} />
          <Route path="/ratio-calculator" element={<RatioCalculatorPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
