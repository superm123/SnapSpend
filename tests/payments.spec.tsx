
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentMethodsPage from '../src/app/payments/page';
import { db } from '../src/lib/db';

// Mock dexie-react-hooks' useLiveQuery directly
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(),
}));

// Mock Dexie.js for add/delete/update operations
jest.mock('../src/lib/db', () => ({
  db: {
    paymentMethods: {
      toArray: jest.fn(), // This mock will not be used by useLiveQuery anymore
      add: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Edit2: jest.fn(() => <span>EditIcon</span>),
  Trash2: jest.fn(() => <span>DeleteIcon</span>),
}));

// Import useLiveQuery after its mock
import { useLiveQuery } from 'dexie-react-hooks';


describe('PaymentMethodsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for useLiveQuery
    (useLiveQuery as jest.Mock).mockReturnValue([]);
  });

  it('renders without crashing', async () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByText('Payment Methods')).toBeInTheDocument();
  });

  it('displays existing payment methods', async () => {
    const mockPaymentMethods = [
      { id: 1, name: 'Visa' },
      { id: 2, name: 'Mastercard' },
    ];
    (useLiveQuery as jest.Mock).mockReturnValue(mockPaymentMethods);

    render(<PaymentMethodsPage />);

    expect(screen.getByText('Visa')).toBeInTheDocument();
    expect(screen.getByText('Mastercard')).toBeInTheDocument();
  });

  it('adds a new payment method', async () => {
    render(<PaymentMethodsPage />);

    const input = screen.getByPlaceholderText('New payment method name');
    fireEvent.change(input, { target: { value: 'PayPal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Payment Method' }));

    await waitFor(() => {
      expect(db.paymentMethods.add).toHaveBeenCalledWith({ name: 'PayPal' });
      expect(input).toHaveValue('');
    });
  });

  it('edits an existing payment method', async () => {
    const mockPaymentMethods = [{ id: 1, name: 'Old Method' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockPaymentMethods);

    render(<PaymentMethodsPage />);

    expect(screen.getByText('Old Method')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const input = screen.getByPlaceholderText('Edit payment method name');
    expect(input).toHaveValue('Old Method');

    fireEvent.change(input, { target: { value: 'Updated Method' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Payment Method' }));

    await waitFor(() => {
      expect(db.paymentMethods.update).toHaveBeenCalledWith(1, { name: 'Updated Method' });
      expect(input).toHaveValue('');
    });
  });

  it('deletes a payment method', async () => {
    const mockPaymentMethods = [{ id: 1, name: 'ToDelete' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockPaymentMethods);

    render(<PaymentMethodsPage />);

    expect(screen.getByText('ToDelete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(db.paymentMethods.delete).toHaveBeenCalledWith(1);
    });
  });

  it('cancels editing a payment method', async () => {
    const mockPaymentMethods = [{ id: 1, name: 'Edit Me' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockPaymentMethods);

    render(<PaymentMethodsPage />);

    expect(screen.getByText('Edit Me')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const input = screen.getByPlaceholderText('Edit payment method name');
    expect(input).toHaveValue('Edit Me');

    fireEvent.change(input, { target: { value: 'Changed but not saved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(db.paymentMethods.update).not.toHaveBeenCalled();
      expect(input).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Add Payment Method' })).toBeInTheDocument();
    });
  });
});
