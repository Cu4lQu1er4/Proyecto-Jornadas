import { BreakRule } from "./rules";

function toHM(time: string): { h: number; m: number } {
  const [hStr, mStr] = time.split(":");
  return { h: Number(hStr), m: Number(mStr) };
}

export function applyBreaks(
  start: Date,
  end: Date,
  breaks: BreakRule[],
): number {
  let deductedMinutes = 0;

  for (const br of breaks) {
    const { h: sh, m: sm } = toHM(br.start);
    const { h: eh, m: em } = toHM(br.end);

    const breakStart = new Date(start);
    breakStart.setHours(sh, sm, 0, 0);

    const breakEnd = new Date(start);
    breakEnd.setHours(eh, em, 0, 0);

    const overlapStart = Math.max(start.getTime(), breakStart.getTime());
    const overlapEnd = Math.min(end.getTime(), breakEnd.getTime());

    if (overlapEnd > overlapStart) {
      deductedMinutes += (overlapEnd - overlapStart) / 1000 / 60;
    }
  }

  return deductedMinutes;
}