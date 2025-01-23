import { WorkdayRepo } from '../domain/repo';
import { WorkdayOpenError } from '../domain/errors';

export interface StartCmd {
  employeeId: string;
  now: Date;
}

export class StartWorkday {
  constructor(private readonly repo: WorkdayRepo) {}

  async execute(cmd: StartCmd): Promise<void> {
    const { employeeId, now } = cmd;

    if (await this.repo.hasOpen(employeeId)) {
      throw new WorkdayOpenError();
    }

    await this.repo.open(employeeId, now);
  }
}
