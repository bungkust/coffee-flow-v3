import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import '@fontsource/material-symbols-outlined/400.css'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary';
import { dbService } from './core/database/sqlite';
import { seedInitialData } from './core/database/seeding';
import { settingsService } from './core/services';
import { Capacitor } from '@capacitor/core';

// 1. Bootstrapping DB and Web Components BEFORE React mounts
const bootstrapDb = async () => {
  try {
    const platform = Capacitor.getPlatform();

    // Safely setup the Web Component outside of the React Render cycle (Web only)
    if (platform === 'web') {
      let jeepEl = document.querySelector('jeep-sqlite');
      if (!jeepEl) {
        jeepEl = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepEl);
      }
      const { defineCustomElements: jeepSqlite } = await import('jeep-sqlite/loader');
      jeepSqlite(window);
      await customElements.whenDefined('jeep-sqlite');
    }

    // Initialize Database
    await dbService.initialize();
    await seedInitialData();

    // Resolve initial destination before React mounts so index.html pre-splash
    // transitions directly to Home/Welcome with zero intermediate splash blip.
    if (window.location.pathname === '/') {
      const done = await settingsService.isOnboardingComplete().catch(() => false);
      window.history.replaceState(null, '', done ? '/home' : '/welcome');
    }

    // 2. Safely mount React now that the DB is fully ready and Stencil component is attached
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );

  } catch (err) {
    console.error('App-level DB init error:', err);
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; background:white;">
          <p style="color:red; font-weight:bold;">Fatal Error: Database initialization failed.</p>
          <p>Please check the console for details.</p>
        </div>
      `;
    }
  }
};

bootstrapDb();
