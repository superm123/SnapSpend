import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Receipt Scanner Testing', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/scan');
    });

    test('should scan receipt 20251127_123443.jpg and extract data', async ({ page }) => {
        // Upload receipt image
        const filePath = path.resolve(__dirname, 'fixtures/receipts/20251127_123443.jpg');
        await page.setInputFiles('input[type="file"]', filePath);

        // Wait for image to load
        await expect(page.locator('img[alt="Receipt Preview"]')).toBeVisible();

        // Click Scan Receipt button
        await page.getByRole('button', { name: 'Scan Receipt' }).click();

        // Wait for OCR to complete (may take 10-30 seconds)
        await expect(page.getByRole('button', { name: /Processing/ })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Scan Receipt' })).toBeVisible({ timeout: 60000 });

        // Check if Place Name was auto-populated
        const placeNameInput = page.getByLabel('Where did you make this purchase?');
        const placeName = await placeNameInput.inputValue();
        console.log('Detected Place Name:', placeName);

        // Check if line items were extracted
        const lineItemsTable = page.locator('table');
        await expect(lineItemsTable).toBeVisible();

        const rowCount = await page.locator('table tbody tr').count();
        console.log('Extracted line items count:', rowCount);
        expect(rowCount).toBeGreaterThan(0);

        // Log extracted items for inspection
        for (let i = 0; i < rowCount; i++) {
            const row = page.locator('table tbody tr').nth(i);
            const description = await row.locator('td').nth(0).locator('input').inputValue();
            const amount = await row.locator('td').nth(1).locator('input').inputValue();
            console.log(`Item ${i + 1}: ${description} - R${amount}`);
        }

        // Optionally show raw OCR text
        await page.getByRole('button', { name: 'Show Raw OCR Result' }).click();
        const rawOcr = await page.locator('textarea[aria-label="Raw Extracted Text"]').inputValue();
        console.log('Raw OCR Text:', rawOcr);
    });

    test('should scan receipt 20251127_101212.jpg', async ({ page }) => {
        const filePath = path.resolve(__dirname, 'fixtures/receipts/20251127_101212.jpg');
        await page.setInputFiles('input[type="file"]', filePath);
        await expect(page.locator('img[alt="Receipt Preview"]')).toBeVisible();
        await page.getByRole('button', { name: 'Scan Receipt' }).click();
        await expect(page.getByRole('button', { name: 'Scan Receipt' })).toBeVisible({ timeout: 60000 });

        const placeNameInput = page.getByLabel('Where did you make this purchase?');
        const placeName = await placeNameInput.inputValue();
        console.log('[20251127_101212] Detected Place:', placeName);

        const rowCount = await page.locator('table tbody tr').count().catch(() => 0);
        console.log('[20251127_101212] Line items:', rowCount);
    });

    test('should scan receipt 20251205_112925.jpg', async ({ page }) => {
        const filePath = path.resolve(__dirname, 'fixtures/receipts/20251205_112925.jpg');
        await page.setInputFiles('input[type="file"]', filePath);
        await expect(page.locator('img[alt="Receipt Preview"]')).toBeVisible();
        await page.getByRole('button', { name: 'Scan Receipt' }).click();
        await expect(page.getByRole('button', { name: 'Scan Receipt' })).toBeVisible({ timeout: 60000 });

        const placeNameInput = page.getByLabel('Where did you make this purchase?');
        const placeName = await placeNameInput.inputValue();
        console.log('[20251205_112925] Detected Place:', placeName);

        const rowCount = await page.locator('table tbody tr').count().catch(() => 0);
        console.log('[20251205_112925] Line items:', rowCount);
    });
});
