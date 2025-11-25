
import { getBillingCycleDates } from '../src/lib/utils/customMonth';
import { addDays, subDays, startOfMonth, endOfMonth, setDate, addMonths } from 'date-fns';

describe('getBillingCycleDates', () => {
  // Test case 1: Current date is after the billing cycle start day
  test('should return correct dates when current day is after billing cycle start day', () => {
    const billingCycleStartDay = 15;
    const currentDate = new Date(2023, 10, 20); // Nov 20, 2023

    const { cycleStartDate, cycleEndDate } = getBillingCycleDates(billingCycleStartDay, currentDate);

    const expectedStartDate = new Date(2023, 10, 15); // Nov 15, 2023
    let expectedEndDate = setDate(endOfMonth(addMonths(currentDate, 1)), billingCycleStartDay - 1);
    expectedEndDate.setHours(23, 59, 59, 999);

    expect(cycleStartDate.getDate()).toBe(expectedStartDate.getDate());
    expect(cycleStartDate.getMonth()).toBe(expectedStartDate.getMonth());
    expect(cycleStartDate.getFullYear()).toBe(expectedStartDate.getFullYear());
    expect(cycleEndDate.getDate()).toBe(expectedEndDate.getDate());
    expect(cycleEndDate.getMonth()).toBe(expectedEndDate.getMonth());
    expect(cycleEndDate.getFullYear()).toBe(expectedEndDate.getFullYear());
  });

  // Test case 2: Current date is before the billing cycle start day
  test('should return correct dates when current day is before billing cycle start day', () => {
    const billingCycleStartDay = 15;
    const currentDate = new Date(2023, 10, 10); // Nov 10, 2023

    const { cycleStartDate, cycleEndDate } = getBillingCycleDates(billingCycleStartDay, currentDate);

    const expectedStartDate = new Date(2023, 9, 15); // Oct 15, 2023
    let expectedEndDate = setDate(endOfMonth(currentDate), billingCycleStartDay - 1);
    expectedEndDate.setHours(23, 59, 59, 999);

    expect(cycleStartDate.getDate()).toBe(expectedStartDate.getDate());
    expect(cycleStartDate.getMonth()).toBe(expectedStartDate.getMonth());
    expect(cycleStartDate.getFullYear()).toBe(expectedStartDate.getFullYear());
    expect(cycleEndDate.getDate()).toBe(expectedEndDate.getDate());
    expect(cycleEndDate.getMonth()).toBe(expectedEndDate.getMonth());
    expect(cycleEndDate.getFullYear()).toBe(expectedEndDate.getFullYear());
  });

  // Test case 3: Billing cycle start day is 1
  test('should handle billing cycle starting on the 1st of the month', () => {
    const billingCycleStartDay = 1;
    const currentDate = new Date(2023, 10, 10); // Nov 10, 2023

    const { cycleStartDate, cycleEndDate } = getBillingCycleDates(billingCycleStartDay, currentDate);

    const expectedStartDate = new Date(2023, 10, 1); // Nov 1, 2023
    let expectedEndDate = endOfMonth(currentDate);
    expectedEndDate = setDate(endOfMonth(addMonths(currentDate, 1)), billingCycleStartDay - 1);
    expectedEndDate.setHours(23, 59, 59, 999);


    expect(cycleStartDate.getDate()).toBe(expectedStartDate.getDate());
    expect(cycleStartDate.getMonth()).toBe(expectedStartDate.getMonth());
    expect(cycleStartDate.getFullYear()).toBe(expectedStartDate.getFullYear());
    expect(cycleEndDate.getDate()).toBe(expectedEndDate.getDate());
    expect(cycleEndDate.getMonth()).toBe(expectedEndDate.getMonth());
    expect(cycleEndDate.getFullYear()).toBe(expectedEndDate.getFullYear());
  });

  // Test case 4: Billing cycle start day is 30 (for months with fewer days)
  test('should handle billing cycle starting on the 30th for months with fewer days', () => {
    const billingCycleStartDay = 30;
    const currentDate = new Date(2023, 1, 15); // Feb 15, 2023

    const { cycleStartDate, cycleEndDate } = getBillingCycleDates(billingCycleStartDay, currentDate);

    const expectedStartDate = new Date(2023, 0, 30); // Jan 30, 2023
    let expectedEndDate = setDate(endOfMonth(currentDate), billingCycleStartDay - 1);
    expectedEndDate.setHours(23, 59, 59, 999);

    expect(cycleStartDate.getDate()).toBe(expectedStartDate.getDate());
    expect(cycleStartDate.getMonth()).toBe(expectedStartDate.getMonth());
    expect(cycleStartDate.getFullYear()).toBe(expectedStartDate.getFullYear());
    expect(cycleEndDate.getDate()).toBe(expectedEndDate.getDate());
    expect(cycleEndDate.getMonth()).toBe(expectedEndDate.getMonth());
    expect(cycleEndDate.getFullYear()).toBe(expectedEndDate.getFullYear());
  });

    // Test case 5: Current date is the billing cycle start day
    test('should return correct dates when current day is the billing cycle start day', () => {
      const billingCycleStartDay = 15;
      const currentDate = new Date(2023, 10, 15); // Nov 15, 2023
  
      const { cycleStartDate, cycleEndDate } = getBillingCycleDates(billingCycleStartDay, currentDate);
  
      const expectedStartDate = new Date(2023, 10, 15); // Nov 15, 2023
      let expectedEndDate = setDate(endOfMonth(addMonths(currentDate, 1)), billingCycleStartDay - 1);
      expectedEndDate.setHours(23, 59, 59, 999);
  
      expect(cycleStartDate.getDate()).toBe(expectedStartDate.getDate());
      expect(cycleStartDate.getMonth()).toBe(expectedStartDate.getMonth());
      expect(cycleStartDate.getFullYear()).toBe(expectedStartDate.getFullYear());
      expect(cycleEndDate.getDate()).toBe(expectedEndDate.getDate());
      expect(cycleEndDate.getMonth()).toBe(expectedEndDate.getMonth());
      expect(cycleEndDate.getFullYear()).toBe(expectedEndDate.getFullYear());
    });
});
