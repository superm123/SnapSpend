import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Bank Statement Import E2E Flow', () => {
    test.setTimeout(180000); // 3 minutes timeout for OCR

    test.beforeEach(async ({ page }) => {
        // Clear IndexedDB before each test
        await page.goto('/');
        await page.evaluate(async () => {
            const { db } = await import('../src/lib/db');
            await db.delete();
            await db.open();
            // Seed categories
            await db.categories.bulkAdd([
                { id: 1, name: 'Groceries' },
                { id: 2, name: 'Utilities' },
                { id: 3, name: 'Other' },
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
            // Seed settings
            await db.settings.add({ id: 1, billingCycleStart: 1, currency: 'USD' });
        });

        // Set current user
        await page.evaluate(async () => {
            const { useStore } = await import('../src/lib/store');
            useStore.setState({ currentUser: { id: 1, name: 'Test User' } });
        });

        await page.goto('/import/bank-statement');
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    });

    test('should allow user to upload a PDF and display parsed transactions', async ({ page }) => {
        const filePath = 'e2e-tests/fixtures/statemnt.pdf';
        await page.setInputFiles('input[type="file"]', filePath);

        // Expect loading message (new OCR flow)
        // It might show "Reading PDF..." or "Extracting text layer..."
        await expect(page.locator('text=Reading PDF...').or(page.locator('text=Extracting text layer...'))).toBeVisible();

        // Wait for results (OCR taking time)
        await expect(page.locator('text=Parsed Transactions (')).toBeVisible({ timeout: 180000 });
        await expect(page.locator('table')).toBeVisible();

        const tableRows = page.locator('table tbody tr');
        expect(await tableRows.count()).toBeGreaterThan(0);
        await expect(tableRows.first()).toBeVisible();

        // Check columns
        const firstRow = tableRows.first();
        await expect(firstRow.locator('input').first()).toBeVisible(); // Date
        // The implementation uses inputs for all cells now
    });

    test('should allow editing and saving transactions', async ({ page }) => {
        const filePath = 'e2e-tests/fixtures/statemnt.pdf';
        await page.setInputFiles('input[type="file"]', filePath);

        // Wait for processing
        await expect(page.locator('text=Parsed Transactions (')).toBeVisible({ timeout: 180000 });

        // Ensure table is visible
        await expect(page.locator('table')).toBeVisible();

        // Edit first row
        const firstRow = page.locator('table tbody tr').first();
        // Index 1 is description (0 is date)
        const descriptionInput = firstRow.locator('td').nth(1).locator('input');
        const amountInput = firstRow.locator('td').nth(2).locator('input');

        await descriptionInput.fill('Edited Description');
        await amountInput.fill('987.65');

        // Select category
        await firstRow.locator('div[role="combobox"]').first().click(); // Category Select
        await page.getByRole('option', { name: 'Groceries' }).click();

        // Select payment method
        await firstRow.locator('div[role="combobox"]').last().click(); // Payment Method Select
        await page.getByRole('option', { name: 'Credit Card' }).click();

        // Import
        await page.getByRole('button', { name: 'Import All Transactions' }).click();

        // Success
        await expect(page.locator('text=Successfully imported')).toBeVisible();

        // Summary verify
        await page.goto('/summary');
        await expect(page.locator('text=Edited Description')).toBeVisible();
        await expect(page.locator('text=987.65')).toBeVisible();
    });
});
