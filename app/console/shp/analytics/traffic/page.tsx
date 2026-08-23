'use client';
// SH105 — CI001 Traffic: sources, MER/POAS (contribution-based), campaigns.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Section, RangePicker, Bars, KpiCard, ConsentCoverageBadge } from '@/components/CockpitKit';
import { useAnalytics, fmtEur, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

export default function SH105Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('traffic', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Traffic" /><ForbiddenNote /></div>;

  const t = d?.totals;
  const s = d?.spend;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Traffic & Marketing" description="Sessions, sources and profitability of spend — POAS uses contribution, not revenue" />
        <div className="flex items-center gap-2">
          {t && <ConsentCoverageBadge ratePct={t.consent_rate_pct} />}
          <RangePicker value={range} onChange={setRange} />
        </div>
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {t && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Sessions" value={fmtNum(t.sessions)} plane="B"
            base={{ prev: fmtNum(t.prev_sessions), label: `vs prev ${range} d`, changePct: t.change_pct }} />
          <KpiCard label="Bounce rate" value={fmtPct(t.bounce_rate_pct)} plane="B"
            base={{ prev: '—', label: 'of sessions', changePct: null }} n={t.sessions} />
          <KpiCard label="Ad spend" value={fmtEur(s?.total_spend_eur_cents)} plane="A"
            base={{ prev: '—', label: 'imported ex-VAT', changePct: null }} />
          <KpiCard label="POAS" value={s?.poas ?? '—'} plane="A"
            base={{ prev: s?.mer ?? '—', label: 'MER (net sales / spend)', changePct: null }}
            footnote="POAS = contribution / spend" />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Campaigns by sessions">
          {d?.campaigns && <Bars color="bg-sky-400" rows={d.campaigns.slice(0, 12).map((c: any) => ({
            label: [c.utm_source, c.utm_campaign].filter(Boolean).join(' / '),
            value: c.sessions,
            extra: `${c.orders} ord`,
          }))} />}
          {s?.roas_note && <p className="mt-2 text-[10px] text-slate-400">{s.roas_note}</p>}
        </Section>
        <Section title="Campaigns by contribution">
          {d?.campaigns && <Bars color="bg-emerald-400" rows={[...d.campaigns]
            .sort((a: any, b: any) => b.contribution_cents - a.contribution_cents)
            .slice(0, 12).map((c: any) => ({
              label: [c.utm_source, c.utm_campaign].filter(Boolean).join(' / '),
              value: Math.max(c.contribution_cents / 100, 0),
              extra: fmtEur(c.contribution_cents),
            }))} format={n => `€${Math.round(n).toLocaleString('nl-NL')}`} />}
        </Section>
      </div>
    </div>
  );
}
