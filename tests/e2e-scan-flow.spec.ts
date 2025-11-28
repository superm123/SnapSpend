import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('E2E Receipt Scan, Edit, Save, and Summary Flow', () => {
  test('should successfully scan, edit, save expenses, and verify in summary', async ({ page }) => {
    // 1. Mock Tesseract.js worker
    // We'll expose a mock createWorker function that returns a worker with a predictable recognize method.
    await page.exposeFunction('mockCreateWorker', () => {
      return {
        load: () => Promise.resolve(),
        loadLanguage: () => Promise.resolve(),
        initialize: () => Promise.resolve(),
        recognize: (image: string) => {
          // Return a predictable OCR result for our mock image
          const mockText = `
            ITEM A      10.50
            ITEM B      20.00
            TOTAL       30.50
          `;
          return Promise.resolve({
            data: { text: mockText },
          });
        },
        terminate: () => Promise.resolve(),
      };
    });

    // Intercept the actual createWorker call and replace it with our mock
    await page.addInitScript(() => {
      // @ts-ignore
      window.createWorker = window.mockCreateWorker;
    });

    await page.goto('/scan');
    await expect(page.locator('h4', { hasText: 'Receipt Scanner' })).toBeVisible();

    // Fill Place Name
    await page.getByLabel('Where did you make this purchase?').fill('Mock Store');

    // 2. Upload the mock image
    const mockImagePath = path.resolve(__dirname, 'fixtures/mock-receipt.png');
    // We need to find the actual input element within the dropzone
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(mockImagePath);

    // 3. Click "Scan Receipt"
    await page.getByRole('button', { name: 'Scan Receipt' }).click();

    // 4. Wait for line items to appear
    await expect(page.locator('text=Extracted Line Items (Editable)')).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(2); // ITEM A and ITEM B

    // 5. Interact with editable table (edit first line item)
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('input[type="text"]').fill('Edited Item A'); // Edit description
    await firstRow.locator('input[type="number"]').fill('15.75'); // Edit amount

    // Select category (assuming "Groceries" is present with ID 2 based on seed data)
    await firstRow.locator('text=Select Category').click();
    await page.locator('li[data-value="2"]').click(); // Assuming Groceries has ID 2

    // Select payment method (assuming "Visa" is present with ID 2 based on seed data)
    await firstRow.locator('text=Select Method').click();
    await page.locator('li[data-value="2"]').click(); // Assuming Visa has ID 2

    // 6. Save Expenses
    await page.getByRole('button', { name: 'Save Expenses' }).click();

    // Expect success alert (Playwright auto-accepts alerts)
    await expect(page.locator('text=Expenses saved successfully!')).toBeVisible(); // Check for a visible success message

    // 7. Verify in Summary
    await page.goto('/summary'); // Navigate to summary page
    await expect(page.locator('h4', { hasText: 'Expense Summary' })).toBeVisible();

    // Check if the total expenses reflect the saved item (e.g., total includes 15.75)
    // This is a basic check; a more robust test would sum all expenses.
    await expect(page.locator('p:has-text("Total:")')).toContainText('15.75');

    // You might also check for the presence of "Edited Item A" in a list of expenses if available on summary
    // await expect(page.locator('text=Edited Item A')).toBeVisible(); // Requires a list of individual expenses on summary
  });
});
