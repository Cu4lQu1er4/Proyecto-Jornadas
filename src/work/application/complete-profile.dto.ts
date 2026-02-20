import { IsEmail, IsString, MinLength } from "class-validator";

export class CompleteProfileDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;

  @IsString()
  @MinLength(4)
  pin!: string;
}