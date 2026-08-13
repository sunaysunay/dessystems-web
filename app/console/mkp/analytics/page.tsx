'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const CATEGORY_EMOJI: Record<string, string> = {
  van: '🚐', car: '🚗', camper: '🏕️', truck: '🚚',
  boat: '⛵', trailer: '🚛', motorcycle: '🏍️', other: '🔲',
};
const CATEGORY_COLOR: Record<string, string> = {
  van: '#6366f1', car: '#3b82f6', camper: '#f59e0b', truck: '#10b981',
  boat: '#06b6d4', trailer: '#8b5cf6', motorcycle: '#f97316', other: '#94a3b8',
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

function HBar({ label, count, total, color, emoji }: { label: string; count: number; total: number; color: string; emoji?: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ fontWeight: 600 }}>{emoji} {label}</span>
        <span style={{ color: 'var(--muted-foreground)' }}>{count} <span style={{ opacity: 0.6 }}>({pct.toFixed(0)}%)</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--muted)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function Sparkline({ data, color = '#6366f1', weeks }: { data: number[]; color?: string; weeks?: string[] }) {
  if (!data.length || Math.max(...data) === 0) return <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No trend data yet</div>;
  const W = 340, H = 52, PAD = 4;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = PAD + (1 - v / max) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
          const y = PAD + (1 - v / max) * (H - PAD * 2);
          return <circle key={i} cx={x} cy={y} r={3} fill={color}><title>{v} listings</title></circle>;
        })}
      </svg>
      {weeks && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted-foreground)', marginTop: 2 }}>
          <span>{weeks[0]}</span><span>{weeks[weeks.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

function ScoreBucket({ range, count, max }: { range: string; count: number; max: number }) {
  const color = range === '76-100' ? '#10b981' : range === '51-75' ? '#6366f1' : range === '26-50' ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginBottom: 4 }}>{range}</div>
      <div style={{ height: 40, background: 'var(--muted)', borderRadius: 4, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <div style={{ width: '100%', background: color, height: `${max > 0 ? (count / max) * 100 : 0}%`, transition: 'height 0.4s' }} />
      </div>
    </div>
  );
}

export default function MP002Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/bop/mkp/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>;
  if (!data)   return null;

  const weekCounts: number[] = (data.weeklyTrend ?? []).map((w: any) => w.count);
  const weekLabels: string[] = (data.weeklyTrend ?? []).map((w: any) => w.week);
  const catEntries = Object.entries(data.byCategory as Record<string, number>).sort((a,b) => b[1]-a[1]);
  const pubRate = data.total > 0 ? Math.round((data.liveCount / data.total) * 100) : 0;
  const maxBucket = Math.max(...Object.values(data.scoreBuckets as Record<string, number>), 1);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <ScreenHeader title="Channel Analytics" description="MP002 — Inventory publication health, category mix and listing velocity" />

      {/* Stat tiles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <StatTile label="TOTAL LISTINGS"  value={data.total} />
        <StatTile label="LIVE"            value={data.liveCount}  sub="active + published" color="#10b981" />
        <StatTile label="DRAFT"           value={data.draftCount} color="#f59e0b" />
        <StatTile label="AUCTION"         value={data.auctionCount} color="#6366f1" />
        <StatTile label="PUB RATE"        value={`${pubRate}%`}   sub="of total" color={pubRate >= 70 ? '#10b981' : '#f59e0b'} />
        <StatTile label="AVG DES SCORE"   value={data.avgScore ?? '—'} color="#6366f1" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Category mix */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Category Mix</div>
          {catEntries.map(([cat, n]) => (
            <HBar key={cat} label={cat} count={n} total={data.total}
              color={CATEGORY_COLOR[cat] ?? '#94a3b8'} emoji={CATEGORY_EMOJI[cat] ?? '🔲'} />
          ))}
        </div>

        {/* Status breakdown */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Status Breakdown</div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>BY STATUS</div>
            {Object.entries(data.byStatus as Record<string, number>).sort((a,b) => b[1]-a[1]).map(([s, n]) => (
              <HBar key={s} label={s} count={n} total={data.total} color={s === 'active' ? '#10b981' : s === 'draft' ? '#f59e0b' : '#94a3b8'} />
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>BY PUBLICATION</div>
            {Object.entries(data.byWorkflow as Record<string, number>).sort((a,b) => b[1]-a[1]).map(([s, n]) => (
              <HBar key={s} label={s} count={n} total={data.total} color={s === 'published' ? '#6366f1' : '#94a3b8'} />
            ))}
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

        {/* Weekly velocity */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Listing Velocity (last 12 weeks)</div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 12 }}>
            {weekCounts.reduce((s, v) => s + v, 0)} new listings in period
          </div>
          <Sparkline data={weekCounts} color="#6366f1" weeks={weekLabels} />
        </div>

        {/* DES score distribution */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>DES Score Distribution</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {Object.entries(data.scoreBuckets as Record<string, number>).map(([range, count]) => (
              <ScoreBucket key={range} range={range} count={count} max={maxBucket} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 12 }}>
            Avg: <strong>{data.avgScore ?? '—'}</strong> / 100
          </div>
        </div>

      </div>
    </div>
  );
}
