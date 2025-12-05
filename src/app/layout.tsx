
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers'; // Import the Providers component
import Navbar from '@/components/Navbar'; // Import the Navbar component

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Budget Planner',
  description: 'Expense tracking application',
};

export const viewport: Viewport = {
  themeColor: 'black',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Navbar /> {/* Render the Navbar */}
          {children}
        </Providers>
      </body>
    </html>
  );
}

