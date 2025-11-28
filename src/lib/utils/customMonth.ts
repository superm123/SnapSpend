import { addMonths, subDays, setDate, lastDayOfMonth } from 'date-fns';

export function getBillingCycleDates(billingCycleStartDay: number, date: Date = new Date()) {
  let cycleStartDate: Date;
  let cycleEndDate: Date;

  const currentMonthLastDay = lastDayOfMonth(date).getDate();
  const effectiveBillingCycleStartDay = Math.min(billingCycleStartDay, currentMonthLastDay);

  const potentialStartDateCurrentMonth = setDate(date, effectiveBillingCycleStartDay);

  if (date.getDate() < effectiveBillingCycleStartDay) {
    // Cycle started in the previous month
    cycleStartDate = addMonths(potentialStartDateCurrentMonth, -1);
  } else {
    // Cycle started in the current month
    cycleStartDate = potentialStartDateCurrentMonth;
  }

  cycleEndDate = subDays(addMonths(cycleStartDate, 1), 1);

  // Normalize dates to avoid issues with timezones and DST
  cycleStartDate.setHours(0, 0, 0, 0);
  cycleEndDate.setHours(23, 59, 59, 999);

  return { cycleStartDate, cycleEndDate };
}