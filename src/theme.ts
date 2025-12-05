import { createTheme, ThemeOptions } from '@mui/material/styles';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// Common theme options with strict enforcement of "Standard" (Underlined) style
const commonThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: inter.style.fontFamily,
  },
  components: {
    // 1. Enforce Underlined Inputs globally
    MuiTextField: {
      defaultProps: {
        variant: 'standard',
      },
      styleOverrides: {
        root: {
          marginBottom: '24px', // Consistent spacing
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        variant: 'standard',
      },
      styleOverrides: {
        root: {
          marginBottom: '24px',
        }
      }
    },
    MuiFormControl: {
      defaultProps: {
        variant: 'standard',
      },
      styleOverrides: {
        root: {
          marginBottom: '24px',
        }
      }
    },

    // 2. Elevated, Tactile Buttons (Not Flat)
    MuiButton: {
      defaultProps: {
        variant: 'contained', // Default to contained to avoid flat look
        disableElevation: false, // Ensure elevation is ON
      },
      styleOverrides: {
        root: {
          borderRadius: 25, // Pill shape - significantly different from boxy inputs
          textTransform: 'none', // Modern readable text
          fontWeight: 700,
          padding: '10px 24px',
          boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)', // Distinct shadow
          transition: 'all 0.15s ease',
          backgroundColor: '#1976d2', // Default fallback
          color: 'white', // High contrast
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)',
            backgroundColor: '#1565c0',
          },
        },
        contained: {
          backgroundColor: '#1976d2',
          color: 'white',
          '&:hover': {
            backgroundColor: '#1565c0',
          }
        },
        outlined: {
          backgroundColor: 'transparent',
          color: '#1976d2',
          borderWidth: 2,
          borderColor: '#1976d2',
          boxShadow: 'none', // Outlined usually has no shadow, but we can add minor if needed
        }
      },
    },

    // 3. Card/Paper Styling
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        },
        rounded: {
          borderRadius: 16, // Softer cards
        }
      }
    }
  },
};

// Light theme
export const lightTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Classic Blue
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f8f9fa', // Slight grey/off-white background
      paper: '#ffffff',
    },
  },
});

// Dark theme
export const darkTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});