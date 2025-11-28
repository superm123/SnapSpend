import { test, expect } from '@playwright/test';

test.describe('New Features E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(async () => {
      globalThis.TransformStream = await import('web-streams-polyfill/es2018').then(m => m.TransformStream);
    });
    // Navigate to the root of the app
    await page.goto('http://localhost:3000/');
  });

  test('should display the "Scan with Camera" button on the scan page', async ({ page }) => {
    // Navigate to the scan page
    await page.click('text=Scan');

    // Check if the "Scan with Camera" button is visible
    const cameraButton = page.locator('button:has-text("Scan with Camera")');
    await expect(cameraButton).toBeVisible();
  });

  test('should allow removing a line item from the list', async ({ page }) => {
    await page.goto('http://localhost:3000/scan');

    // Mock file upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('.MuiBox-root > input:first-child').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/mock-receipt.png');

    // Click the scan button
    await page.click('button:has-text("Scan Receipt")');

    // Wait for the OCR to finish and the line items to appear
    await page.waitForSelector('text=Extracted Line Items', { timeout: 60000 });

    // Get the initial number of line items
    const initialLineItems = await page.locator('table tbody tr').count();
    expect(initialLineItems).toBeGreaterThan(0);

    // Click the delete button on the first line item
    await page.locator('table tbody tr:first-child button[aria-label="delete"]').click();

    // Get the new number of line items
    const newLineItems = await page.locator('table tbody tr').count();
    expect(newLineItems).toBe(initialLineItems - 1);
  });

  test('should navigate to the history page and filter expenses by date', async ({ page }) => {
    // Navigate to the history page
    await page.click('text=History');
    await expect(page).toHaveURL('http://localhost:3000/history');

    // Check if the title is correct
    await expect(page.locator('h1')).toHaveText('Expense History');

    // Get the initial number of expenses
    const initialExpenseCount = await page.locator('table tbody tr').count();

    // Change the start date to a long time ago
    await page.locator('input[type="date"]').first().fill('2000-01-01');

    // Get the new number of expenses
    const newExpenseCount = await page.locator('table tbody tr').count();
    expect(newExpenseCount).toBeGreaterThanOrEqual(initialExpenseCount);
  });

  test('should trigger a download when "Export to CSV" is clicked', async ({ page }) => {
    // Navigate to the history page
    await page.goto('http://localhost:3000/history');

    // Wait for the download event
    const downloadPromise = page.waitForEvent('download');

    // Click the export button
    await page.click('button:has-text("Export to CSV")');

    // Wait for the download to complete
    const download = await downloadPromise;

    // Check if the download is successful
    expect(download).not.toBeNull();
    expect(download.url()).toContain('blob:');
  });
});
