export function applyAdjustments(
  baseDelta: number,
  adjustments: { type: 'ADD' | 'SUBTRACT'; minutes: number }[],
): number {
  return adjustments.reduce((delta, adj) => {
    return adj.type === 'ADD'
      ? delta + adj.minutes
      : delta - adj.minutes;
  }, baseDelta);
}