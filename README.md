Build a complete, production-ready, 100% offline-first Next.js 14+ (App Router) expense tracker called "SnapSend".
App ID: za.snapsend
MANDATORY TECH STACK:- Next.js 14+ App Router + TypeScript- Tailwind CSS + MUI + Lucide icons- Recharts (pie + bar)- Tesseract.js (client-side OCR)- Dexie.js (IndexedDB)- Zustand- date-fns + uuid
EXACT REQUIRED FEATURES (implement ALL):1. Receipt scanner page (/scan)   
- Drag-drop or file picker   
- Tesseract.js OCR → auto extract line items (description + amount) using regex   - Editable table (edit desc/amount/category inline)   - Save receipt image as base
 - NEW FEATURE - group lite items in bills record name of place as well
 - NEW FEATURE -figure out the category based on previous use
2. Manual add expense page (/add)
3. Categories & Payment Methods pages (full CRUD)   - Pre-seeded: Fuel, Groceries, Medical, Other   - Payments: Cash, Visa, Mastercard
4. Multi-user (family mode)   - Settings → add/remove users (name only)   - Every expense has "addedBy"
5. Custom billing cycle (default 20th → 19th next month)   - Settings → change start day (1–31)   - All summaries respect current cycle
6. Dashboard (/summary)   - Big total for current cycle   - Pie chart: category breakdown   - Bar chart: payment method breakdown
7. 100% offline with Dexie.js (IndexedDB)   - Tables: expenses, categories, paymentMethods, users, settings
8. Full test suite   - Jest + RTL unit & component tests   - Playwright E2E test for: scan → edit → save → appears in summary
9. Add more categories that make sense
Exact folder structure:src/app/(routes)/(scan|add|summary|categories|payments|settings)/page.tsxsrc/components/ui → shadcnsrc/lib/db.ts (Dexie)src/lib/store.ts (Zustand)src/lib/utils/customMonth.ts
Mobile-first, dark mode, clean UI, no auth, no backend.
Output the ENTIRE working project (all files + code) in one response.Include working Tesseract OCR with realistic regex parsing.Include seed data on first load.No extra features. No questions. No explanations.
Generate the full SnapSpend app now.
Include IOS and Android Build plans

Record Progress in PROGRESS.md dont overwrite whats already there.

DOnt consider project done if it compiles it needs to be 100% functional

When runnign test use the PW_TEST_HTML_REPORT_OPEN = "never" variable to avoid getting stuck
 $env:PW_TEST_HTML_REPORT_OPEN = "never"
>>
>> # Run Playwright tests
>> npx playwright test