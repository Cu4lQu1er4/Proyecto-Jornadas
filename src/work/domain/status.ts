export enum WorkdayStatus {
  NORMAL = 'NORMAL',
  INCOMPLETE = 'INCOMPLETE',
  IRREGULAR = 'IRREGULAR',
  EXTRA = 'EXTRA',
}

export function classifyWorkday(
  workedMinutes: number,
  expectedMinutes: number,
  deltaMinutes: number,
  lateArrival: boolean,
  earlyLeave: boolean,
): WorkdayStatus {

  if (
    workedMinutes >= expectedMinutes &&
    !lateArrival &&
    !earlyLeave
  ) {
    return WorkdayStatus.NORMAL;
  }

  if (deltaMinutes > 0) {
    return WorkdayStatus.EXTRA;
  }

  if (workedMinutes < expectedMinutes && !lateArrival && !earlyLeave) {
    return WorkdayStatus.INCOMPLETE;
  }

  return WorkdayStatus.IRREGULAR;
}