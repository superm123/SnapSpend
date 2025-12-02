'use client';

declare global {
  interface Window {
    Capacitor?: {
      isNative: boolean;
      isPluginAvailable: (pluginName: string) => boolean;
      platform: string;
      [key: string]: any;
    };
  }
}

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { ThemeProvider, useTheme } from 'next-themes'; // Import useTheme
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import { StatusBar, Style } from '@capacitor/status-bar'; // Import StatusBar

export function Providers({ children }: { children: React.ReactNode }) {
  const { init } = useStore(); // Destructure init from useStore

  useEffect(() => {
    init(); // Call init function to initialize state
  }, [init]);



  const { theme } = useTheme();

  useEffect(() => {
    // Only apply status bar style in Capacitor environment
    if (typeof window !== 'undefined' && window.Capacitor) {
      if (theme === 'dark') {
        StatusBar.setStyle({ style: Style.Dark }); // Use Style.Dark for dark theme (light text/icons)
        StatusBar.setBackgroundColor({ color: '#121212' }); // Explicit dark background color from theme
        StatusBar.setOverlaysWebView({ overlay: false }); // Ensure it's a distinct bar
      } else {
        StatusBar.setStyle({ style: Style.Light }); // Use Style.Light for light theme (dark text/icons)
        StatusBar.setBackgroundColor({ color: '#f5f5f5' }); // Explicit light background color from theme
        StatusBar.setOverlaysWebView({ overlay: false }); // Ensure it's a distinct bar
      }
    }
  }, [theme]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeRegistry>
        {children}
      </ThemeRegistry>
    </ThemeProvider>
  );
}