
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '../src/app/settings/page';
import { db } from '../src/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';

// Mock Next.js Link component to render as a plain anchor tag
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Next.js useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  })),
}));

// Mock dexie-react-hooks' useLiveQuery directly
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(),
}));

// Mock Dexie.js for settings operations
jest.mock('../src/lib/db', () => ({
  db: {
    settings: {
      get: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock lucide-react icons used in the component and its sub-components (like Select)
jest.mock('lucide-react', () => ({
  ChevronDown: jest.fn(() => <span>ChevronDownIcon</span>),
  Check: jest.fn(() => <span>CheckIcon</span>), // Mock the Check icon
}));

// Comprehensive mock for Shadcn UI Select components
jest.mock('../src/components/ui/select', () => {
  const React = require('react');
  const SelectPrimitive = require('@radix-ui/react-select');

  // Mock Select to manage its own state (open/closed)
  const MockSelect = ({ children, value, onValueChange }: any) => {
    const [open, setOpen] = React.useState(false);
    return (
      <SelectPrimitive.Root open={open} onOpenChange={setOpen} value={value} onValueChange={onValueChange}>
        {children}
      </SelectPrimitive.Root>
    );
  };

  const MockSelectTrigger = React.forwardRef<any, any>(({ children, ...props }, ref) => (
    <SelectPrimitive.Trigger ref={ref} {...props} data-testid="mock-select-trigger">
      {children}
    </SelectPrimitive.Trigger>
  ));
  MockSelectTrigger.displayName = 'MockSelectTrigger';

  const MockSelectValue = ({ children, placeholder }: any) => (
    <SelectPrimitive.Value data-testid="mock-select-value" placeholder={placeholder}>{children}</SelectPrimitive.Value>
  );

  const MockSelectContent = React.forwardRef<any, any>(({ children, ...props }, ref) => (
    // Render children directly, simulating that the portal content is in the DOM
    <div ref={ref} {...props} data-testid="mock-select-content">
      {children}
    </div>
  ));
  MockSelectContent.displayName = 'MockSelectContent';

  const MockSelectItem = React.forwardRef<any, any>(({ children, value, onClick, ...props }, ref) => (
    <div
      ref={ref}
      role="option"
      data-value={value}
      onClick={(e) => {
        // Simulate Radix UI SelectItem behavior: close dropdown and call onValueChange
        // The onValueChange is handled by the parent MockSelectPrimitive.Root
        // For testing purposes, we can simulate the click and rely on the value being passed
        if (onClick) onClick(e);
        // This is a simplified way. In a real scenario, you might want to call
        // the onValueChange prop of the Select component directly.
      }}
      {...props}
    >
      {children}
    </div>
  ));
  MockSelectItem.displayName = 'MockSelectItem';

  return {
    Select: MockSelect,
    SelectGroup: (props: any) => <div {...props} />, // Simple passthrough
    SelectValue: MockSelectValue,
    SelectTrigger: MockSelectTrigger,
    SelectContent: MockSelectContent,
    SelectLabel: (props: any) => <label {...props} />, // Simple passthrough
    SelectItem: MockSelectItem,
    SelectSeparator: (props: any) => <div {...props} />, // Simple passthrough
  };
});


describe('SettingsPage', () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
    // Default mock for useLiveQuery for settings.get(1)
    (useLiveQuery as jest.Mock).mockReturnValue({ id: 1, billingCycleStart: 20 });

    // Mock window.HTMLElement.prototype.scrollIntoView as it's not implemented in JSDOM
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it('renders without crashing', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    expect(screen.getByText('Billing Cycle')).toBeInTheDocument();
  });

  it('navigates to user management page when "Manage Users" button is clicked', () => {
    render(<SettingsPage />);
    const manageUsersLink = screen.getByRole('link', { name: 'Manage Users' });
    expect(manageUsersLink).toHaveAttribute('href', '/settings/users');
  });

  it('displays the current billing cycle start day', async () => {
    (useLiveQuery as jest.Mock).mockReturnValue({ id: 1, billingCycleStart: 10 });
    render(<SettingsPage />);
    // The SelectValue inside SelectTrigger should display the value
    const selectValue = screen.getByTestId('mock-select-value');
    expect(selectValue).toHaveTextContent('10');
  });

  