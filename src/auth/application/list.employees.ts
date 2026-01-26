import { USER_REPO } from "../domain/user.repo";
import type { UserRepo } from "../domain/user.repo";
import { Inject } from "@nestjs/common";

export interface EmployeeListItem {
  id: string;
  document: string;
  role: string;
  activate: boolean;
  createdAt: Date;
}

export class ListEmployees {
  constructor(
    @Inject(USER_REPO)
    private readonly userRepo: UserRepo,
  ) {}

  async execute(): Promise<EmployeeListItem[]> {
    const users = await this.userRepo.findAll();

    return users.map(u => ({
      id: u.id,
      document: u.document,
      role: u.role,
      activate: u.active,
      createdAt: u.createdAt,
    }));
  }
}