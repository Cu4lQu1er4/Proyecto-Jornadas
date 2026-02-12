import {
  Controller,
  Post,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Body,
  Req,
  UseGuards,
  Patch,
  Param,
} from "@nestjs/common";
import type { Request } from "express";
import { WorkService } from "./work.service";
import { PeriodHasOpenWorkdaysError, WorkdayOpenError } from "./domain/errors";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";
import { RolesGuard } from "src/auth/roles.guard";
import { AttendanceSummaryService } from "./application/attendance-summary.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("work")
export class WorkController {
  constructor(
    private readonly service: WorkService,
    private readonly attemdamceSummary: AttendanceSummaryService,
  ) {}

  @Roles(Role.EMPLOYEE)
  @Post("start")
  async start(@Req() req: Request) {
    const client = req.headers['x-client'];

    if (client !== 'kiosk') {
      throw new HttpException(
        { code: 'KIOSK_ONLY' },
        HttpStatus.FORBIDDEN
      );
    }

    const employeeId = (req.user as any).userId;

    try {
      await this.service.start(employeeId);
      return { status: 'OK' };
    } catch (e) {
      if (e instanceof WorkdayOpenError) {
        throw new HttpException(
          { code: 'WORKDAY_ALREADY_OPEN' },
          HttpStatus.CONFLICT
        );
      }
      throw e;
    }
  }

  @Roles(Role.EMPLOYEE)
  @Post("end")
  async end(@Req() req: Request) {
    const client = req.headers['x-client'];

    if (client !== 'kiosk') {
      throw new HttpException(
        { code: 'KIOSK_ONLY' },
        HttpStatus.FORBIDDEN
      );
    }

    const employeeId = (req.user as any).userId;

    try {
      const now = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/Bogota",
        })
      );

      const result = await this.service.end(employeeId, now);

      return {
        status: "OK",
        workedMinutes: result.workedMinutes,
        expectedMinutes: result.expectedMinutes,
        deltaMinutes: result.deltaMinutes,
      };
    } catch (e) {
      if (e instanceof WorkdayOpenError) {
        throw new HttpException(
          "No hay una jornada abierta",
          HttpStatus.CONFLICT
        );
      }
      throw e;
    }
  }

  @Roles(Role.EMPLOYEE)
  @Get("history")
  async history(
    @Req() req: Request,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    const employeeId = (req.user as any).userId;

    return this.service.history(
      employeeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );
  }

  @Roles(Role.ADMIN)
  @Post("adjustment")
  async addAdjustment(
    @Req() req: Request,
    @Body() body: {
      historyId: string;
      type: "ADD" | "SUBTRACT";
      minutes: number;
      reason: string;
    }
  ) {
    const approvedBy = (req.user as any).userId;

    await this.service.addAdjustment({
      ...body,
      approvedBy,
    });

    return { status: "OK" };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("periods")
  async listPeriods(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listPeriods({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('periods/:id/close')
  async closePeriod(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    try {
      await this.service.closePeriod(id, req.user.sub);
      return { success: true };
    } catch (e) {
      if (e instanceof PeriodHasOpenWorkdaysError) {
        throw new HttpException(
          {
            message: 'No se puede cerrar el periodo',
            openWorkdays: e.workdays,
          },
          HttpStatus.CONFLICT,
        );
      }
      throw e;
    }
  }

  @Roles(Role.EMPLOYEE)
  @Get("my-periods")
  async myPeriods(@Req() req: any) {
    const employeeId = req.user.userId;
    return this.service.listEmployeePeriods(employeeId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/employees')
  async listEmployees() {
    return this.service.listEmployees();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/employees/:id/history')
  async employeeHistory(
    @Param('id') employeeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.history(
      employeeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Roles(Role.EMPLOYEE)
  @Get('status')
  async status(@Req() req: any) {
    const employeeId = req.user.userId;
    return this.service.workdayStatus(employeeId);
  }

  @Roles(Role.EMPLOYEE)
  @Get("my-day")
  async myDay(
    @Req() req: any,
    @Query("date") date?: string,
  ) {
    const employeeId = req.user.userId;

    const targerDate =
      date ??
      new Date().toISOString().slice(0, 10);

    return this.attemdamceSummary.getDay(
      employeeId,
      targerDate,
    );
  }
}
