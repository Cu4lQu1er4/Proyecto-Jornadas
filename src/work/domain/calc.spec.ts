import { calcWork } from "./calc";

describe('calcWork', () => {
  const baseMinutes = 600;

  it('calcula minutos trabajados correctamente', () => {
    const start = new Date('2026-01-01T08:00:00Z');
    const end = new Date('2026-01-01T18:00:00Z');

    const result = calcWork(start, end, baseMinutes);

    expect(result.workedMinutes).toBe(600);
    expect(result.extraMinutes).toBe(0);
  });

  it('no se genera horas extra su no se supera la base', () => {
    const start = new Date('2026-01-01T08:00:00Z');
    const end = new Date('2026-01-01T17:00:00Z');

    const result = calcWork(start, end, baseMinutes);

    expect(result.extraMinutes).toBe(0);
  });

  it('lanza error si el fin es antes o igual al inicio', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    const end = new Date('2026-01-01T09:00:00Z');

    expect(() => calcWork(start, end, baseMinutes))
      .toThrow('END_BEFORE_START');
  });
});