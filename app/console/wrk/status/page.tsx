'use client';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface TimelineStep {
  key: string;
  label: string;
  status: 'done' | 'current' | 'upcoming';
}

interface WOStatus {
  wo_number: string;
  status: string;
  type: string;
  estimated_completion: string | null;
  created_at: string;
  status_timeline: TimelineStep[];
}

/* ── Timeline visualization ────────────────────────────────────────────────── */

function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="relative">
      {steps.map((step, i) => {
        const isDone = step.status === 'done';
        const isCurrent = step.status === 'current';
        const isLast = i === steps.length - 1;

        return (
          <div key={step.key} className="flex gap-4 relative">
            {/* Vertical line */}
            {!isLast && (
              <div className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-16px)] ${
                isDone ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
            {/* Circle */}
            <div className="flex-shrink-0 mt-1">
              <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 ${
                isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : isCurrent
                    ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400'
              }`}>
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : (
                  <span className="text-xs font-medium">{i + 1}</span>
                )}
              </div>
            </div>
            {/* Label */}
            <div className={`pb-8 pt-1 ${
              isDone ? 'text-emerald-700 dark:text-emerald-400' : isCurrent ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-400 dark:text-slate-500'
            }`}>
              <div className="text-sm">{step.label}</div>
              {isCurrent && <div className="text-xs mt-0.5 opacity-75">Huidige status</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */

export default function CustomerStatusPage() {
  const [woNumber, setWoNumber] = useState('');
  const [woData, setWoData] = useState<WOStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  function handleSearch() {
    if (!woNumber.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    fetch(`/api/bop/wrk/status?wo_number=${encodeURIComponent(woNumber.trim())}`)
      .then(r => {
        if (!r.ok) throw new Error('Work order not found');
        return r.json();
      })
      .then(d => setWoData(d.data))
      .catch(() => {
        setWoData(null);
        setError('Work order not found. Please check the number and try again.');
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      {/* Search form */}
      <div className="rounded-lg border bg-card p-6 max-w-xl">
        <h3 className="text-sm font-semibold mb-3">Work Order Status Lookup</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter WO number (e.g. WO-2024-001)"
            value={woNumber}
            onChange={e => setWoNumber(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !woNumber.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 max-w-xl">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {woData && (
        <div className="rounded-lg border bg-card p-6 max-w-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{woData.wo_number}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Type: {woData.type ?? '—'} &middot; Created: {new Date(woData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
              woData.status === 'completed' || woData.status === 'delivered'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
            }`}>
              {woData.status?.replace(/_/g, ' ') ?? 'unknown'}
            </span>
          </div>

          {woData.estimated_completion && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Estimated completion: <strong>{new Date(woData.estimated_completion).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>
              </p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider">Status Timeline</h4>
            <StatusTimeline steps={woData.status_timeline} />
          </div>
        </div>
      )}

      {/* Empty state after search */}
      {searched && !loading && !woData && !error && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground max-w-xl">
          <p className="text-sm">No results found</p>
        </div>
      )}
    </div>
  );
}
