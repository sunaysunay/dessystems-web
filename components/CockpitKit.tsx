'use client';
// Shared cockpit primitives: KPI tile with delta, SVG sparkline, h-bar rows,
// status dot, range picker. Keep dependency-free (pure SVG).
import React from 'react';

export function Kpi({ label, value, delta, prev }: { label: string; value: number | string; delta?: number | null; prev?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[24px] font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString('nl-NL') : value}</span>
        {delta !== null && delta !== undefined && (
          <span className={`text-[11px] font-bold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {prev !== undefined && <div className="text-[10px] text-slate-300">prev: {prev.toLocaleString('nl-NL')}</div>}
    </div>
  );
}

// ── CI001 extensions (CI-T16) ──────────────────────────────────────────────

export function PlaneBadge({ plane }: { plane: 'A' | 'B' }) {
  const style = plane === 'A'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-sky-50 text-sky-700 border-sky-200';
  const title = plane === 'A'
    ? 'Plane A — server-side truth, always complete'
    : 'Plane B — consent-gated behavioural data';
  return (
    <span title={title} className={`inline-flex items-center rounded border px-1 text-[9px] font-bold leading-4 ${style}`}>
      {plane}
    </span>
  );
}

export function ConsentCoverageBadge({ ratePct }: { ratePct: number | null }) {
  if (ratePct == null) return null;
  const c = ratePct >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : ratePct >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-600 border-red-200';
  return (
    <span title="Share of sessions with analytics consent — Plane B figures cover only these"
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${c}`}>
      consent {ratePct.toFixed(0)}%
    </span>
  );
}

export interface KpiComparisonBase {
  /** Previous-period value, formatted the same way as `value`. */
  prev: number | string;
  /** What the base is, e.g. "vs prev 30 d". */
  label: string;
  /** Percent change vs the base; null when the base is zero. */
  changePct: number | null;
}

/**
 * CI001 KPI card (plan §7.1). The comparison base is MANDATORY — a number
 * without a base is a decoration, and omitting `base` is a type error that
 * fails `des-build`/lint.
 */
export function KpiCard({ label, value, plane, base, n, footnote, suppressed }: {
  label: string;
  value: number | string;
  plane: 'A' | 'B';
  base: KpiComparisonBase;
  /** Sample size, e.g. order count behind the number. */
  n?: number;
  /** Extra context line, e.g. "p75 of last 12 months". */
  footnote?: string;
  /** Render as suppressed (insufficient data) instead of showing the value. */
  suppressed?: string;
}) {
  const fmt = (v: number | string) => typeof v === 'number' ? v.toLocaleString('nl-NL') : v;
  const d = base.changePct;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        <PlaneBadge plane={plane} />
      </div>
      {suppressed ? (
        <div className="mt-1 text-[13px] font-semibold text-slate-400">{suppressed}</div>
      ) : (
        <>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[24px] font-bold text-slate-800">{fmt(value)}</span>
            {d !== null && (
              <span className={`text-[11px] font-bold ${d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {d > 0 ? '▲' : d < 0 ? '▼' : '•'} {Math.abs(d)}%
              </span>
            )}
          </div>
          <div className="mt-1 border-t border-slate-100 pt-1 text-[10px] text-slate-400">
            {base.label} ({fmt(base.prev)})
          </div>
        </>
      )}
      {(footnote || n != null) && (
        <div className="text-[10px] text-slate-300">
          {[footnote, n != null ? `n=${n.toLocaleString('nl-NL')}` : null].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
}

// ── end CI001 extensions ───────────────────────────────────────────────────

export function Spark({ data, height = 40, color = '#6366f1', targetLine }: { data: number[]; height?: number; color?: string; targetLine?: number }) {
  if (!data.length) return null;
  const w = 220, max = Math.max(...data, targetLine ?? 0, 1);
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * w},${height - (v / max) * (height - 4) - 2}`).join(' ');
  const targetY = targetLine != null ? height - (targetLine / max) * (height - 4) - 2 : null;
  return (
    <svg width={w} height={height} className="overflow-visible">
      {targetY != null && (
        <line x1={0} y1={targetY} x2={w} y2={targetY} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />
      )}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

export function Bars({ rows, color = 'bg-indigo-400', format }: { rows: { label: string; value: number; extra?: string }[]; color?: string; format?: (n: number) => string }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="space-y-1.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-2 text-[11px]">
          <span className="w-40 truncate text-slate-600" title={r.label}>{r.label}</span>
          <div className="h-3.5 flex-1 rounded bg-slate-100">
            <div className={`h-full rounded ${color}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="w-14 text-right font-semibold text-slate-700">{format ? format(r.value) : r.value.toLocaleString('nl-NL')}</span>
          {r.extra && <span className="w-16 text-right text-[10px] text-slate-400">{r.extra}</span>}
        </div>
      ))}
    </div>
  );
}

export function Dot({ status }: { status: 'green' | 'amber' | 'red' | string }) {
  const c = status === 'green' ? 'bg-emerald-500' : status === 'amber' ? 'bg-amber-400' : 'bg-red-500';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}

export function RangePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
      {[7, 14, 30, 90].map(n => (
        <button key={n} onClick={() => onChange(n)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${value === n ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
          {n}d
        </button>
      ))}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
