'use client';

// ─── Bar Chart ────────────────────────────────────────────────────────────────
interface BarItem { label: string; value: number }
interface BarChartProps { data: BarItem[]; height?: number }

export function BarChart({ data, height = 160 }: BarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-3 pt-2" style={{ height }}>
      {data.map(d => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5" style={{ height: '100%' }}>
          <div className="flex w-full flex-1 items-end">
            <div
              className="mx-auto w-3/5 rounded-t-[6px]"
              style={{
                height: `${Math.max(Math.round((d.value / max) * 100), 2)}%`,
                background: 'linear-gradient(180deg,#4f46e5,#8b5cf6)',
                transition: 'height .5s cubic-bezier(.2,.8,.2,1)',
              }}
            />
          </div>
          <span className="tabular-nums text-[11px] text-slate-400">{d.value}</span>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Funnel Chart ─────────────────────────────────────────────────────────────
interface FunnelStage { label: string; value: number; color?: string }
interface FunnelChartProps { stages: FunnelStage[]; labelWidth?: number }

export function FunnelChart({ stages, labelWidth = 96 }: FunnelChartProps) {
  const max = stages[0]?.value ?? 1;
  return (
    <div className="flex flex-col gap-2.5">
      {stages.map(s => {
        const pct = Math.max(Math.round((s.value / max) * 100), 4);
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span
              className="shrink-0 text-right text-[12.5px] text-slate-500 dark:text-slate-400"
              style={{ width: labelWidth }}
            >
              {s.label}
            </span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-[6px] bg-indigo-50 dark:bg-indigo-950/40">
              <div
                className="flex h-full items-center justify-end rounded-[6px] pr-2.5"
                style={{
                  width: `${pct}%`,
                  background: s.color ?? 'linear-gradient(90deg,#4f46e5,#8b5cf6)',
                  transition: 'width .6s cubic-bezier(.2,.8,.2,1)',
                }}
              >
                <span className="text-[11.5px] font-semibold text-white">
                  {s.value.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mini Sparkline (inline trend) ───────────────────────────────────────────
interface SparklineProps { values: number[]; color?: string; height?: number; width?: number }

export function Sparkline({ values, color = '#4f46e5', height = 32, width = 80 }: SparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Waterfall (CI001, CI-T18) ───────────────────────────────────────────────
// Steps carry signed cents; the final step is the resulting total. Rendered as
// floating bars so each step visually starts where the previous ended.
export interface WaterfallStep { label: string; cents: number; isTotal?: boolean }

export function WaterfallChart({ steps, height = 180, format }: {
  steps: WaterfallStep[];
  height?: number;
  format?: (cents: number) => string;
}) {
  if (!steps.length) return null;
  const fmt = format ?? ((c: number) => `€${(c / 100).toLocaleString('nl-NL')}`);
  let running = 0;
  const bars = steps.map(s => {
    const start = s.isTotal ? 0 : running;
    const end = s.isTotal ? s.cents : running + s.cents;
    if (!s.isTotal) running = end;
    return { ...s, lo: Math.min(start, end), hi: Math.max(start, end) };
  });
  const max = Math.max(...bars.map(b => b.hi), 1);
  const colW = 100 / steps.length;
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {bars.map((b, i) => (
          <div key={i} className="relative flex-1" style={{ height: '100%' }}>
            <div
              className={`absolute w-full rounded ${b.isTotal ? 'bg-emerald-500' : b.cents >= 0 ? 'bg-indigo-400' : 'bg-red-300'}`}
              style={{
                bottom: `${(b.lo / max) * 100}%`,
                height: `${Math.max(((b.hi - b.lo) / max) * 100, 1)}%`,
              }}
              title={`${b.label}: ${fmt(b.cents)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 truncate text-center text-[9px] text-slate-500" title={b.label}>
            {b.label}
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {bars.map((b, i) => (
          <div key={i} className={`flex-1 truncate text-center text-[9px] font-semibold ${b.cents < 0 && !b.isTotal ? 'text-red-500' : 'text-slate-700'}`}>
            {fmt(b.cents)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Heatmap (CI001, CI-T22) ─────────────────────────────────────────────────
// Generic intensity grid: rows × cols with a 0..max colour scale. Used for
// cohort retention (rows = cohorts, cols = M1..M12) and activity grids.
export function HeatmapChart({ rows, maxValue, format }: {
  rows: { label: string; cells: (number | null)[] }[];
  maxValue?: number;
  format?: (v: number) => string;
}) {
  if (!rows.length) return null;
  const max = maxValue ?? Math.max(...rows.flatMap(r => r.cells.map(c => c ?? 0)), 1);
  const fmt = format ?? ((v: number) => v.toLocaleString('nl-NL'));
  const shade = (v: number | null) => {
    if (v == null) return 'transparent';
    const t = Math.min(v / max, 1);
    return `rgba(79, 70, 229, ${0.08 + t * 0.82})`;
  };
  return (
    <div className="space-y-0.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-1">
          <span className="w-24 shrink-0 truncate text-[10px] text-slate-500" title={r.label}>{r.label}</span>
          {r.cells.map((c, i) => (
            <div key={i}
              className="h-5 flex-1 rounded-sm text-center text-[9px] leading-5"
              style={{ background: shade(c), color: c != null && c / max > 0.55 ? '#fff' : '#475569' }}
              title={c == null ? '—' : fmt(c)}>
              {c == null ? '' : fmt(c)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
