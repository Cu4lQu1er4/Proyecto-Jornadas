import { BadRequestException } from "@nestjs/common";

export function normalizeDay(date: string | Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function validateScopeMinutes(
  startMinute?: number,
  endMinute?: number,
) {
  const hasStart = startMinute !== undefined;
  const hasEnd = endMinute !== undefined;

  if (hasStart !== hasEnd) {
    throw new BadRequestException(
      'startMinute y endMinute deben venir juntos o null',
    );
  }

  if (!hasStart) return;

  if (startMinute! < 0 || endMinute! > 1440) {
    throw new BadRequestException(
      'startMinute debe ser menor que endMinute',
    );
  }
}

export function scopesOverlap(
  aStart: number | null,
  aEnd: number | null,
  bStart: number | null,
  bEnd: number | null,
): boolean {

  if (aStart === null || bStart === null) {
    return true;
  }

  if (aEnd === null || bEnd === null) {
    return true;
  }
  
  return aStart < bEnd && bStart < aEnd;
}