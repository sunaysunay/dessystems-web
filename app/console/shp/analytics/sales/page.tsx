'use client';
// SH102 — CI001 Sales: trend + margin waterfall (sums exactly to contribution).
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Section, RangePicker, Spark, PlaneBadge } from '@/components/CockpitKit';
import { WaterfallChart } from '@/components/Charts';
import { useAnalytics, fmtEur, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

const STEP_LABELS: Record<string, string> = {
  net_revenue: 'Net revenue',
  cogs: 'COGS',
  payment_fees: 'Payment fees',
  other_costs: 'Shipping delta + pick/pack',
  contribution: 'Contribution',
};

export default function SH102Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('sales', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Sales" /><ForbiddenNote /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Sales & Margin" description="Net sales trend and the canonical contribution waterfall — ex-VAT, EUR, net of returns" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {d?.totals && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] lg:grid-cols-6">
          {[
            ['Net sales', fmtEur(d.totals.net_sales_cents)],
            ['Gross', fmtEur(d.totals.gross_sales_cents)],
            ['Discounts', fmtEur(d.totals.discount_cents)],
            ['Refunds', fmtEur(d.totals.refund_cents)],
            ['Orders', fmtNum(d.totals.orders)],
            ['Items', fmtNum(d.totals.items_sold)],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{l}</div>
              <div className="mt-0.5 text-[16px] font-bold text-slate-800">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Margin waterfall" right={<PlaneBadge plane="A" />}>
          {d?.waterfall && (
            <WaterfallChart steps={d.waterfall.map((s: any) => ({
              label: STEP_LABELS[s.step] ?? s.step,
              cents: s.cents,
              isTotal: s.step === 'contribution',
            }))} />
          )}
          {d && <p className="mt-3 text-[11px] text-slate-500">Contribution margin: <b>{fmtPct(d.contribution_margin_pct)}</b> — waterfall sums exactly to contribution</p>}
        </Section>
        <Section title="Daily net sales / contribution">
          {d?.daily && (
            <>
              <Spark data={d.daily.map((r: any) => r.net_sales_cents / 100)} height={48} />
              <Spark data={d.daily.map((r: any) => r.contribution_cents / 100)} height={48} color="#10b981" />
            </>
          )}
        </Section>
      </div>
    </div>
  );
}
