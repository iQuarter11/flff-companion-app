/**
 * Central weight config for Power Rankings — deliberately not
 * ESPN standings order (see docs/analytics.md). Change weights here, not
 * in the calculation code.
 */
export const POWER_RANKING_WEIGHTS = {
  allPlay: 0.3,
  points: 0.25,
  recent: 0.2,
  record: 0.15,
  roster: 0.1,
} as const;

const totalWeight = Object.values(POWER_RANKING_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(totalWeight - 1) > 1e-9) {
  throw new Error(`POWER_RANKING_WEIGHTS must sum to 1, got ${totalWeight}`);
}
