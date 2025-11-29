
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
  setBillingCycleStart: async (day) => {
    set({ billingCycleStart: day }); // Updates Zustand state
    // Persist billingCycleStart to settings
    const settings = await db.settings.get(1);
    console.log('setBillingCycleStart: settings.billingCycleStart:', settings?.billingCycleStart, 'day:', day);
    if (settings && settings.billingCycleStart !== day) { // This check is crucial
      await db.settings.update(1, { billingCycleStart: day });
    } else if (!settings) {
      await db.settings.add({ id: 1, billingCycleStart: day, currency: getCurrencyFromLocale(navigator.language) }); // Create with default billingCycleStart
    }
  },
  currency: 'USD', // default value
  setCurrency: async (currency) => {
    set({ currency });
    // Persist currency to settings
    const settings = await db.settings.get(1);
    if (settings) {
      await db.settings.update(1, { currency });
    } else {
      await db.settings.add({ id: 1, billingCycleStart: 20, currency }); // Create with default billingCycleStart
    }
  },
  init: async () => {
    // Try to get the first user, or create one if none exist
    let user = await db.users.toCollection().first();
    if (!user) {
      const id = await db.users.add({ name: 'Default User' });
      user = await db.users.get(id);
    }
    set({ currentUser: user });

    // Get settings (billing cycle and currency)
    let settings = await db.settings.get(1); // Assuming single settings entry with ID 1
    if (!settings) {
      // If no settings exist, create default
      settings = { id: 1, billingCycleStart: 20, currency: getCurrencyFromLocale(navigator.language) };
      await db.settings.add(settings);
    }
    set({ billingCycleStart: settings.billingCycleStart, currency: settings.currency });
  },
}));
