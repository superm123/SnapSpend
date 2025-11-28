import Dexie, { Table } from 'dexie';

export interface IExpense {
  id?: number;
  description: string;
  amount: number;
  categoryId: number;
  paymentMethodId: number;
  userId: number;
  date: Date;
  receiptImage?: string;
  place?: string; // New field for the place where the expense occurred
}

export interface ICategory {
  id?: number;
  name: string;
}

export interface IPaymentMethod {
  id?: number;
  name: string;
}

export interface IUser {
  id?: number;
  name: string;
}

export interface ISetting {
  id?: number;
  billingCycleStart: number;
  currency: string;
}

class SnapSpendDatabase extends Dexie {
  expenses!: Table<IExpense>;
  categories!: Table<ICategory>;
  paymentMethods!: Table<IPaymentMethod>;
  users!: Table<IUser>;
  settings!: Table<ISetting>;

  constructor() {
    super('SnapSpendDatabase');
    this.version(1).stores({
      expenses: '++id, categoryId, paymentMethodId, userId, date',
      categories: '++id, name',
      paymentMethods: '++id, name',
      users: '++id, name',
      settings: '++id',
    });
    // Version 2: Adds 'place' to expenses, 'currency' to settings, and ensures all categories are present
    this.version(2).stores({
      expenses: '++id, categoryId, paymentMethodId, userId, date, place', // Added 'place'
      categories: '++id, name',
      paymentMethods: '++id, name',
      users: '++id, name',
      settings: '++id, currency', // Added 'currency'
    }).upgrade(async (trans) => {
      // Add default currency to existing settings
      await trans.settings.toCollection().modify((setting) => {
        if (!setting.currency) {
          setting.currency = 'USD'; // Default value for existing settings
        }
      });

      // Ensure all categories are present (redundant if V1 adds all, but robust)
      const allSeedCategories = [
        { name: 'Fuel' }, { name: 'Groceries' }, { name: 'Medical' }, { name: 'Other' },
        { name: 'Housing' }, { name: 'Utilities' }, { name: 'Transportation' }, { name: 'Entertainment' },
      ];
      for (const newCat of allSeedCategories) {
        const existingCat = await trans.categories.where('name').equalsIgnoreCase(newCat.name).first();
        if (!existingCat) {
          await trans.categories.add(newCat);
        }
      }
    });
    this.on('populate', () => this.populate());
  }

  async populate() {
    const seedCategories = [
      { name: 'Fuel' }, { name: 'Groceries' }, { name: 'Medical' }, { name: 'Other' },
      { name: 'Housing' }, { name: 'Utilities' }, { name: 'Transportation' }, { name: 'Entertainment' },
    ];
    await db.categories.bulkAdd(seedCategories);

    const seedPaymentMethods = [
      { name: 'Cash' }, { name: 'Visa' }, { name: 'Mastercard' },
    ];
    await db.paymentMethods.bulkAdd(seedPaymentMethods);

    const seedUsers = [{ name: 'Default User' }];
    await db.users.bulkAdd(seedUsers);

    const seedSettings = [{ billingCycleStart: 20 }];
    await db.settings.bulkAdd(seedSettings);
  }
}

export const db = new SnapSpendDatabase();