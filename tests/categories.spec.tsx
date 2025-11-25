
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoriesPage from '../src/app/categories/page';
import { db } from '../src/lib/db'; // Keep db import for mocking add/delete/update

// Mock dexie-react-hooks' useLiveQuery directly
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(),
}));

// Mock Dexie.js for add/delete/update operations
jest.mock('../src/lib/db', () => ({
  db: {
    categories: {
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


describe('CategoriesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for useLiveQuery
    (useLiveQuery as jest.Mock).mockReturnValue([]);
  });

  it('renders without crashing', async () => {
    render(<CategoriesPage />);
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('displays existing categories', async () => {
    const mockCategories = [
      { id: 1, name: 'Food' },
      { id: 2, name: 'Travel' },
    ];
    (useLiveQuery as jest.Mock).mockReturnValue(mockCategories);

    render(<CategoriesPage />);

    // No need for waitFor as useLiveQuery is synchronous now
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
  });

  it('adds a new category', async () => {
    render(<CategoriesPage />);

    const input = screen.getByPlaceholderText('New category name');
    fireEvent.change(input, { target: { value: 'New Category' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));

    await waitFor(() => {
      expect(db.categories.add).toHaveBeenCalledWith({ name: 'New Category' });
      expect(input).toHaveValue('');
    });
  });

  it('edits an existing category', async () => {
    const mockCategories = [{ id: 1, name: 'Old Category' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockCategories);

    render(<CategoriesPage />);

    expect(screen.getByText('Old Category')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i })); // Click edit icon button

    const input = screen.getByPlaceholderText('Edit category name');
    expect(input).toHaveValue('Old Category');

    fireEvent.change(input, { target: { value: 'Updated Category' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Category' }));

    await waitFor(() => {
      expect(db.categories.update).toHaveBeenCalledWith(1, { name: 'Updated Category' });
      expect(input).toHaveValue('');
    });
  });

  it('deletes a category', async () => {
    const mockCategories = [{ id: 1, name: 'ToDelete' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockCategories);

    render(<CategoriesPage />);

    expect(screen.getByText('ToDelete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete/i })); // Click delete icon button

    await waitFor(() => {
      expect(db.categories.delete).toHaveBeenCalledWith(1);
    });
  });

  it('cancels editing a category', async () => {
    const mockCategories = [{ id: 1, name: 'Edit Me' }];
    (useLiveQuery as jest.Mock).mockReturnValue(mockCategories);

    render(<CategoriesPage />);

    expect(screen.getByText('Edit Me')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    const input = screen.getByPlaceholderText('Edit category name');
    expect(input).toHaveValue('Edit Me');

    fireEvent.change(input, { target: { value: 'Changed but not saved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(db.categories.update).not.toHaveBeenCalled();
      expect(input).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Add Category' })).toBeInTheDocument();
    });
  });
});
