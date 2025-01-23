export interface WorkdayHistoryCreate {
  employeeId: string;
  startTime: Date;
  endTime: Date;
  workedMinutes: number;
  expectedMinutes: number;
  deltaMinutes: number;
  lateArrival: boolean;
  earlyLeave: boolean;
  periodId: string;
}

export interface WorkdayHistoryEntry extends WorkdayHistoryCreate {
  id: string;
  createdAt: Date;
}

export interface WorkdayHistoryEntryWithAdjustments extends WorkdayHistoryEntry {
  adjustments: { type: "ADD" | "SUBTRACT"; minutes: number }[];
}

export interface WorkdayHistoryWriter {
  save(entry: WorkdayHistoryCreate): Promise<void>;
}

export interface WorkdayHistoryReader {
  findByEmployee(employeeId: string): Promise<WorkdayHistoryEntry[]>;
  findById(id: string): Promise<WorkdayHistoryEntry | null>;
  findWithAdjustments(
    employeeId: string,
    from?: Date,
    to?: Date,
  ): Promise<WorkdayHistoryEntryWithAdjustments[]>;
}
