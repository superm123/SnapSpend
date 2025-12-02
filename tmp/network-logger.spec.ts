import { test, expect } from '@playwright/test';

test('log network requests on /scan page', async ({ page }) => {
  const tesseractUrls: string[] = [];

  page.on('request', request => {
    // Log all requests, but specifically capture Tesseract-related ones
    console.log(`Request: ${request.method()} ${request.url()}`);
    if (request.url().includes('tesseract.js') || request.url().includes('tesseract-core') || request.url().includes('traineddata')) {
      tesseractUrls.push(request.url());
    }
  });

  page.on('response', async response => {
    // Log only failed responses or significant ones
    if (!response.ok()) {
      console.error(`Response failed: ${response.status()} ${response.url()}`);
    }
  });

  await page.goto('http://localhost:3000/scan', { waitUntil: 'networkidle' });

  // Give some time for all dynamic requests (like Tesseract workers) to complete
  await page.waitForTimeout(5000);

  console.log('\n--- Captured Tesseract-related URLs ---');
  if (tesseractUrls.length > 0) {
    tesseractUrls.forEach(url => console.log(url));
  } else {
    console.log('No Tesseract-related URLs captured.');
  }

  // Expect at least one Tesseract-related URL to be captured to ensure the page loaded as expected
  expect(tesseractUrls.length).toBeGreaterThan(0);
});
