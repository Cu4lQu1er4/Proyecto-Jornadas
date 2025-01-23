import { WorkdayRules } from "./domain/rules";

export const workdayRules: WorkdayRules = {
  schedule: {
    1: { start: "07:00", end: "17:00" },
    2: { start: "07:00", end: "17:00" },
    3: { start: "07:00", end: "17:00" },
    4: { start: "07:00", end: "17:00" },
    5: { start: "07:00", end: "16:00" },
  },
  breaks: [
    { start: "10:00", end: "10:20"},
    { start: "13:00", end: "14:00"},
  ],
  grace: {
    arrivalMinutes: 10,
    leaveMinutes: 10,
  },
};