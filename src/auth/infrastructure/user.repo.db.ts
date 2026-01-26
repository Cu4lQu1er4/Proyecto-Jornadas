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

  async findByDocument(document: string): Promise<User | null> {
    console.log('LOOKING FOR USER:', document);

    const row = await this.prisma.user.findUnique({
      where: { document },
    });

    console.log('ROW FROM DB:', row);

    if (!row) return null;

    return {
      id: row.id,
      document: row.document,
      passwordHash: row.passwordHash,
      role: row.role as any,
      active: row.active,
      createdAt: row.createdAt,
    };
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if(!row) return null;

    return {
      id: row.id,
      document: row.document,
      passwordHash: row.passwordHash,
      role: row.role as any,
      active: row.active,
      createdAt: row.createdAt,
    };
  }

  async create(data: {
    document: string;
    passwordHash: string;
    role: string;
  }): Promise<User> {
    const row = await this.prisma.user.create({
      data,
    });

    return {
      id: row.id,
      document: row.document,
      passwordHash: row.passwordHash,
      role: row.role as Role,
      active: row.active,
      createdAt: row.createdAt,
    };
  }

  async findAll(): Promise<User[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return rows.map(row => ({
      id: row.id,
      document: row.document,
      passwordHash: row.passwordHash,
      role: row.role as Role,
      active: row.active,
      createdAt: row.createdAt,
    }));
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
  }
}