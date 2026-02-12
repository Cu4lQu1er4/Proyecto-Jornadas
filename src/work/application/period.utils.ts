export function getNextPeriod(period: {
  year: number;
  month: number;
  half: 1 | 2;
}) {
  if (period.half === 1) {
    return {
      year: period.year,
      month: period.month,
      half: 2 as const,
    };
  }

  if (period.month === 11) {
    return {
      year: period.year + 1,
      month: 0,
      half: 1 as const,
    };
  }

  return {
    year: period.year,
    month: period.month + 1,
    half: 1 as const,
  };
}

export function getExpectedCloseDate(
  year: number,
  month: number,
  half: 1 | 2,
) {
  if (half === 1) {
    return new Date(year, month, 15, 23, 59, 59);
  }

  return new Date(year, month, 30, 23, 59, 59);
}