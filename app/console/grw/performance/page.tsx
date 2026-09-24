'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface Stats {
  range: number;
  totals: { campaigns: number; outputs: number; channels_active: number; clients: number; clients_external: number; clients_tenant: number };
  by_status: Record<string, number>;
  by_channel: Record<string, number>;
  by_locale: Record<string, number>;
  by_objective: Record<string, number>;
  daily_campaigns: Record<string, number>;
  daily_outputs: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500', generating: 'bg-amber-500', review: 'bg-blue-500',
  approved: 'bg-emerald-500', published: 'bg-green-600', failed: 'bg-red-500',
};

const CHANNEL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram',
  x: 'X (Twitter)', email: 'Email', telegram: 'Telegram',
  blog: 'Blog', google_business: 'Google Business',
};

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-24 text-right text-muted truncate">{label}</span>
      <div className="flex-1 h-5 bg-muted/10 rounded overflow-hidden">
        <div className={`h-full rounded ${color || 'bg-indigo-500'} transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="w-8 text-right font-mono">{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Sparkline({ data, days }: { data: Record<string, number>; days: number }) {
  const today = new Date();
  const points: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    points.push(data[key] || 0);
  }
  const max = Math.max(...points, 1);
  const w = 280;
  const h = 48;
  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-500" />
    </svg>
  );
}

export default function PerformancePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [mcpStatus, setMcpStatus] = useState<string>('checking');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bop/grw/stats?range=${range}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    fetch('/api/bop/grw/mcp')
      .then(r => r.json())
      .then(d => setMcpStatus(d.status))
      .catch(() => setMcpStatus('error'));
  }, []);

  const t = stats?.totals;
  const maxChannel = Math.max(...Object.values(stats?.by_channel || { _: 1 }));
  const maxLocale = Math.max(...Object.values(stats?.by_locale || { _: 1 }));
  const maxObjective = Math.max(...Object.values(stats?.by_objective || { _: 1 }));

  return (
    <div className="space-y-6">
      <ScreenHeader />

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">Period:</span>
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setRange(d)}
            className={`px-3 py-1 text-xs rounded-md border transition-colors ${range === d ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'border-border text-muted hover:bg-muted/10'}`}
          >
            {d}d
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={`inline-block w-2 h-2 rounded-full ${mcpStatus === 'connected' ? 'bg-green-500' : mcpStatus === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
          MCP Agent: {mcpStatus}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted text-sm py-12">Loading analytics...</div>
      ) : !stats ? (
        <div className="text-center text-muted text-sm py-12">Failed to load stats</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Campaigns" value={t?.campaigns ?? 0} />
            <StatCard label="Content Outputs" value={t?.outputs ?? 0} />
            <StatCard label="Channels Active" value={t?.channels_active ?? 0} />
            <StatCard label="Total Clients" value={t?.clients ?? 0} />
            <StatCard label="External Clients" value={t?.clients_external ?? 0} />
            <StatCard label="DES Tenants" value={t?.clients_tenant ?? 0} />
          </div>

          {/* Sparklines */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">Campaigns / day</div>
              <Sparkline data={stats.daily_campaigns} days={range} />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">Content outputs / day</div>
              <Sparkline data={stats.daily_outputs} days={range} />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-xs text-muted uppercase tracking-wider mb-3">Campaign Status</div>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status] || 'bg-zinc-400'}`} />
                  <span className="capitalize">{status}</span>
                  <span className="font-mono font-bold">{count}</span>
                </div>
              ))}
              {Object.keys(stats.by_status).length === 0 && <span className="text-xs text-muted">No campaigns yet</span>}
            </div>
          </div>

          {/* Channel / Locale / Objective breakdowns */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-xs text-muted uppercase tracking-wider mb-3">By Channel</div>
              <div className="space-y-2">
                {Object.entries(stats.by_channel).sort((a, b) => b[1] - a[1]).map(([ch, n]) => (
                  <Bar key={ch} label={CHANNEL_LABELS[ch] || ch} value={n} max={maxChannel} />
                ))}
                {Object.keys(stats.by_channel).length === 0 && <span className="text-xs text-muted">No data</span>}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-xs text-muted uppercase tracking-wider mb-3">By Language</div>
              <div className="space-y-2">
                {Object.entries(stats.by_locale).sort((a, b) => b[1] - a[1]).map(([loc, n]) => (
                  <Bar key={loc} label={loc.toUpperCase()} value={n} max={maxLocale} color="bg-teal-500" />
                ))}
                {Object.keys(stats.by_locale).length === 0 && <span className="text-xs text-muted">No data</span>}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="text-xs text-muted uppercase tracking-wider mb-3">By Objective</div>
              <div className="space-y-2">
                {Object.entries(stats.by_objective).sort((a, b) => b[1] - a[1]).map(([obj, n]) => (
                  <Bar key={obj} label={obj.replace(/_/g, ' ')} value={n} max={maxObjective} color="bg-amber-500" />
                ))}
                {Object.keys(stats.by_objective).length === 0 && <span className="text-xs text-muted">No data</span>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
