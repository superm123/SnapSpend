'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  useMediaQuery,
  useTheme as useMuiTheme,
  Stack,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Scan, Plus, List as ListIcon, CreditCard, Settings, BarChart } from 'lucide-react'; // Use List as ListIcon to avoid conflict
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/', label: 'Home', icon: ListIcon },
  { href: '/scan', label: 'Scan', icon: Scan },
  { href: '/add', label: 'Add Expense', icon: Plus },
  { href: '/categories', label: 'Categories', icon: ListIcon },
  { href: '/payments', label: 'Payment Methods', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/summary', label: 'Summary', icon: BarChart },
  { href: '/history', label: 'History', icon: ListIcon },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        SnapSpend
      </Typography>
      <List>
        {navLinks.map((link) => (
          <ListItem key={link.href} disablePadding>
            <ListItemButton
              component={Link}
              href={link.href}
              selected={pathname === link.href}
              sx={{
                justifyContent: 'flex-start',
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                },
              }}
            >
              <link.icon style={{ marginRight: '8px', width: 20, height: 20, color: muiTheme.palette.text.primary }} />
              <ListItemText primary={link.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <AppBar position="sticky" elevation={1} sx={{ bgcolor: '#000080', borderBottom: 1, borderColor: 'divider', paddingTop: 'env(safe-area-inset-top)' }}>
      <Toolbar>
        {isMobile && (
          <IconButton
            sx={{ mr: 2 }} // Explicitly set color
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
          
            fontWeight: 'bold',
          }}
        >
          SnapSpend
        </Typography>

        {!isMobile && (
          <Stack direction="row" spacing={2} sx={{ flexGrow: 1, justifyContent: 'flex-start', ml: 4 }}>
            {navLinks.map((link) => (
              <Button
                key={link.href}
                component={Link}
                href={link.href}
                sx={{
                  color: pathname === link.href ? 'primary.main' : 'text.primary',
                  fontWeight: pathname === link.href ? 'bold' : 'normal',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <link.icon style={{ marginRight: '4px', width: 18, height: 18, color: muiTheme.palette.text.primary }} />
                {link.label}
              </Button>
            ))}
          </Stack>
        )}

                  <IconButton
                    sx={{ ml: 2, color: muiTheme.palette.text.primary }} // Explicitly set color
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      </Toolbar>
    </AppBar>
  );
}