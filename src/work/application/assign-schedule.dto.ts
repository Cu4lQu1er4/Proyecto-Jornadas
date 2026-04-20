import { IsString } from "class-validator";

export class AssignScheduleDto {
  @IsString()
  employeeId!: string;

  @IsString()
  scheduleTemplateId!: string;

  @IsString()
  effectiveFrom!: string;
}