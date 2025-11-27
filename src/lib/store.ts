
import { create } from 'zustand';
import { db, IUser, ISetting } from './db';
import { getCurrencyFromLocale } from './utils/currency';

interface AppState {
  currentUser: IUser | null;
  setCurrentUser: (user: IUser) => void;
  billingCycleStart: number;
  setBillingCycleStart: (day: number) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  init: () => Promise<void>; // Add init action
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  billingCycleStart: 20, // default value
  setBillingCycleStart: (day) => set({ billingCycleStart: day }),
  currency: 'USD', // default value
  setCurrency: (currency) => set({ currency }),
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

    // Get currency from locale
    const locale = navigator.language;
    const currency = getCurrencyFromLocale(locale);
    set({ currency });
  },
}));
