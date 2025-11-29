import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
      add: jest.fn(), // Add the missing mock for 'add'
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
  const SelectPrimitive = require('@radix-ui/react-select'); // Retain Radix types

  // We need to simulate the context provided by SelectPrimitive.Root
  // to allow SelectItem to call onValueChange
  const MockSelectContext = React.createContext({ onValueChange: (value: string) => {} });

  const MockSelect = ({ children, value, onValueChange }: any) => {
    // Simulate the internal state of Radix Select for open/close
    const [open, setOpen] = React.useState(false);

    // Pass onValueChange and value through context so SelectItem can access it
    const contextValue = React.useMemo(() => ({ onValueChange, value }), [onValueChange, value]);

    return (
      <SelectPrimitive.Root open={open} onOpenChange={setOpen} value={value} onValueChange={onValueChange}>
        <MockSelectContext.Provider value={contextValue}>
          {children}
        </MockSelectContext.Provider>
      </SelectPrimitive.Root>
    );
  };

  const MockSelectTrigger = React.forwardRef<any, any>(({ children, ...props }, ref) => (
    <SelectPrimitive.Trigger ref={ref} {...props} data-testid="mock-select-trigger">
      {children}
    </SelectPrimitive.Trigger>
  ));
  MockSelectTrigger.displayName = 'MockSelectTrigger';

  const MockSelectValue = ({ children, placeholder }: any) => {
    const { value } = React.useContext(MockSelectContext);
    console.log('MockSelectValue value:', value);
    return (
      <SelectPrimitive.Value data-testid="mock-select-value" placeholder={placeholder}>
        {value || children || placeholder}
      </SelectPrimitive.Value>
    );
  };

  const MockSelectContent = React.forwardRef<any, any>(({ children, ...props }, ref) => (
    // Render children directly, simulating that the portal content is in the DOM
    <div ref={ref} {...props} data-testid="mock-select-content">
      {children}
    </div>
  ));
  MockSelectContent.displayName = 'MockSelectContent';

  const MockSelectItem = React.forwardRef<any, any>(({ children, value, onClick, ...props }, ref) => {
    const { onValueChange } = React.useContext(MockSelectContext); // Get onValueChange from our mock context
    return (
      <div
        ref={ref}
        role="option"
        data-value={value}
        onClick={(e) => {
          // Simulate Radix UI SelectItem behavior: call onValueChange from context
          if (onValueChange) onValueChange(value);
          if (onClick) onClick(e);
        }}
        {...props}
      >
        {children}
      </div>
    );
  });
  MockSelectItem.displayName = 'MockSelectItem';

  return {
    Select: MockSelect,
    SelectGroup: (props: any) => <div {...props} />,
    SelectValue: MockSelectValue,
    SelectTrigger: MockSelectTrigger,
    SelectContent: MockSelectContent,
    SelectLabel: (props: any) => <label {...props} />,
    SelectItem: MockSelectItem,
    SelectSeparator: (props: any) => <div {...props} />,
  };
});


describe('SettingsPage', () => {
  const mockRouterPush = jest.fn();
  // Variable to control the settings returned by db.settings.get and useLiveQuery
  let mockedSettings: { id: number; billingCycleStart: number; currency?: string } | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSettings = { id: 1, billingCycleStart: 20, currency: 'USD' }; // Default mock settings

    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
    // Make useLiveQuery react to changes in mockedSettings
    (useLiveQuery as jest.Mock).mockImplementation((queryFn) => {
      // For initial render, return the current state of mockedSettings directly.
      // We are not simulating live updates from Dexie here, just the initial fetch.
      return mockedSettings;
    });

    // Mock db.settings.get to return the current mockedSettings state
    (db.settings.get as jest.Mock).mockImplementation((id) => {
      return Promise.resolve(mockedSettings);
    });

    // Mock db.settings.update to modify mockedSettings and resolve
    (db.settings.update as jest.Mock).mockImplementation((id, changes) => {
        mockedSettings = { ...mockedSettings, ...changes };
        return Promise.resolve(true); // Indicate successful update
    });

    // Mock db.settings.add
    (db.settings.add as jest.Mock).mockImplementation((settings) => {
        mockedSettings = { ...settings, id: 1 }; // Assume id 1 for added settings
        return Promise.resolve(1);
    });

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
    // Find the select trigger by its associated label
    const selectTrigger = screen.getByLabelText('Cycle starts on day:');
    // The SelectValue inside SelectTrigger should display the value
    const selectValueSpan = within(selectTrigger).getByTestId('mock-select-value');
    expect(selectValueSpan).toHaveTextContent('10');
  });

  it('updates the billing cycle start day', async () => {
    let currentBillingCycleStart = 20;
    (useLiveQuery as jest.Mock).mockReturnValue({ id: 1, billingCycleStart: currentBillingCycleStart });
    render(<SettingsPage />);

    // Mock the db.settings.update to simulate actual update and re-render
    (db.settings.update as jest.Mock).mockImplementation((id, changes) => {
      currentBillingCycleStart = changes.billingCycleStart;
      // Simulate re-render by updating the mockReturnValue of useLiveQuery
      (useLiveQuery as jest.Mock).mockReturnValueOnce({ id: 1, billingCycleStart: currentBillingCycleStart });
      return Promise.resolve();
    });

    // Open the select dropdown
    const comboboxTrigger = screen.getByLabelText('Cycle starts on day:');
    fireEvent.click(comboboxTrigger);

    // Select a new value
    const optionToSelect = await screen.findByRole('option', { name: '5' });
    fireEvent.click(optionToSelect);

    await waitFor(() => {
      expect(db.settings.update).toHaveBeenCalledWith(1, { billingCycleStart: 5 });
    });
  });

  it('does not update billing cycle if value is invalid', async () => {
    let currentBillingCycleStart = 20;
    (useLiveQuery as jest.Mock).mockReturnValue({ id: 1, billingCycleStart: currentBillingCycleStart });
    render(<SettingsPage />);

    // Mock the db.settings.update to simulate actual update and re-render
    (db.settings.update as jest.Mock).mockImplementation((id, changes) => {
      // In this test, we expect it NOT to be called, so this implementation shouldn't run.
      return Promise.resolve();
    });

    // Open the select dropdown
    const comboboxTrigger = screen.getByLabelText('Cycle starts on day:');
    fireEvent.click(comboboxTrigger);

    // Click the same value again (which should not trigger an update)
    const optionToSelect = await screen.findByRole('option', { name: '20' });
    fireEvent.click(optionToSelect);

    await waitFor(() => {
      expect(db.settings.update).not.toHaveBeenCalled();
    });
  });
});