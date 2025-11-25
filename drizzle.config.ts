import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite', // Added for SQLite
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./dev.db', // Use file: for local sqlite
  },
} satisfies Config;
