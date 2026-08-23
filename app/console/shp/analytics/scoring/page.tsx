'use client';
// SH110 — CI001 Scoring Overview: score distributions, top/bottom products, benchmarks.
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Section, RangePicker, DataGrid } from '@/components/CockpitKit';
import { useAnalytics, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';
import { ScoreExplain, HealthScore } from '@/components/ci/ScoreExplain';

export default function SH110Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('scoring', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Scoring" /><ForbiddenNote /></div>;

  const scoreGroups = d?.scores ? Object.entries(d.scores as Record<string, any>) : [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Scoring Overview" description="Product, customer, and content scores with drill-down explanations" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}

      {scoreGroups.map(([key, group]) => {
        const g = group as any;
        const summary = g?.summary;
        const results = (g?.results ?? []) as any[];
        const topResults = results.slice(0, 20);

        return (
          <Section key={key} title={g?.definition?.label?.en ?? key} defaultOpen>
            {summary && (
              <div className="flex items-center gap-4 mb-3 text-[12px]">
                <span>Scored: <strong>{summary.scored}</strong></span>
                <span>Suppressed: <strong>{summary.suppressed}</strong></span>
                <span>Avg: <strong>{summary.avg?.toFixed(1)}</strong></span>
                <HealthScore score={summary.avg ?? 0} />
              </div>
            )}
            {topResults.length > 0 && (
              <DataGrid
                rows={topResults}
                rowKey={(r: any) => `${r.entity_type}-${r.entity_id}`}
                columns={[
                  { header: 'Entity', value: (r: any) => `${r.entity_type} ${r.entity_id}`, sortable: false },
                  { header: 'Score', value: (r: any) => r.score !== null ? r.score.toFixed(1) : '—', sortable: true },
                  { header: 'Confidence', value: (r: any) => r.confidence !== null ? fmtPct(r.confidence * 100) : '—', sortable: true },
                  { header: 'Peer Level', value: (r: any) => (r.peer_level ?? '').replace(/_/g, ' '), sortable: false },
                  { header: 'Details', value: (r: any) => (
                    <ScoreExplain
                      score={r.score}
                      suppressed_reason={r.suppressed_reason}
                      components={r.components ?? {}}
                    />
                  ), sortable: false },
                ]}
              />
            )}
            {topResults.length === 0 && (
              <div className="text-[12px] text-[var(--muted)]">No scores computed yet. Run the score engine after benchmarks are populated.</div>
            )}
          </Section>
        );
      })}

      {scoreGroups.length === 0 && !error && (
        <div className="mt-6 text-[12px] text-[var(--muted)]">
          No score definitions found. Score engine requires R3 migration and ≥90 days of aggregated data.
        </div>
      )}
    </div>
  );
}
