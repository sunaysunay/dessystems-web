export interface ForecastResult {
  kr_id: string;
  kr_title: string;
  current_value: number;
  target: number;
  projected_value: number;
  projected_pct: number;
  trend: 'on_pace' | 'ahead' | 'behind';
  days_remaining: number;
  slope_per_day: number;
}

export function linearForecast(
  snapshots: { snapshot_date: string; value: number }[],
  target: number,
  baseline: number,
  periodEnd: string,
  direction: 'increase' | 'decrease',
): { projected: number; slope: number } {
  if (snapshots.length < 2) return { projected: snapshots[0]?.value ?? baseline, slope: 0 };

  const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const t0 = new Date(sorted[0].snapshot_date).getTime();
  const xs = sorted.map(s => (new Date(s.snapshot_date).getTime() - t0) / 86400000);
  const ys = sorted.map(s => s.value);
  const n = xs.length;

  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
  const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  const daysToEnd = (new Date(periodEnd).getTime() - t0) / 86400000;
  let projected = intercept + slope * daysToEnd;

  if (direction === 'decrease') {
    projected = Math.max(0, projected);
  }

  return { projected, slope };
}

export function forecastKr(
  kr: { id: string; title: string; baseline: number; target: number; current_value: number; direction: string },
  snapshots: { snapshot_date: string; value: number }[],
  periodEnd: string,
): ForecastResult {
  const { projected, slope } = linearForecast(
    snapshots, kr.target, kr.baseline, periodEnd,
    (kr.direction as 'increase' | 'decrease') ?? 'increase',
  );

  const range = kr.target - kr.baseline;
  const projectedPct = range !== 0 ? Math.max(0, Math.min(100, ((projected - kr.baseline) / range) * 100)) : 0;
  const daysRemaining = Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / 86400000));

  const diff = projected - kr.target;
  const trend = Math.abs(diff) / Math.max(1, Math.abs(range)) < 0.05 ? 'on_pace'
    : (kr.direction === 'increase' ? diff >= 0 : diff <= 0) ? 'ahead' : 'behind';

  return {
    kr_id: kr.id,
    kr_title: kr.title,
    current_value: kr.current_value,
    target: kr.target,
    projected_value: Math.round(projected * 100) / 100,
    projected_pct: Math.round(projectedPct * 100) / 100,
    trend,
    days_remaining: daysRemaining,
    slope_per_day: Math.round(slope * 100) / 100,
  };
}
