import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { EmployeeScheduleService } from "../application/employee-schedule.service";

@Controller("employee-schedules")
@UseGuards(JwtAuthGuard)
export class EmployeeScheduleSelfController {
  constructor(
    private readonly service: EmployeeScheduleService,
  ) {}

  @Get("/me")
  async getMySchedule(@Req() req: any) {
    return this.service.getCurrentSchedule(req.user.id);
  }
}