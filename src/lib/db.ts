
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
    this.on('populate', () => this.populate());
  }

  async populate() {
    const seedCategories = [
      { name: 'Fuel' },
      { name: 'Groceries' },
      { name: 'Medical' },
      { name: 'Other' },
    ];
    await db.categories.bulkAdd(seedCategories);

    const seedPaymentMethods = [
      { name: 'Cash' },
      { name: 'Visa' },
      { name: 'Mastercard' },
    ];
    await db.paymentMethods.bulkAdd(seedPaymentMethods);

    const seedUsers = [{ name: 'Default User' }];
    await db.users.bulkAdd(seedUsers);

    const seedSettings = [{ billingCycleStart: 20 }];
    await db.settings.bulkAdd(seedSettings);
  }
}

export const db = new SnapSpendDatabase();
