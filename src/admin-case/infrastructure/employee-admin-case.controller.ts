import { 
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
  Query,
  Patch,
  Param,
  BadRequestException,
} from "@nestjs/common";
import { AdminCaseService } from "../application/admin-case.service";
import { CreateAdminCaseDto } from "../application/create-admin-case.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";

@Controller("employee/admin-cases")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMPLOYEE)
export class EmployeeAdminCaseController {
  constructor(
    private readonly service: AdminCaseService
  ) {}

  @Post()
  async create(
    @Body() dto: CreateAdminCaseDto,
    @Req() req: any,
  ) {
    dto.employeeId = req.user.userId;

    return this.service.createByEmployee(dto, req.user.userId);
  }

  @Get()
  async list(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.listByEmployee(
      req.user.userId,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Patch(":id/cancel")
  async cancel(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.service.cancelByEmployee(id, req.user.userId);
  }
}