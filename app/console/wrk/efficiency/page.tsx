'use client';

import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Kpi } from '@/components/CockpitKit';
import DataGrid, { Column, StatusBadge } from '@/components/DataGrid';

// ── Types ───────────────────────────────────────────────────────────────────

interface TechRow {
  display_name: string;
  grade: string;
  standard_hours: number;
  present_hours: number;
  efficiency_pct: number;
}

interface SummaryData {
  avg_efficiency: number;
  total_standard_hours: number;
  total_present_hours: number;
  by_technician: TechRow[];
}

interface DailyPoint {
  date: string;
  efficiency_pct: number;
  standard_hours: number;
  present_hours: number;
}

interface Technician {
  id: string;
  display_name: string;
  grade: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function endOfMonth(d: Date): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Period = 'week' | 'month' | 'last_month' | 'custom';

function periodRange(p: Period): { from: string; to: string } {
  const now = new Date();
  switch (p) {
    case 'week':
      return { from: startOfWeek(now), to: today() };
    case 'month':
      return { from: startOfMonth(now), to: today() };
    case 'last_month': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    default:
      return { from: startOfMonth(now), to: today() };
  }
}

// ── Efficiency gauge SVG ────────────────────────────────────────────────────

function EfficiencyGauge({ value }: { value: number }) {
  const clampedValue = Math.min(Math.max(value, 0), 120);
  const startAngle = 135; // 7 o'clock
  const totalSweep = 270;
  const valueAngle = (clampedValue / 120) * totalSweep;
  const r = 80;
  const cx = 100;
  const cy = 100;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(start: number, sweep: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(start + sweep);
    const large = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const color = value >= 85 ? '#22c55e' : value >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto">
      {/* Background arc */}
      <path
        d={arcPath(startAngle, totalSweep)}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Value arc */}
      {valueAngle > 0 && (
        <path
          d={arcPath(startAngle, valueAngle)}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
        />
      )}
      {/* Center text */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        className="text-[28px] font-bold"
        fill={color}
      >
        {value.toFixed(1)}%
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        className="text-[10px]"
        fill="#94a3b8"
      >
        Efficiency
      </text>
      {/* Scale labels */}
      <text x={polarToCartesian(startAngle).x - 8} y={polarToCartesian(startAngle).y + 16} className="text-[9px]" fill="#94a3b8">0</text>
      <text x={polarToCartesian(startAngle + totalSweep).x - 4} y={polarToCartesian(startAngle + totalSweep).y + 16} className="text-[9px]" fill="#94a3b8">120</text>
    </svg>
  );
}

// ── Daily trend sparkline SVG ───────────────────────────────────────────────

function DailyTrendChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-slate-400 py-8">
        No daily data available for this period
      </div>
    );
  }

  const w = 600;
  const h = 200;
  const padLeft = 40;
  const padRight = 10;
  const padTop = 10;
  const padBottom = 30;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;
  const maxY = 120;

  function xPos(i: number) {
    return padLeft + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  }

  function yPos(v: number) {
    return padTop + plotH - (Math.min(v, maxY) / maxY) * plotH;
  }

  const points = data.map((d, i) => `${xPos(i)},${yPos(d.efficiency_pct)}`).join(' ');

  // Show every Nth label to avoid overlap
  const labelStep = Math.max(1, Math.ceil(data.length / 10));

  const gridLines = [0, 30, 60, 90, 120];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {gridLines.map((v) => (
        <g key={v}>
          <line
            x1={padLeft}
            y1={yPos(v)}
            x2={w - padRight}
            y2={yPos(v)}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
          <text x={padLeft - 4} y={yPos(v) + 3} textAnchor="end" className="text-[9px]" fill="#94a3b8">
            {v}
          </text>
        </g>
      ))}

      {/* Target line at 85% */}
      <line
        x1={padLeft}
        y1={yPos(85)}
        x2={w - padRight}
        y2={yPos(85)}
        stroke="#f59e0b"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text x={w - padRight + 2} y={yPos(85) + 3} className="text-[8px]" fill="#f59e0b">
        85%
      </text>

      {/* Data polyline */}
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={xPos(i)}
          cy={yPos(d.efficiency_pct)}
          r="3"
          fill="#3b82f6"
        />
      ))}

      {/* X-axis date labels */}
      {data.map((d, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={xPos(i)}
            y={h - 4}
            textAnchor="middle"
            className="text-[8px]"
            fill="#94a3b8"
          >
            {d.date.slice(5)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function EfficiencyKpiPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(startOfMonth(new Date()));
  const [customTo, setCustomTo] = useState(today());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  // Data entry state
  const [showEntry, setShowEntry] = useState(false);
  const [quickEntry, setQuickEntry] = useState(false);
  const [entryDate, setEntryDate] = useState(today());
  const [entryTechId, setEntryTechId] = useState('');
  const [entryStdHours, setEntryStdHours] = useState('');
  const [entryPresHours, setEntryPresHours] = useState('');
  const [batchRows, setBatchRows] = useState<Record<string, { standard: string; present: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  // Resolve date range
  const range = period === 'custom'
    ? { from: customFrom, to: customTo }
    : periodRange(period);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const qs = `from=${range.from}&to=${range.to}`;

    Promise.all([
      fetch(`/api/bop/wrk/efficiency?view=summary&${qs}`).then((r) => r.json()),
      fetch(`/api/bop/wrk/efficiency?view=daily&${qs}`).then((r) => r.json()),
      fetch('/api/bop/wrk/technicians?active=true&limit=100').then((r) => r.json()),
    ]).then(([sumRes, dayRes, techRes]) => {
      if (cancelled) return;
      setSummary(sumRes.error ? null : sumRes);
      setDaily(dayRes.data ?? []);
      setTechnicians(techRes.data ?? []);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  // Init batch rows when technicians load
  useEffect(() => {
    if (technicians.length > 0 && Object.keys(batchRows).length === 0) {
      const init: Record<string, { standard: string; present: string }> = {};
      for (const t of technicians) {
        init[t.id] = { standard: '', present: '' };
      }
      setBatchRows(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicians]);

  // Single submit
  async function handleSingleSubmit() {
    if (!entryTechId || !entryDate) return;
    setSubmitting(true);
    setSubmitMsg('');
    try {
      const res = await fetch('/api/bop/wrk/efficiency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: entryDate,
          technician_id: entryTechId,
          standard_hours: Number(entryStdHours) || 0,
          present_hours: Number(entryPresHours) || 0,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setSubmitMsg(`Error: ${json.error}`);
      } else {
        setSubmitMsg('Saved successfully');
        setEntryStdHours('');
        setEntryPresHours('');
      }
    } catch {
      setSubmitMsg('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // Batch submit
  async function handleBatchSubmit() {
    const items = Object.entries(batchRows)
      .filter(([, v]) => v.standard || v.present)
      .map(([techId, v]) => ({
        date: entryDate,
        technician_id: techId,
        standard_hours: Number(v.standard) || 0,
        present_hours: Number(v.present) || 0,
      }));

    if (items.length === 0) {
      setSubmitMsg('No data entered');
      return;
    }

    setSubmitting(true);
    setSubmitMsg('');
    try {
      const res = await fetch('/api/bop/wrk/efficiency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', items }),
      });
      const json = await res.json();
      if (json.error) {
        setSubmitMsg(`Error: ${json.error}`);
      } else {
        setSubmitMsg(`Saved ${json.count} records`);
        const reset: Record<string, { standard: string; present: string }> = {};
        for (const t of technicians) reset[t.id] = { standard: '', present: '' };
        setBatchRows(reset);
      }
    } catch {
      setSubmitMsg('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Technician table columns ──────────────────────────────────────────

  const techColumns: Column<TechRow>[] = [
    {
      key: 'display_name',
      header: 'Technician',
      sortable: true,
      value: (r) => r.display_name,
    },
    {
      key: 'grade',
      header: 'Grade',
      width: '100px',
      render: (r) => <StatusBadge status={r.grade?.toLowerCase() ?? 'draft'} label={r.grade} />,
      value: (r) => r.grade,
    },
    {
      key: 'standard_hours',
      header: 'Std Hours',
      align: 'right',
      sortable: true,
      width: '110px',
      render: (r) => r.standard_hours.toFixed(1),
      value: (r) => r.standard_hours,
    },
    {
      key: 'present_hours',
      header: 'Present Hours',
      align: 'right',
      sortable: true,
      width: '120px',
      render: (r) => r.present_hours.toFixed(1),
      value: (r) => r.present_hours,
    },
    {
      key: 'efficiency_pct',
      header: 'Efficiency %',
      align: 'right',
      sortable: true,
      width: '110px',
      render: (r) => {
        const color = r.efficiency_pct >= 85
          ? 'text-emerald-600'
          : r.efficiency_pct >= 70
            ? 'text-amber-600'
            : 'text-red-600';
        return <span className={`font-semibold ${color}`}>{r.efficiency_pct.toFixed(1)}%</span>;
      },
      value: (r) => r.efficiency_pct,
    },
    {
      key: 'bar',
      header: '',
      width: '160px',
      render: (r) => {
        const pct = Math.min(r.efficiency_pct, 120);
        const widthPct = (pct / 120) * 100;
        const bg = r.efficiency_pct >= 85
          ? 'bg-emerald-500'
          : r.efficiency_pct >= 70
            ? 'bg-amber-500'
            : 'bg-red-500';
        return (
          <div className="w-full bg-slate-100 rounded h-3">
            <div className={`${bg} h-3 rounded`} style={{ width: `${widthPct}%` }} />
          </div>
        );
      },
    },
  ];

  // ── Period button helper ──────────────────────────────────────────────

  function PeriodBtn({ label, val }: { label: string; val: Period }) {
    const active = period === val;
    return (
      <button
        onClick={() => setPeriod(val)}
        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
          active
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        {label}
      </button>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  const eff = summary?.avg_efficiency ?? 0;

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <PeriodBtn label="This Week" val="week" />
        <PeriodBtn label="This Month" val="month" />
        <PeriodBtn label="Last Month" val="last_month" />
        <PeriodBtn label="Custom" val="custom" />
        {period === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            />
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Overall Efficiency" value={`${eff.toFixed(1)}%`} delta={null} />
        <Kpi label="Standard Hours" value={summary?.total_standard_hours ?? 0} />
        <Kpi label="Present Hours" value={summary?.total_present_hours ?? 0} />
        <Kpi label="Revenue / Hour" value="EUR 85" />
      </div>

      {/* Gauge + Trend side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge */}
        <div className="rounded-xl border bg-white p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Efficiency Gauge
          </h3>
          <EfficiencyGauge value={eff} />
        </div>

        {/* Daily trend */}
        <div className="lg:col-span-2 rounded-xl border bg-white p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Daily Efficiency Trend
          </h3>
          <DailyTrendChart data={daily} />
        </div>
      </div>

      {/* Technician breakdown */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Technician Breakdown
        </h3>
        <DataGrid
          columns={techColumns}
          rows={summary?.by_technician ?? []}
          rowKey={(r) => r.display_name}
          loading={loading}
          emptyMessage="No efficiency data for this period"
          defaultSort={{ key: 'efficiency_pct', dir: 'desc' }}
        />
      </div>

      {/* Data entry section */}
      <div className="rounded-xl border bg-white">
        <button
          onClick={() => setShowEntry(!showEntry)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-sm font-semibold text-slate-700">Record Daily Metrics</span>
          <span className="text-slate-400 text-lg">{showEntry ? '▲' : '▼'}</span>
        </button>

        {showEntry && (
          <div className="px-6 pb-6 space-y-4 border-t pt-4">
            {/* Quick entry toggle */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-500">Quick Entry</label>
              <button
                onClick={() => setQuickEntry(!quickEntry)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  quickEntry ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    quickEntry ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Date picker (shared) */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-500 w-20">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </div>

            {!quickEntry ? (
              /* Single entry mode */
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-500 w-20">Technician</label>
                  <select
                    value={entryTechId}
                    onChange={(e) => setEntryTechId(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm min-w-[200px]"
                  >
                    <option value="">Select...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.display_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-500 w-20">Std Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={entryStdHours}
                    onChange={(e) => setEntryStdHours(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm w-24"
                    placeholder="0.0"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-500 w-20">Present Hrs</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={entryPresHours}
                    onChange={(e) => setEntryPresHours(e.target.value)}
                    className="border rounded px-2 py-1.5 text-sm w-24"
                    placeholder="0.0"
                  />
                </div>
                <button
                  onClick={handleSingleSubmit}
                  disabled={submitting || !entryTechId}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            ) : (
              /* Quick entry mode: all technicians */
              <div className="space-y-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b">
                      <th className="pb-2">Technician</th>
                      <th className="pb-2 w-28">Std Hours</th>
                      <th className="pb-2 w-28">Present Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicians.map((t) => (
                      <tr key={t.id} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-700">{t.display_name}</td>
                        <td className="py-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={batchRows[t.id]?.standard ?? ''}
                            onChange={(e) =>
                              setBatchRows((prev) => ({
                                ...prev,
                                [t.id]: { ...prev[t.id], standard: e.target.value },
                              }))
                            }
                            className="border rounded px-2 py-1 text-sm w-20"
                            placeholder="0.0"
                          />
                        </td>
                        <td className="py-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={batchRows[t.id]?.present ?? ''}
                            onChange={(e) =>
                              setBatchRows((prev) => ({
                                ...prev,
                                [t.id]: { ...prev[t.id], present: e.target.value },
                              }))
                            }
                            className="border rounded px-2 py-1 text-sm w-20"
                            placeholder="0.0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={handleBatchSubmit}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Submit All'}
                </button>
              </div>
            )}

            {submitMsg && (
              <p className={`text-xs font-medium ${submitMsg.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                {submitMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
