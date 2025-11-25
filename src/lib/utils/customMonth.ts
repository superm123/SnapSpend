import { addMonths, setDate, isBefore, getDaysInMonth } from 'date-fns';

export function getBillingCycleDates(billingCycleStartDay: number, date: Date = new Date()) {
  let cycleStartDate: Date;
  let cycleEndDate: Date;

  // Adjust billingCycleStartDay to be within the valid range of days for the current month
  // This helps when the start day is high (e.g., 30) and the month has fewer days (e.g., Feb)
  const actualBillingCycleStartDay = Math.min(billingCycleStartDay, getDaysInMonth(date));

  const currentMonthStartDay = setDate(date, actualBillingCycleStartDay);

  if (isBefore(date, currentMonthStartDay)) {
    // Current date is before the billing cycle start day of the current month
    // Cycle started in the previous month and ends in the current month
    cycleStartDate = setDate(addMonths(date, -1), billingCycleStartDay);
    cycleEndDate = setDate(date, billingCycleStartDay - 1);
  } else {
    // Current date is on or after the billing cycle start day of the current month
    // Cycle started in the current month and ends in the next month
    cycleStartDate = setDate(date, billingCycleStartDay);
    cycleEndDate = setDate(addMonths(date, 1), billingCycleStartDay - 1);
  }

  // Normalize dates to avoid issues with timezones and DST
  cycleStartDate.setHours(0, 0, 0, 0);
  cycleEndDate.setHours(23, 59, 59, 999);

  return { cycleStartDate, cycleEndDate };
}