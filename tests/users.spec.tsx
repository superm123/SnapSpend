
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UsersPage from '../src/app/settings/users/page';
import { db } from '../src/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock dexie-react-hooks' useLiveQuery directly
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(),
}));

// Mock Dexie.js for add/delete/update operations
jest.mock('../src/lib/db', () => ({
  db: {
    users: {
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


describe('UsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for useLiveQuery
    (useLiveQuery as jest.Mock).mockReturnValue([]);
  });

  it('renders without crashing', async () => {
    render(<UsersPage />);
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
  });

  it('displays existing users', async () => {
    const mockUsers = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    (useLiveQuery as jest.Mock).mockReturnValue(mockUsers);

    render(<UsersPage />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('adds a new user', async () => {
    render(<UsersPage />);

    const input = screen.getByPlaceholderText('New user name');
    fireEvent.change(input, { target: { value: 'Charlie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add User' }));

    await waitFor(() => {
      expect(db.users.add).toHaveBeenCalledWith({ name: 'Charlie' });
      expect(input).toHaveValue('');
    });
  });

  it('edits an existing user', async () => {
    const mockUsers = [{ id: 1, name: 'Old User' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockUsers);

    render(<UsersPage />);

    expect(screen.getByText('Old User')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const input = screen.getByPlaceholderText('Edit user name');
    expect(input).toHaveValue('Old User');

    fireEvent.change(input, { target: { value: 'Updated User' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update User' }));

    await waitFor(() => {
      expect(db.users.update).toHaveBeenCalledWith(1, { name: 'Updated User' });
      expect(input).toHaveValue('');
    });
  });

  it('deletes a user', async () => {
    const mockUsers = [{ id: 1, name: 'ToDelete' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockUsers);

    render(<UsersPage />);

    expect(screen.getByText('ToDelete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(db.users.delete).toHaveBeenCalledWith(1);
    });
  });

  it('cancels editing a user', async () => {
    const mockUsers = [{ id: 1, name: 'Edit Me' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockUsers);

    render(<UsersPage />);

    expect(screen.getByText('Edit Me')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const input = screen.getByPlaceholderText('Edit user name');
    expect(input).toHaveValue('Edit Me');

    fireEvent.change(input, { target: { value: 'Changed but not saved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(db.users.update).not.toHaveBeenCalled();
      expect(input).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Add User' })).toBeInTheDocument();
    });
  });
});
