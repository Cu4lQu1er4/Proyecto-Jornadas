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

export function buildIntervals (start, end, marks) {
  const sorted = [...marks].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const intervals: {
    start: Date;
    end: Date;
    type: string;
  }[] = [];

  let currentStart = start;
  let currentType = 'WORK';

  for (const mark of sorted) {
    if (mark.type === 'BREAK_START' || mark.type === 'LUNCH_START') {
      intervals.push({
        start: currentStart,
        end: mark.time,
        type: 'WORK',
      });

      currentStart = mark.time;
      currentType = mark.type === 'BREAK_START' ? 'BREAK' : 'LUNCH'
    }

    if (mark.type === 'BREAK_END' || mark.type === 'LUNCH_END') {
      intervals.push({
        start: currentStart,
        end: mark.time,
        type: currentType,
      });

      currentStart = mark.time;
      currentType = 'WORK';
    }
  }

  intervals.push({
    start: currentStart,
    end,
    type: currentType,
  });

  return intervals;
}