import { 
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
  Req,
  Get,
  Query,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { AdminCaseService } from "../application/admin-case.service";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { Role } from "src/auth/roles.enum";
import { AdminCaseStatus } from "@prisma/client";
import { CreateAdminCaseDto } from "../application/create-admin-case.dto";
import type { Response } from "express";
import { v2 as cloudinary } from "cloudinary";

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
    return this.service.approve(id, req.user.userId);
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

  @Patch(":id/cancel")
  async cancel(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @Req() req: any,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException("Debe indicar un motivo de cancelacion");
    }

    return this.service.cancel(id, reason, req.user.userId);
  }

  @Get()
  async list(
    @Query("employeeId") employeeId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: AdminCaseStatus,
  ) {
    if (!employeeId) {
      throw new BadRequestException("employeeId es requerido")
    }

    return this.service.listByEmployee(
      employeeId,
      Number(page) || 1,
      Number(limit) || 10,
      status,
    );
  }

  @Post()
  async create(
    @Body() dto: CreateAdminCaseDto,
    @Req() req: any,
  ) {
    if (!dto.employeeId) {
      throw new BadRequestException("employeeId es requerido");
    }

    return this.service.createByAdmin(dto, req.user.userId);
  }

  @Get("attachments/:id")
  @Roles(Role.ADMIN)
  async getAttachment(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const attachment = await this.service.findAttachmentById(id);

    console.log("Attachment from DB:", attachment);

    if (!attachment) {
      throw new NotFoundException("Archivo no encontrado");
    }

    const result = await cloudinary.api.resource(
      attachment.publicId,
      { resource_type: attachment.resourceType }
    );

    const fileUrl = result.secure_url;

    console.log("Fetching from Cloudinary:", attachment.url);
    const response = await fetch(fileUrl);
    console.log("Cloudinary status:", response.status);

    if (!response.ok) {
      throw new HttpException(
        'No se pudo obtener el archivo',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set({
      'Content-Type': attachment.resourceType === 'raw'
        ? 'application/pdf'
        : 'image/jpeg',
      'Content-Disposition': 'inline',
    });

    res.send(buffer);
  }
}