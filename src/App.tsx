import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { QuickTimerPage } from './pages/QuickTimerPage';
import { RatioCalculatorPage } from './pages/RatioCalculatorPage';
import { SplashPage } from './pages/SplashPage';
import { WelcomePage } from './pages/WelcomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { BrewMethodsPage } from './pages/BrewMethodsPage';
import { RecipeListPage } from './pages/RecipeListPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RecipePreparationPage } from './pages/RecipePreparationPage';
import { BrewFlowPage } from './pages/BrewFlowPage';
import { BrewLogPage } from './pages/BrewLogPage';
import { JournalPage } from './pages/JournalPage';
import { JournalDetailPage } from './pages/JournalDetailPage';
import { PantryPage } from './pages/PantryPage';
import { PantryAddSelectionPage } from './pages/PantryAddSelectionPage';
import { PantryAddFormPage } from './pages/PantryAddFormPage';
import { PantryEditPage } from './pages/PantryEditPage';
import { RecipeEditPage } from './pages/RecipeEditPage';

import { SettingsPage } from './pages/SettingsPage';
import { BackupRestorePage } from './pages/BackupRestorePage';

import { DrinkMenuPage } from './pages/DrinkMenuPage';
import { DrinkDetailPage } from './pages/DrinkDetailPage';
import { DrinkPreparationPage } from './pages/DrinkPreparationPage';
import { DrinkLogPage } from './pages/DrinkLogPage';

function App() {
  return (
    <BrowserRouter>
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
        <Route path="/drinks/:id" element={<DrinkDetailPage />} />
        <Route path="/drinks/:id/prepare" element={<DrinkPreparationPage />} />
        <Route path="/drink-log/:id" element={<DrinkLogPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/backup" element={<BackupRestorePage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/quick-timer" element={<QuickTimerPage />} />
        <Route path="/ratio-calculator" element={<RatioCalculatorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
