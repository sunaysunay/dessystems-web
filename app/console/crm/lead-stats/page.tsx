'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const money = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const STAGE_COLOR: Record<string, string> = {
  new:        '#6366f1',
  contacted:  '#f59e0b',
  qualified:  '#3b82f6',
  won:        '#10b981',
  lost:       '#ef4444',
};
const STAGE_ORDER = ['new','contacted','qualified','won','lost'];

function MiniBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{label}</span>
        <span style={{ color: 'var(--muted-foreground)' }}>{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--muted)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  if (!data.length || Math.max(...data) === 0) return <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>No data yet</div>;
  const W = 280, H = 48, PAD = 4;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - v / max) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = 'M ' + pts.join(' L ');
  const areaD = `${pathD} L ${(PAD + W - PAD * 2).toFixed(1)},${H} L ${PAD},${H} Z`;
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <path d={areaD} fill={color} fillOpacity={0.1} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', minWidth: 130 }}>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? 'var(--foreground)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function CR003Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/bop/crm/lead-stats').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>;
  if (!data)   return null;

  const totalStage = STAGE_ORDER.reduce((s, k) => s + (data.byStage[k]?.count ?? 0), 0);
  const weekCounts: number[] = (data.weeklyTrend ?? []).map((w: any) => w.count);
  const sourceEntries = Object.entries(data.bySource as Record<string, number>).sort((a,b) => b[1]-a[1]);
  const lostEntries   = Object.entries(data.byLostReason as Record<string, number>).sort((a,b) => b[1]-a[1]);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <ScreenHeader title="Lead Statistics" description="CR003 — Pipeline funnel, source breakdown and conversion analytics" />

      {/* Stat tiles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <StatTile label="TOTAL LEADS"   value={data.total} />
        <StatTile label="PIPELINE VALUE" value={money(data.pipelineVal)} sub="open stages only" color="#6366f1" />
        <StatTile label="WIN RATE"      value={data.winRate !== null ? `${data.winRate}%` : '—'} color="#10b981" />
        <StatTile label="AVG DEAL"      value={data.avgDeal ? money(data.avgDeal) : '—'} />
        <StatTile label="WON"           value={data.byStage['won']?.count ?? 0} color="#10b981" />
        <StatTile label="LOST"          value={data.byStage['lost']?.count ?? 0} color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Stage funnel */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Stage Funnel</div>
          {totalStage === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No leads yet</div>
            : STAGE_ORDER.map(s => (
              <MiniBar key={s} label={s} count={data.byStage[s]?.count ?? 0} total={totalStage} color={STAGE_COLOR[s] ?? '#94a3b8'} />
            ))}
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            Pipeline value (open): <strong>{money(data.pipelineVal)}</strong>
          </div>
        </div>

        {/* Source breakdown */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Lead Sources</div>
          {sourceEntries.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No data</div>
            : sourceEntries.map(([src, n]) => (
              <MiniBar key={src} label={src} count={n} total={data.total} color="#6366f1" />
            ))}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

        {/* Weekly trend */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Weekly New Leads (last 12 weeks)</div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 12 }}>
            {weekCounts.reduce((s, v) => s + v, 0)} leads in period
          </div>
          <Sparkline data={weekCounts} color="#6366f1" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted-foreground)', marginTop: 4 }}>
            <span>{data.weeklyTrend?.[0]?.week}</span>
            <span>{data.weeklyTrend?.[data.weeklyTrend.length-1]?.week}</span>
          </div>
        </div>

        {/* Lost reasons */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Lost Reasons</div>
          {lostEntries.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No lost leads yet</div>
            : lostEntries.map(([reason, n]) => (
              <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ textTransform: 'capitalize' }}>{reason.replace(/_/g,' ')}</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>{n}</span>
              </div>
            ))}
        </div>

      </div>
    </div>
  );
}
