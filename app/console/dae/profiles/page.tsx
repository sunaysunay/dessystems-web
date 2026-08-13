'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

type Job = {
  id: string;
  source_id: string;
  name: string;
  keywords: string | null;
  filters: any;
  schedule_cron: string | null;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  dae_sources: { platform_name: string; platform_code: string } | null;
};

const PLATFORM_FLAG: Record<string, string> = {
  marktplaats: '🇳🇱', '2dehands': '🇧🇪', kleinanzeigen: '🇩🇪',
  autoscout24: '🇪🇺', mobile_de: '🇩🇪', leboncoin: '🇫🇷',
};

export default function DA002Page() {
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  async function load() {
    setLoading(true);
    const res = await fetch('/api/bop/dae/profiles');
    const j   = await res.json();
    setJobs(j.jobs ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch('/api/bop/dae/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    setJobs(js => js.map(j => j.id === id ? { ...j, enabled } : j));
    showToast(enabled ? 'Job enabled' : 'Job disabled');
  }

  const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 };
  const thStyle:   React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--muted)', whiteSpace: 'nowrap' };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <ScreenHeader title="Search Profiles" description="DA002 — Search job definitions: keywords, filters and schedule" />

      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, background: '#1e293b', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 200 }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{jobs.length} search job{jobs.length !== 1 ? 's' : ''}</div>
        <button onClick={() => { void load(); }} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>
      ) : jobs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>No search jobs found. Seed via M61 migration.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Platform</th>
                <th style={thStyle}>Keywords</th>
                <th style={thStyle}>Filters</th>
                <th style={thStyle}>Schedule</th>
                <th style={thStyle}>Last run</th>
                <th style={thStyle}>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => {
                const filters = j.filters ?? {};
                const filterStr = Object.entries(filters)
                  .filter(([, v]) => v !== null)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ') || '—';
                const src = j.dae_sources;
                const lastRun = j.last_run_at
                  ? `${Math.floor((Date.now() - new Date(j.last_run_at).getTime()) / 3600000)}h ago`
                  : 'never';
                return (
                  <tr key={j.id}>
                    <td style={{ ...cellStyle, fontWeight: 600 }}>{j.name}</td>
                    <td style={cellStyle}>
                      {src ? `${PLATFORM_FLAG[src.platform_code] ?? '🌐'} ${src.platform_name}` : '—'}
                    </td>
                    <td style={{ ...cellStyle, color: j.keywords ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                      {j.keywords ?? '—'}
                    </td>
                    <td style={{ ...cellStyle, fontSize: 11, color: 'var(--muted-foreground)', maxWidth: 200 }}>{filterStr}</td>
                    <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 12 }}>{j.schedule_cron ?? 'manual'}</td>
                    <td style={{ ...cellStyle, color: 'var(--muted-foreground)' }}>{lastRun}</td>
                    <td style={cellStyle}>
                      <button
                        onClick={() => { void toggleEnabled(j.id, !j.enabled); }}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, cursor: 'pointer', border: 'none',
                          background: j.enabled ? '#d1fae5' : '#fee2e2',
                          color:      j.enabled ? '#065f46' : '#991b1b',
                        }}
                      >
                        {j.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
