import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UserRepo } from "../domain/user.repo";
import { User } from "../domain/user";
import { Role } from "../roles.enum";

@Injectable()
export class UserRepoDb implements UserRepo {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private mapRow(row: any): User {
    return {
      id: row.id,
      document: row.document,
      passwordHash: row.passwordHash,
      role: row.role as Role,
      active: row.active,
      createdAt: row.createdAt,
      firstName: row.firstName ?? null,
      lastName: row.lastName ?? null,
      pinHash: row.pinHash ?? null,
      failedPinAttempts: row.failedAttempts ?? 0,
      pinLockedUntil: row.pinLockedUntil ?? null,
    };
  }

  async findByDocument(document: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { document },
    });

    if (!row) return null;

    return this.mapRow(row);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!row) return null;

    return this.mapRow(row);
  }

  async create(data: {
    document: string;
    passwordHash: string;
    role: string;
  }): Promise<User> {
    const row = await this.prisma.user.create({
      data,
    });

    return this.mapRow(row);
  }

  async findAll(): Promise<User[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return rows.map(row => this.mapRow(row));
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
  }
}