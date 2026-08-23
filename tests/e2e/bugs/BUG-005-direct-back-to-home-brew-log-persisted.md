# Bug Report: BUG-005 — Direct "Back to Home" Navigation Leaves Unconfirmed Brew Log Persisted in Journal

## 📌 Summary
When the brew timer completes on `BrewFlowPage.tsx`, the application automatically calls `brewService.logBrew(...)` to auto-save a default 5-star brew log into SQLite. On the **Done!** screen, if the user bypasses the logging screen by clicking **"Back to Home"** directly, `BrewFlowPage.tsx` clears the active state (`stopBrew()`) and navigates to `/home`. However, **the auto-saved database record is NOT deleted**, causing unconfirmed brew sessions to remain permanently saved in the user's brewing history (`/journal`).

---

## 🔍 Bug Details

- **Bug ID**: `BUG-005`
- **Status**: 🔴 **OPEN (Awaiting Manual Verification & Resolution)**
- **Affected Files**:
  - `src/pages/BrewFlowPage.tsx` (lines 127–146 & lines 274–279)
- **Severity**: **High (Unintended State Persistence)**
- **Discovered By**: User-Directed E2E Audit Scenario (`tests/e2e/specs/brew-calculation-and-log.spec.ts`)

---

## 🛑 Steps to Reproduce (Manual Verification)
1. Select any brewing recipe (e.g. `Kurasu Japanese Iced Pour-Over`).
2. Complete preparation and start the timer (`/brew-flow`).
3. Complete or fast-forward all steps until the **Done!** screen appears.
4. On the **Done!** screen (where *"Finish & Log Brew"* and *"Back to Home"* are shown), click **"Back to Home"**.
5. Observe navigation back to the Homepage (`/home`).
6. Open `http://localhost:5174/journal`.
7. **Observe**: The brew session is **still saved** in the Journal history list, despite the user explicitly choosing to skip the log flow and return home directly.

---

## ⚡ Expected vs Actual Behavior

- **Expected Behavior**: Clicking **"Back to Home"** from the **Done!** screen should either discard the unconfirmed auto-saved draft (`brewService.deleteLog(logId)`), OR prompt the user whether to save or discard before returning home.
- **Actual Behavior**: Clicking **"Back to Home"** silently retains the auto-saved `brew_logs` record in SQLite and leaves it permanently listed under `/journal`.

---

## 🛠️ Code Reference (`src/pages/BrewFlowPage.tsx`)

```tsx
// Lines 274-279:
<button
    onClick={() => {
        // MISSING: Optional deletion of autoSavedLogId if user skips logging
        stopBrew();
        navigate('/home');
    }}
    className="..."
>
    Back to Home
</button>
```
