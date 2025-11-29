import { test, expect } from '@playwright/test';

test.describe('Receipt Format E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      globalThis.TransformStream = globalThis.TransformStream || class TransformStream {};
    });
    // Navigate to the scan page
    await page.goto('http://localhost:3000/scan');
  });

  test('should extract line items from a standard receipt', async ({ page }) => {
    // Mock file upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('.MuiBox-root > input:first-child').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/mock-receipt.png');

    // Click the scan button
    await page.click('button:has-text("Scan Receipt")');

    // Wait for the OCR to finish and the line items to appear
    await page.waitForSelector('text=Extracted Line Items', { timeout: 60000 });

    // Check if line items were extracted
    const lineItems = await page.locator('table tbody tr').count();
    expect(lineItems).toBeGreaterThan(0);
  });

  test('should extract the total from a slip with no line items', async ({ page }) => {
    // This test requires a "mock-slip.png" file in "tests/fixtures/"
    // The slip should contain a total amount but no itemized list.
    // For example: "TOTAL: $25.00"

    // Mock file upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('.MuiBox-root > input:first-child').click();
    const fileChooser = await fileChooserPromise;
    try {
      await fileChooser.setFiles('tests/fixtures/mock-slip.png');
    } catch (error) {
      console.log('Could not find tests/fixtures/mock-slip.png, skipping test. Please provide this file.');
      test.skip(true, 'Skipping test because mock-slip.png is not available.');
      return;
    }

    // Click the scan button
    await page.click('button:has-text("Scan Receipt")');

    // Wait for the OCR to finish and the line items to appear
    await page.waitForSelector('text=Extracted Line Items', { timeout: 60000 });

    // Check if a single line item was extracted with the total amount
    const lineItems = await page.locator('table tbody tr').count();
    expect(lineItems).toBe(1);

    const description = await page.locator('table tbody tr:first-child td:first-child input').inputValue();
    const amount = await page.locator('table tbody tr:first-child td:nth-child(2) input').inputValue();

    expect(description.toLowerCase()).toContain('total');
    expect(amount).toBe('25.00');
  });
});
