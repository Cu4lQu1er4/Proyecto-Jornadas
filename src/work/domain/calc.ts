export type WorkCalc = {
  workedMinutes: number;
  extraMinutes: number;
};

export function calcWork(start: Date, end: Date, scheduleMinutes: number): WorkCalc {
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (endMs <= startMs) {
    throw new Error('END_BEFORE_START');
  }

  const workedMinutes = Math.floor((endMs - startMs) / 60000);
  const extraMinutes = Math.max(0, workedMinutes - scheduleMinutes);

  return { workedMinutes, extraMinutes };
}