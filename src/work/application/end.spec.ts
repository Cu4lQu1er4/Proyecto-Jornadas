import { EndWorkday } from "./end";
import { WorkdayOpenError } from "../domain/errors";
import { WorkdayRepo } from "../domain/repo";
import { WorkdayHistoryRepo } from "../domain/history.repo";

describe('EndWorkday (with history)', () => {
  const employeeId = 'EMP-1';
  const startTime = new Date('2026-01-01T08:00:00Z');
  const endTime = new Date('2026-01-01T19:00:00Z'); // 11h
  const baseMinutes = 600;

  function makeWorkdayRepo(hasOpenInitially: boolean): WorkdayRepo {
    let open = hasOpenInitially;

    const repo: WorkdayRepo = {
      async hasOpen() {
        return open;
      },

      async getStart() {
        return startTime;
      },

      async open() {
        open = true;
      },

      async close() {
        open = false;
      },
    };

    return repo;
  }

  function makeHistoryRepo() {
    const saved: any[] = [];

    const repo: WorkdayHistoryRepo = {
      async save(entry) {
        saved.push(entry);
      },
    };

    return { repo, saved };
  }

  it('lanza error si no hay jornada abierta', async () => {
    const workdayRepo = makeWorkdayRepo(false);
    const { repo: historyRepo } = makeHistoryRepo();

    const useCase = new EndWorkday(
      workdayRepo,
      historyRepo,
      baseMinutes,
    );

    await expect(
      useCase.execute({ employeeId, now: endTime })
    ).rejects.toBeInstanceOf(WorkdayOpenError);
  });

  it('cierra jornada, calcula minutos y guarda historico', async () => {
    const workdayRepo = makeWorkdayRepo(true);
    const history = makeHistoryRepo();

    const useCase = new EndWorkday(
      workdayRepo,
      history.repo,
      baseMinutes,
    );

    const result = await useCase.execute({
      employeeId,
      now: endTime,
    });

    expect(result.workedMinutes).toBe(660);
    expect(result.extraMinutes).toBe(60);

    expect(history.saved).toHaveLength(1);
    expect(history.saved[0]).toEqual({
      employeeId,
      startTime,
      endTime,
      workedMinutes: 660,
      extraMinutes: 60,
    });
  });
});
