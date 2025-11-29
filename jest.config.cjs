const { compilerOptions } = require('./tsconfig.json');

// jest.config.js
module.exports = {
  testEnvironment: '<rootDir>/jest-custom-environment.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\.(ts|tsx)$': ['@swc/jest'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'], // Treat these files as ES modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/web-streams-polyfill'],
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e-.*.spec.ts',
    '<rootDir>/tests/receipt-scan.spec.ts',
    '<rootDir>/tests/e2e', // Ignore directories that start with e2e
  ],

  // Add moduleDirectories to tell Jest where to look for modules.
  // This is crucial for resolving imports like `import { Button from '@/components/ui/button';`
  // as it effectively makes `src` a root directory for modules.
  moduleDirectories: ['node_modules', '<rootDir>/src'], // Look in node_modules and src

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};