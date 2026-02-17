import { Inject } from "@nestjs/common";
import { USER_REPO } from "../domain/user.repo";
import type { UserRepo } from "../domain/user.repo";
import { WORKDAY_REPO } from "src/work/domain/repo";
import type { WorkdayRepo } from "src/work/domain/repo";
import { WorkdayOpenError } from "src/work/domain/errors";

export class DeactivateEmployee {
  constructor(
    @Inject(USER_REPO)
    private readonly userRepo: UserRepo,

    @Inject(WORKDAY_REPO)
    private readonly workdayRepo: WorkdayRepo,
  ) {}

  async execute(employeeId: string): Promise<void> {
    const user = await this.userRepo.findById(employeeId);

    if (!user) {
      throw new Error("Empleado no encontrado");
    }

    const hasOpenWorkday = await this.workdayRepo.hasOpen(employeeId);

    if (hasOpenWorkday) {
      throw new WorkdayOpenError();
    }

    await this.userRepo.deactivate(employeeId);
  }
}