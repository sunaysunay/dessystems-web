'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

type Run = {
  id: string;
  job_id: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  pages_fetched: number | null;
  listings_seen: number | null;
  listings_saved: number | null;
  listings_updated: number | null;
  errors: number | null;
  error_log: string | null;
  dae_search_jobs: { name: string; dae_sources: { platform_name: string; platform_code: string } | null } | null;
};

const PLATFORM_FLAG: Record<string, string> = {
  marktplaats: '🇳🇱', '2dehands': '🇧🇪', kleinanzeigen: '🇩🇪',
  autoscout24: '🇪🇺', mobile_de: '🇩🇪', leboncoin: '🇫🇷',
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  running:   { bg: '#dbeafe', color: '#1e40af' },
  done:      { bg: '#d1fae5', color: '#065f46' },
  failed:    { bg: '#fee2e2', color: '#991b1b' },
  cancelled: { bg: '#f1f5f9', color: '#475569' },
};

function duration(start: string, end: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  if (ms < 60000)  return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export default function DA004Page() {
  const [runs,    setRuns]    = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/bop/dae/runs?limit=50');
    const j   = await res.json();
    setRuns(j.runs ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 };
  const thStyle:   React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--muted)', whiteSpace: 'nowrap' };

  const totalListings = runs.reduce((s, r) => s + (r.listings_saved ?? 0), 0);
  const failedRuns    = runs.filter(r => r.status === 'failed').length;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <ScreenHeader title="Run History" description="DA004 — Scraper run log: pages, listings, errors per run" />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[['Total runs', runs.length], ['Listings saved', totalListings], ['Failed runs', failedRuns]].map(([label, val]) => (
          <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: label === 'Failed runs' && Number(val) > 0 ? '#ef4444' : 'var(--foreground)' }}>{val}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => { void load(); }} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>
      ) : runs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>
          No runs yet. Start the scraper: <code style={{ fontFamily: 'monospace', fontSize: 12 }}>cd /root/scraper && node agent.mjs</code>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Job / Platform</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Pages</th>
                <th style={thStyle}>Seen</th>
                <th style={thStyle}>Saved</th>
                <th style={thStyle}>Updated</th>
                <th style={thStyle}>Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => {
                const job = r.dae_search_jobs;
                const src = job?.dae_sources;
                const sc  = STATUS_COLOR[r.status] ?? { bg: '#f1f5f9', color: '#475569' };
                const isExpanded = expanded === r.id;
                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => setExpanded(isExpanded ? null : r.id)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: r.error_log ? 'pointer' : 'default' }}
                    >
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(r.started_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={cellStyle}>
                        {job ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{job.name}</div>
                            {src && <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{PLATFORM_FLAG[src.platform_code] ?? '🌐'} {src.platform_name}</div>}
                          </div>
                        ) : <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                      </td>
                      <td style={cellStyle}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: sc.bg, color: sc.color }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 12 }}>
                        {duration(r.started_at, r.finished_at)}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{r.pages_fetched ?? '—'}</td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{r.listings_seen ?? '—'}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', color: (r.listings_saved ?? 0) > 0 ? '#10b981' : 'var(--foreground)', fontWeight: 600 }}>
                        {r.listings_saved ?? '—'}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{r.listings_updated ?? '—'}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', color: (r.errors ?? 0) > 0 ? '#ef4444' : 'var(--muted-foreground)', fontWeight: (r.errors ?? 0) > 0 ? 600 : 400 }}>
                        {r.errors ?? 0}
                        {r.error_log && <span style={{ marginLeft: 4, fontSize: 11 }}>▾</span>}
                      </td>
                    </tr>
                    {isExpanded && r.error_log && (
                      <tr key={`${r.id}-err`}>
                        <td colSpan={9} style={{ padding: '8px 12px', background: '#fff1f2', borderBottom: '1px solid var(--border)' }}>
                          <pre style={{ fontSize: 11, fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', color: '#991b1b', maxHeight: 200, overflowY: 'auto' }}>
                            {r.error_log}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
