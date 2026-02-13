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
  report(
    @Query("periodId") periodId: string,
    @Query("document") document: string,
  ) {

    if (!periodId || !document) {
      throw new BadRequestException("periodId y document son requeridos");
    }

    return this.summaryService.getReport(periodId, document);
  }

  @Get("summary")
  summary(
    @Query("periodId") periodId: string,
    @Query("document") document?: string,
  ) {
    if (!periodId) {
      throw new BadRequestException("periodId es requerido");
    }

    return this.summaryService.getSummary(periodId, document);
  }
}