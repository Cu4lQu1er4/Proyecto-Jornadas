import { IsString, IsDateString } from "class-validator";

export class AssignScheduleDto {
  @IsString()
  employeeId!: string;

  @IsString()
  scheduleTemplateId!: string;

  @IsDateString()
  effectiveFrom!: string;
}