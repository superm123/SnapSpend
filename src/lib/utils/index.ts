import { type ClassValue, clsx } from "clsx" 
import { twMerge } from "tailwind-merge" 
import { startOfDay, endOfDay, subMonths, addMonths } from 'date-fns';

export function cn(...inputs: ClassValue[]) { 
  return twMerge(clsx(inputs))
}

export function getBillingCycle(startDay: number): { startDate: Date; endDate: Date } {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let startDate: Date;
  let endDate: Date;

  if (currentDay >= startDay) {
    // Current cycle is within the current month
    startDate = startOfDay(new Date(currentYear, currentMonth, startDay));
    const nextCycleStartDate = addMonths(startDate, 1);
    endDate = endOfDay(new Date(nextCycleStartDate.getTime() - 1));
  } else {
    // Current cycle started in the previous month
    const prevMonthStartDate = subMonths(new Date(currentYear, currentMonth, startDay), 1);
    startDate = startOfDay(prevMonthStartDate);
    const nextCycleStartDate = addMonths(startDate, 1);
    endDate = endOfDay(new Date(nextCycleStartDate.getTime() - 1));
  }

  return { startDate, endDate };
}
