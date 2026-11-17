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

    // Initialize Database with retry
    let dbInitSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await dbService.initialize();
        dbInitSuccess = true;
        break;
      } catch (err) {
        console.warn(`Database init attempt ${attempt} failed:`, err);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 200 * attempt));
        }
      }
    }

    if (!dbInitSuccess) {
      throw new Error('Database initialization failed after retries');
    }

    // Seeding is non-fatal: app can still mount and run if seeding encounters an issue
    try {
      await seedInitialData();
    } catch (seedErr) {
      console.warn('Seeding non-fatal warning:', seedErr);
    }

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
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; padding:24px; text-align:center; font-family:sans-serif; background:#FBF9F5; color:#1C1B1A;">
          <div style="width:64px; height:64px; border-radius:50%; background:#FEE2E2; display:flex; align-items:center; justify-content:center; margin-bottom:16px;">
            <span style="color:#DC2626; font-size:32px;">⚠️</span>
          </div>
          <h2 style="font-size:20px; font-weight:700; margin:0 0 8px;">Database Setup</h2>
          <p style="color:#78716C; font-size:14px; max-width:320px; margin:0 0 24px; line-height:1.5;">We encountered an issue preparing local storage. Tap below to reload.</p>
          <button onclick="window.location.reload()" style="background:#5B3E2B; color:white; border:none; padding:12px 24px; border-radius:12px; font-weight:600; font-size:14px; cursor:pointer;">Retry</button>
        </div>
      `;
    }
  }
};

bootstrapDb();
