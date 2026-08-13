'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const money = (v: number) =>
  v ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : '—';

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', minWidth: 130 }}>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? 'var(--foreground)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px', textAlign: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>📈</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>No price data yet</div>
      <div style={{ fontSize: 13, color: 'var(--muted-foreground)', maxWidth: 420, lineHeight: 1.6 }}>
        DA005 needs at least one scraper run to show price trends.
        Once the scraper has collected listings, this screen will show cohort medians,
        price drop rates, and weekly acquisition trends.
      </div>
      <div style={{
        marginTop: 8, background: 'var(--muted)', borderRadius: 8, padding: '12px 20px',
        fontFamily: 'monospace', fontSize: 12, color: 'var(--muted-foreground)',
      }}>
        cd /root/scraper && node agent.mjs
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
        Run on the VPS to seed listings, then return to DA005.
      </div>
    </div>
  );
}

function CohortRow({ row, maxMedian }: { row: any; maxMedian: number }) {
  const barW = maxMedian > 0 ? (row.median / maxMedian) * 100 : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 90px 50px', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.make}</div>
      <div style={{ position: 'relative', height: 8, background: 'var(--muted)', borderRadius: 4, overflow: 'hidden' }}>
        {/* p25–p75 range band */}
        {row.p25 && row.p75 && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${(row.p25 / maxMedian) * 100}%`,
            width: `${((row.p75 - row.p25) / maxMedian) * 100}%`,
            background: '#6366f140', borderRadius: 2,
          }} />
        )}
        {/* median marker */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: 0, width: `${barW}%`,
          background: '#6366f1', borderRadius: 4,
        }} />
      </div>
      <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted-foreground)', textAlign: 'right' }}>{money(row.p25)}</div>
      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6366f1', fontWeight: 700, textAlign: 'right' }}>{money(row.median)}</div>
      <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted-foreground)', textAlign: 'right' }}>{money(row.p75)}</div>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'right' }}>{row.count}</div>
    </div>
  );
}

function WeeklyChart({ data }: { data: { week: string; count: number; avgPrice: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const hasData = data.some(d => d.count > 0);
  if (!hasData) return <div style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '20px 0' }}>No trend data yet — run the scraper first.</div>;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {data.map((d, i) => {
          const h = (d.count / maxCount) * 72;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {d.count > 0 && <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700 }}>{d.count}</div>}
              <div title={`${d.week}: ${d.count} events`} style={{
                width: '100%', background: d.count > 0 ? '#6366f1' : 'var(--muted)',
                borderRadius: '3px 3px 0 0', height: Math.max(h, 2),
                transition: 'height 0.3s',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted-foreground)', marginTop: 6 }}>
        <span>{data[0]?.week}</span>
        <span>{data[data.length - 1]?.week}</span>
      </div>
    </div>
  );
}

export default function DA005Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/bop/dae/pricing').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>;
  if (!data) return null;

  const isEmpty = data.totalListings === 0;
  const maxMedian = data.cohorts?.length > 0 ? Math.max(...data.cohorts.map((c: any) => c.median)) : 1;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <ScreenHeader
        title="Price Intelligence"
        description="DA005 — Cohort median prices, price drop rates and weekly acquisition trends"
      />

      {isEmpty ? <EmptyState /> : (
        <>
          {/* Stat tiles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
            <StatTile label="ACTIVE LISTINGS"   value={data.totalListings} />
            <StatTile label="PRICE EVENTS"      value={data.priceEvents}    sub="total history records" />
            <StatTile label="PRICE DROPS"       value={data.priceDropCount} sub="listings that got cheaper" color="#10b981" />
            <StatTile label="AVG DROP"          value={data.avgDropPct ? `${data.avgDropPct}%` : '—'} sub="avg reduction on drops" color="#10b981" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* Cohort medians */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Cohort Price Medians (by Make)</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 14 }}>
                Bar = median price. Shaded band = P25–P75 range. Based on active listings with matching make.
              </div>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 90px 90px 50px', gap: 12, padding: '0 0 8px', borderBottom: '2px solid var(--border)', marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Make</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Price range</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'right' }}>P25</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'right' }}>Median</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'right' }}>P75</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'right' }}>N</div>
              </div>
              {data.cohorts.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '16px 0' }}>No cohort data yet.</div>
                : data.cohorts.map((row: any) => <CohortRow key={row.make} row={row} maxMedian={maxMedian} />)
              }
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

            {/* Weekly trend */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Weekly Price Events (last 12 weeks)</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 14 }}>
                Each bar = number of price change events recorded that week.
              </div>
              <WeeklyChart data={data.weeklyTrend ?? []} />
            </div>

            {/* Source distribution */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Listings by Source</div>
              {Object.keys(data.bySource).length === 0
                ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No source data yet.</div>
                : Object.entries(data.bySource as Record<string, number>)
                    .sort((a, b) => b[1] - a[1])
                    .map(([src, n]) => {
                      const total = Object.values(data.bySource as Record<string, number>).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                      return (
                        <div key={src} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600 }}>{src}</span>
                            <span style={{ color: 'var(--muted-foreground)' }}>{n} ({pct}%)</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: 'var(--muted)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#6366f1', borderRadius: 3, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      );
                    })
              }
            </div>

          </div>
        </>
      )}
    </div>
  );
}
