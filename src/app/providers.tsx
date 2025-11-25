'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { ThemeProvider } from 'next-themes';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';

export function Providers({ children }: { children: React.ReactNode }) {
  const { init } = useStore(); // Destructure init from useStore

  useEffect(() => {
    init(); // Call init function to initialize state
  }, [init]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeRegistry>
        {children}
      </ThemeRegistry>
    </ThemeProvider>
  );
}