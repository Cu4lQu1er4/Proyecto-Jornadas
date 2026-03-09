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
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import { AdminCaseService } from "../application/admin-case.service";
import { CreateAdminCaseDto } from "../application/create-admin-case.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";
import { AdminCaseStatus } from "@prisma/client";
import { FilesInterceptor } from "@nestjs/platform-express";

@Controller("employee/admin-cases")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMPLOYEE)
export class EmployeeAdminCaseController {
  constructor(
    private readonly service: AdminCaseService
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor("files", 5))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Req() req: any,
  ) {
    let scopesParsed: any[] = [];
    try {
      scopesParsed = typeof body.scopes === "string" ? JSON.parse(body.scopes) : body.scopes;
    } catch {
      throw new BadRequestException("scopes invalido (debe ser JSON)");
    }

    const dto: CreateAdminCaseDto = {
      employeeId: req.user.userId,
      type: body.type,
      notes: body.notes || null,
      reasonCode: body.reasonCode || null,
      scopes: scopesParsed,
    };

    return this.service.createByEmployeeWithEvidence(dto, req.user.userId, files || []);
  }

  @Get()
  async list(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: AdminCaseStatus,
  ) {
    return this.service.listByEmployee(
      req.user.userId,
      Number(page) || 1,
      Number(limit) || 10,
      status,
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