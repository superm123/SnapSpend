import { getCurrentBillingCycleDates, formatDateForDexie } from '../customMonth';
import { addDays, subDays, format } from 'date-fns';

describe('customMonth utilities', () => {
  // Mock Date.now() to control the current date for consistent testing
  const MOCK_DATE_STR = '2023-10-15T10:00:00.000Z'; // October 15, 2023
  const MOCK_DATE = new Date(MOCK_DATE_STR);

  const realDate = Date; // Store original Date object

  beforeAll(() => {
    // Mock Date to return a fixed date
    global.Date = class extends realDate {
      constructor(dateString?: string) {
        if (dateString) {
          return new realDate(dateString);
        }
        return new realDate(MOCK_DATE_STR);
      }
    } as typeof Date;
  });

  afterAll(() => {
    global.Date = realDate; // Restore original Date object
  });


  describe('getCurrentBillingCycleDates', () => {
    it('should return correct dates for a cycle starting in the current month', () => {
      // Current date: Oct 15. Billing cycle starts on 10th.
      // Expected: Sep 10 - Oct 9 (previous cycle) OR Oct 10 - Nov 9 (current cycle)
      // The function calculates the *current* cycle based on `now`.
      // If now is Oct 15, and cycle starts on 10th, the current cycle is Oct 10 - Nov 9.
      const billingCycleStartDay = 10;
      const { startDate, endDate } = getCurrentBillingCycleDates(billingCycleStartDay);

      expect(format(startDate, 'yyyy-MM-dd')).toBe('2023-10-10');
      expect(format(endDate, 'yyyy-MM-dd')).toBe('2023-11-09');
    });

    it('should return correct dates for a cycle starting in the previous month', () => {
      // Current date: Oct 15. Billing cycle starts on 20th.
      // Expected: Sep 20 - Oct 19
      const billingCycleStartDay = 20;
      const { startDate, endDate } = getCurrentBillingCycleDates(billingCycleStartDay);

      expect(format(startDate, 'yyyy-MM-dd')).toBe('2023-09-20');
      expect(format(endDate, 'yyyy-MM-dd')).toBe('2023-10-19');
    });

    it('should handle billing cycle start day as 1', () => {
      // Current date: Oct 15. Billing cycle starts on 1st.
      // Expected: Oct 1 - Oct 31
      const billingCycleStartDay = 1;
      const { startDate, endDate } = getCurrentBillingCycleDates(billingCycleStartDay);

      expect(format(startDate, 'yyyy-MM-dd')).toBe('2023-10-01');
      expect(format(endDate, 'yyyy-MM-dd')).toBe('2023-10-31');
    });

    it('should handle billing cycle start day near end of month (e.g., 31)', () => {
      // Current date: Oct 15. Billing cycle starts on 31st.
      // Expected: Sep 30 (as Sep has 30 days) - Oct 30
      // Mocked date (Oct 15) is before billingCycleStartDay (31st).
      // So, it should be the previous month's cycle: Sep 30 - Oct 30
      const billingCycleStartDay = 31;
      const { startDate, endDate } = getCurrentBillingCycleDates(billingCycleStartDay);

      expect(format(startDate, 'yyyy-MM-dd')).toBe('2023-09-30');
      expect(format(endDate, 'yyyy-MM-dd')).toBe('2023-10-30');
    });

    it('should handle billing cycle start day for leap year (Feb 29)', () => {
        // Mock date to be a leap year, e.g., Feb 15, 2024
        global.Date = class extends realDate {
            constructor(dateString?: string) {
                if (dateString) return new realDate(dateString);
                return new realDate('2024-02-15T10:00:00.000Z'); // Feb 15, 2024
            }
        } as typeof Date;

        const billingCycleStartDay = 29; // Try to start on 29th
        const { startDate, endDate } = getCurrentBillingCycleDates(billingCycleStartDay);
        // Current date Feb 15, 2024. Cycle starts 29th.
        // Expected: Jan 29, 2024 - Feb 28, 2024
        expect(format(startDate, 'yyyy-MM-dd')).toBe('2024-01-29');
        expect(format(endDate, 'yyyy-MM-dd')).toBe('2024-02-28');

        // Restore original date mock
        global.Date = class extends realDate {
            constructor(dateString?: string) {
                if (dateString) return new realDate(dateString);
                return new realDate(MOCK_DATE_STR);
            }
        } as typeof Date;
    });

    it('should handle billing cycle start day that does not exist in a month (e.g., Feb 30)', () => {
      // Mock date to be Feb 15, 2023 (non-leap year)
      global.Date = class extends realDate {
          constructor(dateString?: string) {
              if (dateString) return new realDate(dateString);
              return new realDate('2023-02-15T10:00:00.000Z'); // Feb 15, 2023
          }
      } as typeof Date;

      const billingCycleStartDay = 30; // Attempt to start on 30th
      const { startDate, endDate } = getCurrentBillingCycleDates(billingCycleStartDay);
      // Current date Feb 15, 2023. Cycle starts 30th.
      // Expected: Jan 31, 2023 - Feb 28, 2023 (clamped to last day of month)
      expect(format(startDate, 'yyyy-MM-dd')).toBe('2023-01-31');
      expect(format(endDate, 'yyyy-MM-dd')).toBe('2023-02-28');

      // Restore original date mock
      global.Date = class extends realDate {
          constructor(dateString?: string) {
              if (dateString) return new realDate(dateString);
              return new realDate(MOCK_DATE_STR);
          }
      } as typeof Date;
  });
  });

  describe('formatDateForDexie', () => {
    it('should format a Date object to YYYY-MM-DD string', () => {
      const date = new Date('2023-01-01T12:34:56.789Z'); // UTC date
      expect(formatDateForDexie(date)).toBe('2023-01-01');

      const date2 = new Date('2023-12-31T00:00:00.000Z');
      expect(formatDateForDexie(date2)).toBe('2023-12-31');
    });
  });
});