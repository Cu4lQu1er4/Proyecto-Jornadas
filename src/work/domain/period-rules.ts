import { Period } from "./period";
import { PeriodClosedError } from "./errors";

export interface PeriodDescriptor {
  year: number;
  month: number;
  half: 1 | 2;
  startDate: Date;
  endDate: Date;
}

export function getPeriodForDate(date: Date): PeriodDescriptor {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const half: 1 | 2 = day <= 15 ? 1 : 2;

  let startDate: Date;
  let endDate: Date;

  if (half === 1) {
    startDate = new Date(year, month, 1, 0, 0, 0);
    endDate = new Date(year, month, 15, 23, 59, 59);
  } else {
    startDate = new Date(year, month, 16, 0, 0, 0);
    endDate = new Date(year, month + 1, 0, 23, 59, 59);
  }

  return {
    year,
    month,
    half,
    startDate,
    endDate,
  };
}

export function ensurePeriodIsOpen(period: Period): void {
  if (period.closedAt) {
    throw new PeriodClosedError();
  }
}