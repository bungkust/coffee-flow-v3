import { Page, Locator, expect } from '@playwright/test';
import { resetAppState } from '../helpers/cleanData';

export class GearEditPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly brandInput: Locator;
  readonly materialSelect: Locator;
  readonly burrTypeSelect: Locator;
  readonly notesTextarea: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByPlaceholder(/Comandante C40|Ethiopia Yirgacheffe/i);
    this.brandInput = page.getByPlaceholder(/Fellow|Onyx Coffee Lab/i);
    this.materialSelect = page.locator('select');
    this.burrTypeSelect = page.locator('select');
    this.notesTextarea = page.getByPlaceholder('Any additional details...');
    this.saveButton = page.getByRole('button', { name: /Save Item/i });
  }

  async gotoNewGear(category: 'dripper' | 'grinder' | 'machine' | 'kettle' | 'scale' | 'french_press' | 'aeropress' | 'accessory' = 'dripper') {
    await resetAppState(this.page);
    await this.page.goto(`/pantry/add/${category}`);
  }

  async createGear(name: string, brand?: string, options?: { material?: string; burrType?: string; notes?: string }) {
    await expect(this.nameInput).toBeVisible();
    await this.nameInput.fill(name);

    if (brand) {
      await this.brandInput.fill(brand);
    }

    if (options?.material) {
      await this.materialSelect.selectOption(options.material);
    }

    if (options?.burrType) {
      await this.burrTypeSelect.selectOption(options.burrType);
    }

    if (options?.notes) {
      await this.notesTextarea.fill(options.notes);
    }

    await this.saveButton.click();
  }
}
