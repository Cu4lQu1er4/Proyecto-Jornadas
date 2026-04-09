import { IsString, MinLength, IsEnum, IsOptional } from "class-validator";
import { Role } from "src/auth/roles.enum";

export class CreateEmployeeDto {
  @IsString()
  document!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  scheduleTemplateId!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}