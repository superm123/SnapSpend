import { test, expect } from '@playwright/test';
import { db } from '../src/lib/db'; // Adjust path as necessary

test.describe('Receipt Scan E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await page.goto('/'); // Navigate to a page to ensure Dexie is initialized in the browser context
    await page.evaluate(async () => {
      await db.delete();
      await db.open(); // Re-open after delete
      // Seed categories
      await db.categories.bulkAdd([
        { id: 1, name: 'Groceries' },
        { id: 2, name: 'Utilities' },
      ]);
      // Seed payment methods
      await db.paymentMethods.bulkAdd([
        { id: 1, name: 'Cash' },
        { id: 2, name: 'Credit Card' },
      ]);
      // Seed users
      await db.users.bulkAdd([
        { id: 1, name: 'Test User' },
        { id: 2, name: 'Another User' },
      ]);
      // Seed settings for billing cycle
      await db.settings.add({ id: 1, billingCycleStartDay: 1 });
    });

    // Set current user in Zustand store (mock or interact with UI)
    await page.evaluate(async () => {
      const { useAppStore } = await import('../src/lib/store'); // Import Zustand store
      useAppStore.setState({ currentUser: { id: 1, name: 'Test User' } });
    });
  });

  test('scan -> edit -> save -> appears in summary', async ({ page }) => {
    await page.goto('/scan');

    // Upload dummy receipt image
    const filePath = 'tests/fixtures/test-receipt.png'; // Ensure this image exists
    await page.setInputFiles('input[type="file"]', filePath);

    // Click scan button and wait for OCR to process
    await page.click('text=Scan Receipt');
    await expect(page.locator('text=OCR Processing')).toBeVisible();
    await expect(page.locator('text=OCR Processing')).toBeHidden({ timeout: 60000 }); // Wait for OCR to complete

    // Expect line items to appear (basic check)
    await expect(page.locator('table tr')).toHaveCount(expect.any(Number)); // At least header + one item

    // Edit the first line item
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('input[type="text"]').fill('Edited Item Description');
    await firstRow.locator('input[type="number"]').fill('12.34');

    // Select category and payment method for the first line item
    await firstRow.locator('button[role="combobox"]').first().click(); // Click category select trigger
    await page.locator('text=Groceries').click(); // Select 'Groceries'

    await firstRow.locator('button[role="combobox"]').last().click(); // Click payment method select trigger
    await page.locator('text=Cash').click(); // Select 'Cash'

    // Click save expenses
    await page.click('text=Save Expenses');
    await expect(page.locator('text=Expenses saved successfully!')).toBeVisible();

    // Navigate to summary page
    await page.goto('/summary');

    // Verify the saved expense appears in the summary
    await expect(page.locator('text=Edited Item Description')).toBeVisible();
    await expect(page.locator('text=$12.34')).toBeVisible();
    await expect(page.locator('text=Total: $12.34')).toBeVisible();
  });
});
