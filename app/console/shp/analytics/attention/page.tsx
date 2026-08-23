'use client';
// SH109 — CI001 Attention Center: prioritised findings.
// Serves data-health findings until the R4 rule engine (ci_attention_item) lands.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { RangePicker, Dot } from '@/components/CockpitKit';
import { useAnalytics, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, opportunity: 3 };
const SEV_DOT: Record<string, string> = { critical: 'red', high: 'amber', medium: 'amber', opportunity: 'green' };

export default function SH109Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('attention', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Attention Center" /><ForbiddenNote /></div>;

  const items = [...(d?.items ?? [])].sort(
    (a: any, b: any) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9),
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Attention Center" description="The things that need attention today, with evidence" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}
      {d?.note && <p className="mt-2 text-[11px] text-slate-400">{d.note}</p>}

      <div className="mt-4 space-y-2">
        {items.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500">
            Nothing needs attention right now.
          </div>
        )}
        {items.map((it: any, i: number) => (
          <div key={`${it.rule_id}-${i}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mt-1"><Dot status={SEV_DOT[it.severity] ?? 'amber'} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-800">{it.title}</span>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{it.severity}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {it.rule_id}{it.evidence ? ` · ${it.evidence}` : ''}
                {it.last_seen ? ` · last seen ${new Date(it.last_seen).toLocaleString('nl-NL')}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
