import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { dbService } from './core/database/sqlite';
import { seedInitialData } from './core/database/seeding';
import { defineCustomElements as capacitorSqliteShowcase } from 'jeep-sqlite/loader';

capacitorSqliteShowcase(window);

const Root = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await dbService.initialize();
        await seedInitialData();
        setIsReady(true);
      } catch (err) {
        console.error('App-level DB init error:', err);
      }
    };
    initDb();
  }, []);

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-coffee-medium font-medium animate-pulse">Initializing CoffeeFlow...</p>
      </div>
    );
  }

  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
};

createRoot(document.getElementById('root')!).render(<Root />)
