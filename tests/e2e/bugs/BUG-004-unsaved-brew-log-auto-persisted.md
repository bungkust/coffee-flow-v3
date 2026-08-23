# Bug Report: BUG-004 — Discarded Brew Session Permanently Saved in Journal Database

## 📌 Summary
When completing a brewing timer session in `BrewFlowPage.tsx`, the application automatically saves a default brew log entry into the SQLite database (`brew_logs` table). On the subsequent Brew Log screen (`/brew-log`), if the user explicitly clicks **Discard** (confirming *"Your rating and notes will not be saved"*), `BrewLogPage.tsx` navigates to `/home` **without removing the auto-saved database entry**. As a result, discarded brew sessions are permanently saved in the user's brewing history (`/journal`).

---

## 🔍 Bug Details

- **Bug ID**: `BUG-004`
- **Status**: 🔴 **OPEN (Awaiting Manual Verification & Resolution)**
- **Affected Files**:
  - `src/pages/BrewFlowPage.tsx` (lines 123–146)
  - `src/pages/BrewLogPage.tsx` (lines 144–147)
- **Severity**: **High (Data Privacy & Incorrect State Persistence)**
- **Discovered By**: Playwright E2E Integration Suite (`tests/e2e/specs/brew-calculation-and-log.spec.ts`)

---

## 🛑 Steps to Reproduce (Manual Verification)
1. Select any brewing recipe (e.g. `Kurasu Japanese Iced Pour-Over`).
2. Complete the preparation checklist and click **I'm Ready, Start Timer**.
3. Fast-forward or complete all brew steps until the **Done!** screen appears.
4. Click **Finish & Log Brew** to navigate to `/brew-log`.
5. On the *"How was it?"* screen, click **Discard** at the bottom.
6. Confirm the modal by clicking **Discard Log**.
7. Open `http://localhost:5174/journal`.
8. Observe that the discarded brew session is **still present** in the Journal history list.

---

## ⚡ Expected vs Actual Behavior

- **Expected Behavior**: When clicking **Discard Log**, any auto-saved draft or record for the current brew session should be deleted from `brew_logs` in SQLite and removed from `sessionStorage`.
- **Actual Behavior**: `confirmDiscard()` in `BrewLogPage.tsx` only calls `stopBrew(); navigate('/home')`, leaving the auto-saved log entry permanently stored in the database.

---

## 🛠️ Investigation Notes & Code References

1. **`src/pages/BrewFlowPage.tsx` (Lines 127–146)**:
   ```tsx
   if (engineState.isCompleted && !isAutoSavedRef.current) {
       isAutoSavedRef.current = true;
       brewService.logBrew(
           activeRecipe.id,
           5,
           'Auto-saved brew session',
           ...
       ).then((logId) => {
           sessionStorage.setItem('coffee_flow_last_logged_id', logId);
       });
   }
   ```

2. **`src/pages/BrewLogPage.tsx` (Lines 144–147)**:
   ```tsx
   const confirmDiscard = () => {
       // MISSING: brewService.deleteLog(autoSavedLogId)
       sessionStorage.removeItem('coffee_flow_last_logged_id');
       stopBrew();
       navigate('/home');
   };
   ```
   Calling `brewService.deleteLog(autoSavedLogId)` before navigating away will properly purge discarded brew logs from SQLite history!
