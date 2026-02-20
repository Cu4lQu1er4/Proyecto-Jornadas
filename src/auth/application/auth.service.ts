import { USER_REPO } from "../domain/user.repo";
import type { UserRepo } from "../domain/user.repo";
import { User } from "../domain/user";
import * as bcrypt from "bcrypt";
import { Inject } from "@nestjs/common";
import { ChangePasswordDto, ChangePinDto, UpdateProfileDto } from "../dto/uodate-profile.dto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

export class AuthService {
  constructor(
    @Inject(USER_REPO)
    private readonly userRepo: UserRepo,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(
    document: string,
    password: string
  ): Promise<User | null> {
    const user = await this.userRepo.findByDocument(document);

    if (!user) return null;
    if (!user.active) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: any = {};

    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.email !== undefined) data.email = dto.email.trim();

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        document: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        active: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) throw new NotFoundException("Usuario no existe");

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException({
        code: "INVALID_PASSWORD",
        message: "Contraseña actual incorrecta",
      });
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashed,
        mustChangePassword: false,
      },
    });

    return { success: true };
  }

  async changePin(userId: string, dto: ChangePinDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pinHash: true },
    });

    if (!user) throw new NotFoundException("Usuario no existe");

    if (user.pinHash) {
      if (!dto.currentPin) {
        throw new BadRequestException({
          code: "CURRENT_PIN_REQUIRED",
          message: "Debes ingresar el PIN actual",
        });
      }

      const ok = await bcrypt.compare(dto.currentPin, user.pinHash);
      if (!ok) {
        throw new BadRequestException({
          code: "INVALID_PIN",
          message: "PIN actual incorrecto",
        });
      }
    }

    const hashed = await bcrypt.hash(dto.newPin, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pinHash: hashed,
      },
    });

    return { success: true };
  }

  async adminResetPassword(employeeId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: employeeId },
    });

    if (!user) {
      throw new NotFoundException("Usuario no existe");
    }

    const tempPassword = Math.random().toString(36).slice(-8);

    const hashed = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id: employeeId },
      data: {
        passwordHash: hashed,
        mustChangePassword: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        entityType: "USER",
        entityId: employeeId,
        action: "ADMIN_RESET_PASSWORD",
        performedBy: adminId,
        metadata: {},
      },
    });

    return {
      temporaryPassword: tempPassword,
    };
  }

  async adminResetPin(employeeId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: employeeId },
    });

    if (!user) {
      throw new NotFoundException("Usuario no existe");
    }

    const temporaryPin = Math.floor(1000 + Math.random() * 9000).toString();

    const hashed = await bcrypt.hash(temporaryPin, 10);

    await this.prisma.user.update({
      where: { id: employeeId },
      data: {
        pinHash: hashed,
        mustChangePin: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        entityType: "USER",
        entityId: employeeId,
        action: "ADMIN_RESET_PIN",
        performedBy: adminId,
        metadata: {}
      },
    });

    return {
      temporaryPin,
    }
  }
}