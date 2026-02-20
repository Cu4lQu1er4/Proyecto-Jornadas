import { 
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
  Req,
  Get,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { AdminCaseService } from "../application/admin-case.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";

@Controller("admin/admin-cases")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCaseController {
  constructor(
    private readonly service: AdminCaseService
  ) {}

  @Patch(":id/approve")
  async approve(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.service.apply(id, req.user.userId);
  }

  @Patch(":id/reject")
  async reject(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @Req() req: any,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException("Debe indicar un motivo de rechazo");
    }

    return this.service.reject(id, reason, req.user.userId);
  }
}