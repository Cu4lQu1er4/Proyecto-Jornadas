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

export function buildIntervals(start, end, marks) {
  const sorted = [...marks].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const intervals: {
    start: Date;
    end: Date;
    type: string;
  }[] = [];

  let currentStart = start;
  let currentType = "WORK";

  for (const mark of sorted) {
    if (mark.type === "BREAK_START") {
      intervals.push({
        start: currentStart,
        end: mark.time,
        type: "WORK",
      });

      currentStart = mark.time;
      currentType = "BREAK";
    }

    if (mark.type === "BREAK_END") {
      intervals.push({
        start: currentStart,
        end: mark.time,
        type: "BREAK",
      });

      currentStart = mark.time;
      currentType = "WORK";
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
} {
  let breakMinutes = 0;

  let currentStart: Date | null = null;

  for (const m of marks) {
    if (m.type === "BREAK_START") {
      currentStart = m.time;
    }

    if (m.type === "BREAK_END" && currentStart) {
      const minutes = Math.floor(
        (m.time.getTime() - currentStart.getTime()) / 60000
      );

      breakMinutes += minutes;

      currentStart = null;
    }
  }

  return {
    breakMinutes,
  };
}