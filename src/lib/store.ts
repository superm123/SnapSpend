
import { create } from 'zustand';
import { db, IUser, ISetting } from './db';

interface AppState {
  currentUser: IUser | null;
  setCurrentUser: (user: IUser) => void;
  billingCycleStart: number;
  setBillingCycleStart: (day: number) => void;
  init: () => Promise<void>; // Add init action
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  billingCycleStart: 20, // default value
  setBillingCycleStart: (day) => set({ billingCycleStart: day }),
  init: async () => {
    // Try to get the first user, or create one if none exist
    let user = await db.users.toCollection().first();
    if (!user) {
      const id = await db.users.add({ name: 'Default User' });
      user = await db.users.get(id);
    }
    set({ currentUser: user });

    // Get billing cycle start day from settings
    const settings = await db.settings.toCollection().first();
    if (settings) {
      set({ billingCycleStart: settings.billingCycleStart });
    }
  },
}));
