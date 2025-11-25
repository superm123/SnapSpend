import { render, screen } from '@testing-library/react';
import Navbar from '../Navbar';
import { usePathname } from 'next/navigation';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: jest.fn(),
    theme: 'light',
  }),
}));

jest.mock('@/lib/store', () => ({
  useSnapSpendStore: jest.fn(() => ({
    categories: [],
    paymentMethods: [],
    users: [],
    settings: null,
    expenses: [],
    startDayOfMonth: 20,
    init: jest.fn(),
    addCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    addPaymentMethod: jest.fn(),
    updatePaymentMethod: jest.fn(),
    deletePaymentMethod: jest.fn(),
    addUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    updateStartDayOfMonth: jest.fn(),
    addExpense: jest.fn(),
    deleteExpense: jest.fn(),
  })),
}));

describe('Navbar', () => {
  it('renders the navbar with navigation links', () => {
    (usePathname as jest.Mock).mockReturnValue('/');
    render(<Navbar />);

    const homeLink = screen.getByText('Home');
    expect(homeLink).toBeInTheDocument();

    const scanLink = screen.getByText('Scan');
    expect(scanLink).toBeInTheDocument();
  });
});
