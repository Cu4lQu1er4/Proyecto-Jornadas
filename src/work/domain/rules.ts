export interface BreakRule {
  start: string;
  end: string;
}

export interface DaySchedule {
  start: string;
  end: string;
}

export interface GraceRules {
  arrivalMinutes: number;
  leaveMinutes: number;
}

export interface WorkdayRules {
  breaks: BreakRule[];
  schedule: {
    [weekday: number]: {
      start: string;
      end: string;
    }
  };
  grace: GraceRules;
}

export type MarkType =
  | 'BREAK_START'
  | 'BREAK_END';

export function getNextAllowedMarks(last?: MarkType): MarkType[] {
  if (!last) return ['BREAK_START'];

  switch (last) {
    case 'BREAK_START':
      return ['BREAK_END'];

    case 'BREAK_END':
      return ['BREAK_START'];

    default:
      return [];
  }
}