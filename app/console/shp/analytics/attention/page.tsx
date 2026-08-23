'use client';
import { useState, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { RangePicker, Dot } from '@/components/CockpitKit';
import { useAnalytics, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, opportunity: 3 };
const SEV_DOT: Record<string, string> = { critical: 'red', high: 'amber', medium: 'amber', opportunity: 'green' };
const SEV_LABEL: Record<string, string> = {
  critical: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700',
  medium: 'bg-slate-100 text-slate-600', opportunity: 'bg-emerald-100 text-emerald-700',
};
const STATUS_LABEL: Record<string, string> = {
  actioned: 'bg-emerald-100 text-emerald-700', dismissed: 'bg-slate-100 text-slate-500', expired: 'bg-orange-100 text-orange-600',
};
const MAX_CRITICAL_HIGH = 5;

export default function SH109Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error, reload } = useAnalytics('attention', range);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [outcomeNote, setOutcomeNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleAction = useCallback(async (itemId: number, action: 'action' | 'dismiss') => {
    const res = await fetch('/api/bop/shop/analytics/attention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, item_id: itemId, outcome_note: outcomeNote || null }),
    });
    if (res.ok) {
      setActioningId(null);
      setOutcomeNote('');
      reload();
    }
  }, [outcomeNote, reload]);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Attention Center" /><ForbiddenNote /></div>;

  const allItems = [...(d?.items ?? [])].sort(
    (a: any, b: any) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9),
  );

  const critHigh = allItems.filter((it: any) => it.severity === 'critical' || it.severity === 'high');
  const rest = allItems.filter((it: any) => it.severity !== 'critical' && it.severity !== 'high');
  const capped = critHigh.length > MAX_CRITICAL_HIGH;
  const shown = [...critHigh.slice(0, MAX_CRITICAL_HIGH), ...rest];
  const history = d?.history ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Attention Center" description="Prioritised findings with evidence and outcome tracking" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}
      {d?.note && <p className="mt-2 text-[11px] text-slate-400">{d.note}</p>}

      {capped && (
        <p className="mt-2 text-[11px] text-amber-600">
          Showing top {MAX_CRITICAL_HIGH} of {critHigh.length} critical/high items. Resolve some to see more.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {shown.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500">
            Nothing needs attention right now.
          </div>
        )}
        {shown.map((it: any) => (
          <div key={it.id ?? `${it.rule_id}-${it.title}`} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1"><Dot status={SEV_DOT[it.severity] ?? 'amber'} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-slate-800">{it.title}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV_LABEL[it.severity] ?? SEV_LABEL.medium}`}>
                    {it.severity}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {it.rule_id}
                  {it.group_count > 1 ? ` · ${it.group_count} occurrences` : ''}
                  {it.last_seen ? ` · last seen ${new Date(it.last_seen).toLocaleString('nl-NL')}` : ''}
                </div>
                {it.detail && typeof it.detail === 'object' && Object.keys(it.detail).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {Object.entries(it.detail).slice(0, 4).map(([k, v]) => (
                      <span key={k} className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {k}: {typeof v === 'number' ? (v % 1 ? v.toFixed(2) : v) : String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {it.id && it.source !== 'data_health' && (
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                {actioningId === it.id ? (
                  <>
                    <input value={outcomeNote} onChange={e => setOutcomeNote(e.target.value)}
                      placeholder="Outcome note (optional)…"
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] focus:border-blue-400 focus:outline-none" />
                    <button onClick={() => handleAction(it.id, 'action')}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">
                      Confirm action
                    </button>
                    <button onClick={() => handleAction(it.id, 'dismiss')}
                      className="rounded-lg bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-300">
                      Dismiss
                    </button>
                    <button onClick={() => { setActioningId(null); setOutcomeNote(''); }}
                      className="text-[11px] text-slate-400 hover:text-slate-600">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setActioningId(it.id)}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">
                      Take action
                    </button>
                    <button onClick={() => handleAction(it.id, 'dismiss')}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowHistory(!showHistory)}
            className="text-[12px] font-semibold text-slate-500 hover:text-slate-700">
            {showHistory ? '▾' : '▸'} Recent history ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {history.map((h: any) => (
                <div key={h.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_LABEL[h.status] ?? STATUS_LABEL.dismissed}`}>
                    {h.status}
                  </span>
                  <span className="flex-1 text-[12px] text-slate-600">{h.title}</span>
                  {h.outcome_note && <span className="text-[11px] italic text-slate-400">{h.outcome_note}</span>}
                  <span className="text-[10px] text-slate-400">{h.actioned_at ? new Date(h.actioned_at).toLocaleDateString('nl-NL') : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
