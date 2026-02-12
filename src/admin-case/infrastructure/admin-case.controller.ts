import { 
  Body, 
  Controller,
  Param,
  Post,
  Patch,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  Get,
  Query,
} from "@nestjs/common";
import { AdminCaseService } from "../application/admin-case.service";
import { CreateAdminCaseDto } from "../application/create-admin-case.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";

@Controller('admin-cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCaseController {
  constructor(
    private readonly service: AdminCaseService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateAdminCaseDto, @Req() req: any) {
    try {
      return await this.service.createDraft(dto, req.user.sub);
    } catch (e: any) {
      if (e.message === 'PERIOD_CLOSED') {
        throw new HttpException(
          { code: 'PERIOD_CLOSED', message: 'El periodo esta cerrado' },
          HttpStatus.CONFLICT,
        );
      }
      throw e;
    }
  }

  @Patch(':id/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async apply(@Param('id') id: string, @Req() req: any) {
    try {
      return await this.service.apply(id, req.user.sub);
    } catch (e: any) {
      if (e.message === 'CASE_ALREADY_APPLIED') {
        throw new HttpException(
          { code: 'CASE_ALREADY_APPLIED', message: 'El caso ya fue aplicado' },
          HttpStatus.CONFLICT,
        );
      }
      throw e;
    }
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.service.cancel(id, reason, req.user.sub);
  }

  @Get()
  async list (@Query("employeeId") employeeId: string) {
    if (!employeeId) {
      throw new HttpException(
        { code: "EMPLOYEE_ID_REQUIRED" },
        HttpStatus.BAD_REQUEST
      );
    }

    return this.service.listByEmployee(employeeId);
  }
}