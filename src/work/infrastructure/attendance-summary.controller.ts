import { 
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards
} from "@nestjs/common";
import { AttendanceSummaryService } from "../application/attendance-summary.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";

@Controller('admin/attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AttendanceSummaryController {
  constructor(
    private readonly summaryService: AttendanceSummaryService,
  ) {}

  @Get('day/:employeeId')
  getDay(
    @Param('employeeId') employeeId: string,
    @Query('date') date: string,
  ) {
    return this.summaryService.getDay(
      employeeId,
      date,
    );
  }

  @Get('period/:employeeId/:periodId')
  getPeriod(
    @Param('employeeId') employeeId: string,
    @Param('periodId') periodId: string,
  ) {
    return this.summaryService.getPeriod(employeeId, periodId);
  }

  @Get("report")
  async report(
    @Query("periodId") periodId: string,
    @Query("document") document?: string,
  ) {
      return this.summaryService.getPeriod(periodId, document);
    }
}