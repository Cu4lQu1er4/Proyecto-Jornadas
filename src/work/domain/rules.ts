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

