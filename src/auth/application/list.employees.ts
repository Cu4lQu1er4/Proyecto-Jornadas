import { USER_REPO } from "../domain/user.repo";
import type { UserRepo } from "../domain/user.repo";
import { Inject } from "@nestjs/common";

export interface EmployeeListItem {
  id: string;
  document: string;
  role: string;
  active: boolean;
  createdAt: Date;
  firstName: string | null;
  lastName: string | null;
}

export class ListEmployees {
  constructor(
    @Inject(USER_REPO)
    private readonly userRepo: UserRepo,
  ) {}

  async execute(): Promise<EmployeeListItem[]> {
    const users = await this.userRepo.findAll();

    return users
      .filter(u => u.role === "EMPLOYEE")
      .map(u => ({
        id: u.id,
        document: u.document,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
      }));
  }
}