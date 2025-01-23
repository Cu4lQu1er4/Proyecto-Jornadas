export interface DailySchedule {
  start: string;
  end: string;
}

export type WeeklySchedule = {
  [weekday: number]: DailySchedule;
};