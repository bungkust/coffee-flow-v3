# Bug Report: BUG-003 — WelcomePage Premature Auto-Redirection to /home

## 📌 Summary
When navigating to `/welcome` to restore data on a fresh device or after app reset, `WelcomePage.tsx` evaluates user onboarding state inside `useEffect`. Because `settingsService.getUserName()` and `settingsService.getUserPreferredMethods()` return non-empty data from lingering SQLite in-memory connections before local storage clears finish, `WelcomePage` **prematurely redirects the user to `/home`**, preventing access to the **Restore Backup Data** button on the Welcome Screen.

---

## 🔍 Bug Details

- **Bug ID**: `BUG-003`
- **Status**: 🔴 **OPEN (Awaiting Manual Verification & Resolution)**
- **Affected File**: `src/pages/WelcomePage.tsx`
- **Severity**: **High (Blocks Restore Flow from Welcome Screen)**
- **Discovered By**: Playwright E2E Integration Suite (`tests/e2e/specs/full-user-lifecycle.spec.ts`)

---

## 🛑 Steps to Reproduce (Manual Verification)
1. Complete onboarding and create a profile name.
2. Clear `localStorage` and `sessionStorage` in the browser console.
3. Open `http://localhost:5174/welcome`.
4. Observe that `WelcomePage.tsx` immediately redirects back to `/home` because `settingsService.getUserName()` returns cached SQLite data in memory instead of rendering the Welcome Screen buttons.

---

## ⚡ Expected vs Actual Behavior

- **Expected Behavior**: Accessing `/welcome` on a fresh or reset device should stay on `/welcome` and display the **Start New Journey** and **Restore Backup Data** buttons.
- **Actual Behavior**: The page automatically bounces to `/home`, rendering `expect(page.getByText(/Start New Journey/i)).toBeVisible()` unreachable.

---

## 🛠️ Investigation Notes & Code References

1. **`src/pages/WelcomePage.tsx` (Lines 11–24)**:
   ```tsx
   useEffect(() => {
       const checkDone = async () => {
           try {
               const name = await settingsService.getUserName();
               const methods = await settingsService.getUserPreferredMethods();
               if (name && name.trim().length > 0 && methods && methods.length >= 1) {
                   navigate('/home', { replace: true });
               }
           } catch {
               // Ignore
           }
       };
       checkDone();
   }, [navigate]);
   ```
2. **Root Cause**:
   The `useEffect` in `WelcomePage` auto-redirects to `/home` without checking if the user explicitly navigated to `/welcome` to restore data.
