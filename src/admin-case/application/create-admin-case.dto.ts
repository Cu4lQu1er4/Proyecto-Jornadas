import { 
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AdminCaseType } from "@prisma/client";

export class CreateAdminCaseScopeDto {
  @IsString()
  date!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute?: number;

  @IsOptional()
  @IsString()
  workdayHistoryId?: string;
}

export class CreateAdminCaseDto {
  @IsString()
  employeeId!: string;

  @IsEnum(AdminCaseType)
  type!: AdminCaseType;

  @IsOptional()
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdminCaseScopeDto)
  scopes!: CreateAdminCaseScopeDto[];
}