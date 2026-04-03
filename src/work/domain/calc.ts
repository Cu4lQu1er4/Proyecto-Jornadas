export type WorkCalc = {
  workedMinutes: number;
  extraMinutes: number;
};

type Mark = {
  type: string;
  time: Date;
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

export function calculatePauseMinutesDetailed(marks: Mark[]): {
  breakMinutes: number;
  lunchMinutes: number;
  totalPauseMinutes: number;
} {
  let breakMinutes = 0;
  let lunchMinutes = 0;

  let currentStart: Date | null = null;
  let currentType: "BREAK" | "LUNCH" | null = null;

  for (const m of marks) {
    if (m.type === "BREAK_START") {
      currentStart = m.time;
      currentType = "BREAK";
    }

    if (m.type === "LUNCH_START") {
      currentStart = m.time;
      currentType = "LUNCH"
    }

    if (
      (m.type === "BREAK_END" || m.type === "LUNCH_END") &&
      currentStart &&
      currentType
    ) {
      const minutes = Math.floor(
        (m.time.getTime() - currentStart.getTime()) / 60000
      );

      if (currentType === "BREAK") {
        breakMinutes += minutes;
      }

      if (currentType === "LUNCH") {
        lunchMinutes += minutes;
      }

      currentStart = null;
      currentType = null;
    }
  }

  return {
    breakMinutes,
    lunchMinutes,
    totalPauseMinutes: breakMinutes + lunchMinutes,
  };
} 