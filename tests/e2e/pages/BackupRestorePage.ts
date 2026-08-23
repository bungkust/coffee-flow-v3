import { Page, Locator, expect } from '@playwright/test';
import { resetAppState } from '../helpers/cleanData';

export class BackupRestorePage {
  readonly page: Page;
  readonly backupNowButton: Locator;
  readonly importFileButton: Locator;
  readonly restoreModalConfirmButton: Locator;
  readonly deleteModalConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backupNowButton = page.getByRole('button', { name: /Backup Now/i });
    this.importFileButton = page.getByRole('button', { name: /Import File/i });
    this.restoreModalConfirmButton = page.locator('.fixed.inset-0').getByRole('button', { name: 'Restore Data' });
    this.deleteModalConfirmButton = page.locator('.fixed.inset-0').getByRole('button', { name: 'Delete', exact: true });
  }

  async goto() {
    await resetAppState(this.page);
    await this.page.goto('/settings/backup');
  }

  async performBackupNow() {
    await expect(this.backupNowButton).toBeVisible();
    await this.backupNowButton.click();
    await expect(this.page.getByText(/Ready/i)).toBeVisible();
  }

  async exportLatestBackupSnapshot(): Promise<string> {
    return await this.page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('coffee_flow_backup_'));
      if (keys.length === 0) return '';

      let latestJson = '';
      let maxTimestamp = -1;
      for (const k of keys) {
        const str = localStorage.getItem(k);
        if (str) {
          try {
            const data = JSON.parse(str);
            const t = new Date(data.created_at || 0).getTime();
            if (t >= maxTimestamp) {
              maxTimestamp = t;
              latestJson = str;
            }
          } catch {
            // Ignore
          }
        }
      }
      return latestJson;
    });
  }

  async importBackupFile(jsonContent: string) {
    const fileInput = this.page.locator('input[type="file"][accept=".json"]');
    await fileInput.setInputFiles({
      name: 'coffee-flow-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(jsonContent),
    });

    const restoreNowButton = this.page.locator('.fixed.inset-0').getByRole('button', { name: 'Restore Now' });
    await expect(restoreNowButton).toBeVisible();
    await restoreNowButton.click();
  }

  async restoreFirstBackup() {
    const restoreButtons = this.page.getByRole('button', { name: 'Restore', exact: true });
    await expect(restoreButtons.first()).toBeVisible();
    await restoreButtons.first().click();

    // Confirm modal restore
    await expect(this.restoreModalConfirmButton).toBeVisible();
    await this.restoreModalConfirmButton.click();
  }

  async deleteFirstBackup() {
    const deleteButtons = this.page.getByTitle('Delete backup snapshot');
    await expect(deleteButtons.first()).toBeVisible();
    await deleteButtons.first().click();

    // Confirm modal delete
    await expect(this.deleteModalConfirmButton).toBeVisible();
    await this.deleteModalConfirmButton.click();
  }
}
