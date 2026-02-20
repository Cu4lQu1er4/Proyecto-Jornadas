import { 
  Controller,
  Post,
  Body,
  UseGuards,
  Param,
  Get,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";
import { EmployeeScheduleService } from "../application/employee-schedule.service";
import { AssignScheduleDto } from "../application/assign-schedule.dto";

@Controller("employee-schedules")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EmployeeScheduleController {
  constructor(
    private readonly service: EmployeeScheduleService,
  ) {}

  @Post("assign")
  async assign(@Body() dto: AssignScheduleDto) {
    return this.service.assignSchedule(
      dto.employeeId,
      dto.scheduleTemplateId,
      dto.effectiveFrom,
    );
  }

  @Get("current/:employeeId")
  async getCurrent(@Param("employeeId") employeeId: string) {
    return this.service.getCurrentSchedule(employeeId);
  }
}