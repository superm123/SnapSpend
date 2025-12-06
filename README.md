# SnapSpend

SnapSpend is a complete, production-ready, 100% offline-first expense tracker built with Next.js 14+ (App Router). It is designed to be fast, private, and capable of handling receipt scanning with client-side OCR.

## Features

-   **100% Offline-First**: All data is stored locally using Dexie.js (IndexedDB). No internet connection required.
-   **Receipt Scanning**: Drag & drop or upload receipts for automatic line item extraction using Scribe.js (Client-side OCR).
-   **Manual Entry**: Quick and easy form for adding expenses manually.
-   **Dashboard & Analytics**: Visualize your spending with pie charts (Category breakdown) and bar charts (Payment method breakdown).
-   **Categories & Payment Methods**: Fully customizable categories and payment methods.
-   **Multi-User**: Support for "Family Mode" to track expenses by different users.
-   **Custom Billing Cycle**: configure your preferred billing cycle start day.
-   **Dark Mode**: Sleek, mobile-first UI with dark mode support.
-   **Bank Statement Import**: (Experimental) Client-side parsing of PDF bank statements.
-   **Cross-Platform**: Ready for deployment as a PWA, or wrapped for Android and iOS using Capacitor.

## Tech Stack

-   **Framework**: Next.js 14+ (App Router), TypeScript
-   **Styling**: Tailwind CSS, Shadcn UI, Lucide Icons, Recharts
-   **State Management**: Zustand
-   **Database**: Dexie.js (IndexedDB)
-   **Utilities**: date-fns, uuid, Scribe.js (OCR), react-pdf
-   **Testing**: Jest (Unit), Playwright (E2E)

## Getting Started

### Prerequisites

-   Node.js 18+ installed
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository_url>
    cd budget_planner
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

-   `npm run dev`: Runs the development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server.
-   `npm run test`: Runs unit tests using Jest.
-   `npm run test:e2e`: Runs end-to-end tests using Playwright.
-   `npm run cap:sync`: Syncs the web build with Capacitor for Android/iOS.

## Mobile Build (Android/iOS)

This project is configured with Capacitor.

1.  Build the web project:
    ```bash
    npm run build
    ```

2.  Sync with native platforms:
    ```bash
    npx cap sync
    ```

3.  Open in Android Studio or Xcode:
    ```bash
    npx cap open android
    # or
    npx cap open ios
    ```