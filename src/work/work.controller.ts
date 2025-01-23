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
} from "@nestjs/common";
import type { Request } from "express";
import { WorkService } from "./work.service";
import { WorkdayOpenError } from "./domain/errors";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";

@UseGuards(JwtAuthGuard)
@Controller("work")
export class WorkController {
  constructor(private readonly service: WorkService) {}

  @Roles(Role.EMPLOYEE)
  @Post("start")
  async start(@Req() req: Request) {
    const employeeId = (req.user as any).userId;

    try {
      await this.service.start(employeeId);
      return { status: "OK" };
    } catch (e) {
      if (e instanceof WorkdayOpenError) {
        throw new HttpException(
          "Jornada ya abierta",
          HttpStatus.CONFLICT
        );
      }
      throw e;
    }
  }

  @Roles(Role.EMPLOYEE)
  @Post("end")
  async end(@Req() req: Request) {
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
}
