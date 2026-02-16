import { USER_REPO } from "../domain/user.repo";
import type { UserRepo } from "../domain/user.repo";
import { Inject } from "@nestjs/common";

export interface EmployeeListItem {
  id: string;
  document: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  active: boolean;
  createdAt: Date;
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
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
      }));
  }
}