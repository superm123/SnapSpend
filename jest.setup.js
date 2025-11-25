// jest.setup.js
require('@testing-library/jest-dom');

// Mock Dexie
jest.mock('dexie');
// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockResolvedValue({
    recognize: jest.fn().mockResolvedValue({ data: { text: 'mocked OCR result' } }),
    terminate: jest.fn(),
  }),
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  // Mock individual icons as simple components
  List: () => 'ListIcon',
  Scan: () => 'ScanIcon',
  Plus: () => 'PlusIcon',
  CreditCard: () => 'CreditCardIcon',
  Settings: () => 'SettingsIcon',
  BarChart: () => 'BarChartIcon',
  Sun: () => 'SunIcon',
  Moon: () => 'MoonIcon',
  Menu: () => 'MenuIcon',
  Trash2: () => 'Trash2Icon',
  Edit: () => 'EditIcon',
  PlusCircle: () => 'PlusCircleIcon',
}));

