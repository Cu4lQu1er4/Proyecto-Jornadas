import { IsString, MinLength } from "class-validator";

export class CreateEmployeeDto {
  @IsString()
  document!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  scheduleTemplateId!: string;
}