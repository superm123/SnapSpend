import { act } from 'react-dom/test-utils';
import { db } from '../src/lib/db'; // Import db to get the mocked version

// Mock Dexie.js for store tests
jest.mock('../src/lib/db', () => ({
  db: {
    users: {
      toCollection: jest.fn(),
      get: jest.fn(),
      add: jest.fn(),
    },
    settings: {
      toCollection: jest.fn(),
      get: jest.fn(), // Add get method to mock
      add: jest.fn(), // Add add method to mock
    },
  },
}));

// Import useStore AFTER the mock has been defined and hoisted
import { useStore } from '../src/lib/store';

describe('useStore', () => {
  // Store the initial state and actions to restore later
  const initialState = useStore.getState();

  let mockUsersToCollectionFirst: jest.Mock;

  beforeEach(() => {
    // Reset store to its initial state, including actions
    useStore.setState(initialState, true);

    // Reset mocks for db interactions
    jest.clearAllMocks();

    // Re-configure the chained mocks for db interactions
    mockUsersToCollectionFirst = jest.fn();
    (db.users.toCollection as jest.Mock).mockReturnValue({ first: mockUsersToCollectionFirst });

    // Mock db.settings.get directly as it's called in store.ts
    (db.settings.get as jest.Mock).mockResolvedValue(undefined); // Default to no settings found
    (db.settings.add as jest.Mock).mockResolvedValue(1); // Default for adding new settings
  });

  it('should set and get currentUser', () => {
    const user = { id: 1, name: 'Test User' };
    act(() => {
      useStore.getState().setCurrentUser(user);
    });
    expect(useStore.getState().currentUser).toEqual(user);
  });

  it('should set and get billingCycleStart', () => {
    act(() => {
      useStore.getState().setBillingCycleStart(15);
    });
    expect(useStore.getState().billingCycleStart).toBe(15);
  });

  describe('init', () => {
    it('should initialize currentUser from existing user in db', async () => {
      const mockUser = { id: 100, name: 'Existing User' };
      mockUsersToCollectionFirst.mockResolvedValueOnce(mockUser);

      await act(async () => {
        await useStore.getState().init();
      });

      expect(db.users.toCollection).toHaveBeenCalled();
      expect(mockUsersToCollectionFirst).toHaveBeenCalled();
      expect(useStore.getState().currentUser).toEqual(mockUser);
    });

    it('should create a new user if no existing user is found and set it as currentUser', async () => {
      const newUser = { id: 1, name: 'Default User' };
      mockUsersToCollectionFirst.mockResolvedValueOnce(undefined); // No existing user
      (db.users.add as jest.Mock).mockResolvedValueOnce(newUser.id); // Return new user ID
      (db.users.get as jest.Mock).mockResolvedValueOnce(newUser); // Return the newly created user

      await act(async () => {
        await useStore.getState().init();
      });

      expect(db.users.toCollection).toHaveBeenCalled();
      expect(mockUsersToCollectionFirst).toHaveBeenCalled();
      expect(db.users.add).toHaveBeenCalledWith({ name: 'Default User' });
      expect(db.users.get).toHaveBeenCalledWith(newUser.id);
      expect(useStore.getState().currentUser).toEqual(newUser);
    });

    it('should initialize billingCycleStart from existing settings in db', async () => {
      const mockSettings = { id: 1, billingCycleStart: 5 };
      (db.settings.get as jest.Mock).mockResolvedValueOnce(mockSettings);

      await act(async () => {
        await useStore.getState().init();
      });

      expect(db.settings.get).toHaveBeenCalledWith(1); // Changed from toCollection
      // No longer expecting mockSettingsToCollectionFirst as db.settings.get is directly mocked
      expect(useStore.getState().billingCycleStart).toBe(mockSettings.billingCycleStart);
    });

    it('should use default billingCycleStart if no settings are found in db', async () => {
      (db.settings.get as jest.Mock).mockResolvedValueOnce(undefined); // No settings found

      await act(async () => {
        await useStore.getState().init();
      });

      expect(db.settings.get).toHaveBeenCalledWith(1); // Changed from toCollection
      expect(useStore.getState().billingCycleStart).toBe(20); // Default value
    });
  });
});