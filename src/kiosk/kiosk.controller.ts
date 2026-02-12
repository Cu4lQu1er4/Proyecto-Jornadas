import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Get,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "src/auth/application/auth.service";
import { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { WorkService } from "src/work/work.service";

@Controller("kiosk")
export class KioskController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly workService: WorkService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("status")
  async status(@Req() req: any) {
    const employeeId = req.user.userId;
    return this.workService.workdayStatus(employeeId);
  }
}
