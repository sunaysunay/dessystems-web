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
