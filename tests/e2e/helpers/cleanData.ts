import { Page } from '@playwright/test';

/**
 * Resets application state by clearing localStorage, sessionStorage, and IndexedDB databases.
 * Guarantees a fresh, isolated state before each E2E test run.
 */
export async function resetAppState(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
      try {
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      } catch (e) {
        console.warn('Failed to clear IndexedDB:', e);
      }
    }
  });
}
