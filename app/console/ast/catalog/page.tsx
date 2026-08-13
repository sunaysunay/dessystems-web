'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const CATEGORY_EMOJI: Record<string, string> = {
  van: '🚐', car: '🚗', camper: '🏕️', truck: '🚚',
  boat: '⛵', trailer: '🚛', motorcycle: '🏍️', other: '🔲',
};

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', minWidth: 120 }}>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? 'var(--foreground)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function HBar({ label, count, total, color, emoji }: { label: string; count: number; total: number; color?: string; emoji?: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span>{emoji && `${emoji} `}<span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{label}</span></span>
        <span style={{ color: 'var(--muted-foreground)' }}>{count} <span style={{ opacity: 0.6 }}>({pct.toFixed(0)}%)</span></span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'var(--muted)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color ?? '#6366f1', borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

export default function IN001Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/bop/inv/catalog').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>;
  if (!data)   return null;

  const catEntries = Object.entries(data.byCategory as Record<string, number>).sort((a, b) => b[1] - a[1]);
  const healthPct  = data.total > 0 ? Math.round((data.active / data.total) * 100) : 0;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <ScreenHeader title="Catalog Overview" description="IN001 — Full catalog summary: inventory health, category and brand distribution" />

      {/* Stat tiles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <StatTile label="TOTAL LISTINGS"  value={data.total} />
        <StatTile label="ACTIVE"          value={data.active}   color="#10b981" />
        <StatTile label="DRAFT"           value={data.draft}    color="#f59e0b" />
        <StatTile label="ARCHIVED"        value={data.archive}  color="#94a3b8" />
        <StatTile label="HEALTH"          value={`${healthPct}%`} sub="active of total" color={healthPct >= 60 ? '#10b981' : '#f59e0b'} />
        <StatTile label="AVG DES SCORE"   value={data.avgScore ?? '—'} color="#6366f1" />
        <StatTile label="BRANDS"          value={data.brandCount} />
        <StatTile label="CATEGORIES"      value={data.categoryCount} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Category breakdown */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>By Vehicle Category</div>
          {catEntries.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No listings yet</div>
            : catEntries.map(([cat, n]) => (
              <HBar key={cat} label={cat} count={n} total={data.total}
                color="#6366f1" emoji={CATEGORY_EMOJI[cat] ?? '🔲'} />
            ))}
        </div>

        {/* Top brands */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Top Brands (by listing count)</div>
          {data.topBrands.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No brand data</div>
            : data.topBrands.map((b: any) => (
              <HBar key={b.name} label={b.name} count={b.count} total={data.total} color="#3b82f6" />
            ))}
        </div>

      </div>

      {/* Year distribution */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Year Distribution (last 10 years in catalog)</div>
        {data.yearTrend.length === 0
          ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No year data</div>
          : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 80 }}>
              {data.yearTrend.map((y: any) => {
                const maxCount = Math.max(...data.yearTrend.map((x: any) => x.count), 1);
                const h = (y.count / maxCount) * 70;
                return (
                  <div key={y.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1' }}>{y.count}</div>
                    <div style={{ width: '100%', background: '#6366f1', borderRadius: '3px 3px 0 0', height: h, minHeight: 2 }} />
                    <div style={{ fontSize: 10, color: 'var(--muted-foreground)', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', marginTop: 6 }}>{y.year}</div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}
