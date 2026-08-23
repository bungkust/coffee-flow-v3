import { test, expect } from '@playwright/test';
import { BackupRestorePage } from '../pages/BackupRestorePage';

test.describe('Backup & Restore E2E Test Suite', () => {
  let backupPage: BackupRestorePage;

  test.beforeEach(async ({ page }) => {
    backupPage = new BackupRestorePage(page);
    await backupPage.goto();
  });

  test('Scenario 1: Perform Local Backup & Verify Snapshot List Creation', async ({ page }) => {
    // Perform Backup
    await backupPage.performBackupNow();

    // Verify Backup Status and Snapshot Card
    await expect(page.getByText(/Ready/i)).toBeVisible();
    await expect(page.getByText('Backup Snapshots')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore' })).toBeVisible();
  });

  test('Scenario 2: Restore Data from Snapshot & Redirect to Home', async ({ page }) => {
    // Perform Backup
    await backupPage.performBackupNow();

    // Restore Backup Snapshot
    await backupPage.restoreFirstBackup();

    // Verify Navigation to Home
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/.*home/);
  });

  test('Scenario 3: Delete Backup Snapshot & Verify List Update', async ({ page }) => {
    // Perform Backup
    await backupPage.performBackupNow();

    // Delete Backup Snapshot
    await backupPage.deleteFirstBackup();

    // Verify List shows empty message
    await expect(page.getByText('No backup history available')).toBeVisible();
  });
});
