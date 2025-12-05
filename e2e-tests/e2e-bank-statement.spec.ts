import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Bank Statement Import E2E Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Clear IndexedDB before each test
        await page.goto('/'); // Navigate to a page to ensure Dexie is initialized in the browser context
        await page.evaluate(async () => {
            const { db } = await import('../src/lib/db'); // Import db within the browser context
            await db.delete();
            await db.open(); // Re-open after delete
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
            // Seed settings for billing cycle
            await db.settings.add({ id: 1, billingCycleStart: 1, currency: 'USD' });
        });

        // Set current user in Zustand store
        await page.evaluate(async () => {
            const { useStore } = await import('../src/lib/store'); // Import Zustand store
            useStore.setState({ currentUser: { id: 1, name: 'Test User' } });
        });

        await page.goto('/import/bank-statement');
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    });

    test('should allow user to upload a PDF and display parsed transactions', async ({ page }) => {
        // Upload dummy bank statement PDF
        const filePath = 'tests/fixtures/statemnt.pdf';
        await page.setInputFiles('input[type="file"]', filePath);

        // Expect loading message to appear and disappear
        await expect(page.locator('text=Extracting text from PDF, please wait...')).toBeVisible();
        await expect(page.locator('text=Extracting text from PDF, please wait...')).toBeHidden({ timeout: 30000 }); // Increased timeout for PDF processing

        // Expect raw extracted text to be visible
        await expect(page.locator('text=Raw Extracted Text:')).toBeVisible();
        await expect(page.locator('textarea[aria-label="Raw Extracted Text"]')).toBeVisible();
        await expect(page.locator('textarea[aria-label="Raw Extracted Text"]')).not.toBeEmpty();

        // Expect parsed transactions table to be visible
        await expect(page.locator('text=Parsed Transactions (')).toBeVisible();
        await expect(page.locator('table')).toBeVisible();

        // Verify at least one transaction row exists (basic check)
        const tableRows = page.locator('table tbody tr');
        expect(await tableRows.count()).toBeGreaterThan(0); // Check if there's at least one row + header
        await expect(tableRows.first()).toBeVisible();

        // Optionally, interact with the first transaction to ensure it's editable
        const firstRow = tableRows.first();
        await expect(firstRow.locator('input[value*="2025"]')).toBeVisible(); // Check for a date
        await expect(firstRow.locator('input[value*="Description"]')).toBeVisible(); // Check for description input
        await expect(firstRow.locator('input[value*="123.45"]')).toBeVisible(); // Check for amount input

        // Ensure "Import All Transactions" button is visible
        await expect(page.getByRole('button', { name: 'Import All Transactions' })).toBeVisible();
    });

    test('should allow editing and saving transactions', async ({ page }) => {
        // Upload dummy bank statement PDF
        const filePath = 'tests/fixtures/statemnt.pdf';
        await page.setInputFiles('input[type="file"]', filePath);

        // Wait for processing
        await expect(page.locator('text=Extracting text from PDF, please wait...')).toBeHidden({ timeout: 30000 });

        // Ensure table is visible
        await expect(page.locator('table')).toBeVisible();

        // Edit the first transaction's description and amount
        const firstRow = page.locator('table tbody tr').first();
        const descriptionInput = firstRow.locator('td').nth(1).locator('input');
        const amountInput = firstRow.locator('td').nth(2).locator('input');

        await descriptionInput.fill('Edited Description');
        await amountInput.fill('987.65');

        // Select category and payment method (using MUI Selects)
        // For Category
        await firstRow.locator('button[aria-label="Category"]').click();
        await page.getByRole('option', { name: 'Groceries' }).click();

        // For Payment Method
        await firstRow.locator('button[aria-label="Payment Method"]').click();
        await page.getByRole('option', { name: 'Credit Card' }).click();

        // Click "Import All Transactions" button
        await page.getByRole('button', { name: 'Import All Transactions' }).click();

        // Expect success message
        await expect(page.locator('text=Successfully imported')).toBeVisible();

        // Navigate to summary to verify (basic check as full verification is complex)
        await page.goto('/summary');
        await expect(page.locator('text=Edited Description')).toBeVisible();
        await expect(page.locator('text=987.65')).toBeVisible();
    });
});
