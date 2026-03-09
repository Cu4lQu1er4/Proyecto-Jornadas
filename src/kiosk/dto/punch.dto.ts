import { IsUUID, IsIn, IsISO8601 } from "class-validator";

export class PunchDto {
  @IsUUID()
  employeeId: string;

  @IsIn(["start", "end"])
  type: "start" | "end";

  @IsISO8601()
  timestamp: string;
}