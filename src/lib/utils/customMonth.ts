import { addMonths, subDays, setDate, lastDayOfMonth } from 'date-fns';

export function getBillingCycleDates(billingCycleStartDay: number, date: Date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  let cycleStartDate: Date;
  let cycleEndDate: Date;

  const getValidDay = (monthDate: Date, day: number) => {
    return Math.min(day, lastDayOfMonth(monthDate).getDate());
  };

  if (date.getDate() < billingCycleStartDay) {
    // Cycle started in the previous month
    const prevMonthDate = addMonths(date, -1);
    const startDay = getValidDay(prevMonthDate, billingCycleStartDay);
    cycleStartDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), startDay);
    const endDay = getValidDay(date, billingCycleStartDay - 1);
    cycleEndDate = new Date(year, month, endDay);
  } else {
    // Cycle started in the current month
    const startDay = getValidDay(date, billingCycleStartDay);
    cycleStartDate = new Date(year, month, startDay);
    const nextMonthDate = addMonths(date, 1);
    const endDay = getValidDay(nextMonthDate, billingCycleStartDay - 1);
    cycleEndDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), endDay);
  }

  // Normalize dates to avoid issues with timezones and DST
  cycleStartDate.setHours(0, 0, 0, 0);
  cycleEndDate.setHours(23, 59, 59, 999);

  return { cycleStartDate, cycleEndDate };
}