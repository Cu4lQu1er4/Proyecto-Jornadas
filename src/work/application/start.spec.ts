import { StartWorkday } from "./start";
import { WorkdayOpenError } from "../domain/errors";
import { WorkdayRepo } from "../domain/repo";

describe('StartWorkday', () => {
  const employeeId = 'EMP-1';
  const now = new Date('2026-01-01T08:00:00Z');

  function makeRepo(hasOpenInitially: boolean): WorkdayRepo {
    let open = hasOpenInitially;

    return {
      async hasOpen() {
        return open;
      },

      async open() {
        open = true;
      },

      async getStart() {
        throw new Error('NOT_USED');
      },

      async close() {
        throw new Error('NOT_USED');
      },
    };
  }

  it('abre una jornada si no hay una abierta', async () => {
    const repo = makeRepo(false);
    const useCase = new StartWorkday(repo);

    await useCase.execute({ employeeId, now });

    expect(await repo.hasOpen(employeeId)).toBe(true);
  });

  it('lanza error si ya existe una jornada abierta', async () => {
    const repo = makeRepo(true);
    const useCase = new StartWorkday(repo);

    await expect(
      useCase.execute({ employeeId, now })
    ).rejects.toBeInstanceOf(WorkdayOpenError);
  });
});