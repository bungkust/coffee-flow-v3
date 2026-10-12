import { Page } from '@playwright/test';

/**
 * Resets application state by clearing localStorage, sessionStorage, and IndexedDB databases.
 * Guarantees a fresh, isolated state before each E2E test run.
 */
export async function resetAppState(page: Page) {
  await page.goto('/');

  // main.tsx only mounts React after DB init + seed complete, so a mounted
  // root means the startup saveToLocalStore() has settled. Deleting IndexedDB
  // before that lets the in-flight write re-create the database with stale data.
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return !!root && root.children.length > 0;
  });

  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
      try {
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          if (db.name) {
            await new Promise<void>((resolve) => {
              const request = window.indexedDB.deleteDatabase(db.name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            });
          }
        }
      } catch (e) {
        console.warn('Failed to clear IndexedDB:', e);
      }
    }
  });
}
