'use client';
// SH101 — CI001 Funnel: 6 stages, plane badges, consent-projection toggle.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { RangePicker, PlaneBadge, ConsentCoverageBadge } from '@/components/CockpitKit';
import { useAnalytics, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

const STAGE_LABELS: Record<string, string> = {
  sessions: 'Sessions', product_view: 'Product view', cart_add: 'Cart add',
  checkout: 'Checkout', payment: 'Payment', order: 'Order',
};

export default function SH101Page() {
  const [range, setRange] = useState(30);
  const [projected, setProjected] = useState(false);
  const { data: d, forbidden, error } = useAnalytics('funnel', range, projected ? 'projected=true' : '');

  if (forbidden) return <div className="p-6"><ScreenHeader title="Funnel" /><ForbiddenNote /></div>;

  const max = d?.stages?.[0]?.count || 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Conversion Funnel" description="Session → product view → cart → checkout → payment → order (Plane B, consent-gated)" />
        <div className="flex items-center gap-2">
          {d && <ConsentCoverageBadge ratePct={d.consent_rate_pct} />}
          <RangePicker value={range} onChange={setRange} />
        </div>
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-3">
          {d?.stages?.map((s: any) => (
            <div key={s.stage}>
              <div className="mb-1 flex items-baseline justify-between text-[12px]">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  {STAGE_LABELS[s.stage] ?? s.stage} <PlaneBadge plane="B" />
                </span>
                <span className="flex items-baseline gap-3">
                  {s.step_rate_pct != null && <span className="text-[10px] text-slate-400">→ {fmtPct(s.step_rate_pct)} of previous</span>}
                  <span className="text-[15px] font-bold text-slate-800">{fmtNum(s.count)}</span>
                </span>
              </div>
              <div className="h-6 rounded-lg bg-slate-100">
                <div className="h-full rounded-lg bg-sky-500" style={{ width: `${Math.max((s.count / max) * 100, 1.5)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-slate-600">
          <span>Observed CVR: <b>{fmtPct(d?.cvr_pct)}</b></span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={projected} onChange={e => setProjected(e.target.checked)} />
            Show consent-projected CVR
          </label>
          {projected && d?.cvr_projected_pct != null && (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
              CVR<sub>projected</sub>: <b>{fmtPct(d.cvr_projected_pct)}</b> — {d.projection_basis}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
