import { addMonths, subDays, setDate, lastDayOfMonth, getDate } from 'date-fns';

export function getBillingCycleDates(billingCycleStartDay: number, date: Date = new Date()) {
  let cycleStartDate: Date;
  let cycleEndDate: Date;

  // Determine the candidate start date in the current month, clamped to the last day if necessary
  const currentMonthLastDay = lastDayOfMonth(date).getDate();
  const effectiveStartDayThisMonth = Math.min(billingCycleStartDay, currentMonthLastDay);
  const candidateStartDateThisMonth = setDate(date, effectiveStartDayThisMonth);

  // Determine if the current date falls into the current cycle (starting this month)
  // or the previous cycle (starting last month)
  if (getDate(date) >= effectiveStartDayThisMonth) {
    // The cycle starts in the current month (or on the effective start day of current month)
    cycleStartDate = candidateStartDateThisMonth;
  } else {
    // The cycle started in the previous month
    cycleStartDate = addMonths(candidateStartDateThisMonth, -1);
    // Ensure cycleStartDate is clamped to the end of the *previous* month if necessary
    const previousMonthLastDay = lastDayOfMonth(subDays(date, getDate(date))).getDate(); // Get last day of previous month
    cycleStartDate = setDate(cycleStartDate, Math.min(billingCycleStartDay, previousMonthLastDay));
  }

  // Calculate the end date: one month after the start date, then subtract one day
  cycleEndDate = subDays(addMonths(cycleStartDate, 1), 1);

  // Normalize dates to avoid issues with timezones and DST
  cycleStartDate.setHours(0, 0, 0, 0);
  cycleEndDate.setHours(23, 59, 59, 999);

  return { cycleStartDate, cycleEndDate };
}