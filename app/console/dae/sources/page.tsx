'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

type Source = {
  id: string;
  source_key: string;
  platform_code: string;
  platform_name: string;
  country: string;
  base_url: string;
  compliance_basis: string | null;
  rate_limit_rps: number | null;
  active: boolean;
  created_at: string;
};

const PLATFORM_FLAG: Record<string, string> = {
  marktplaats: '🇳🇱', '2dehands': '🇧🇪', kleinanzeigen: '🇩🇪',
  autoscout24: '🇪🇺', mobile_de: '🇩🇪', leboncoin: '🇫🇷',
};

const COMPLIANCE_COLOR: Record<string, string> = {
  robots_txt: '#d1fae5',
  fair_use:   '#dbeafe',
  legal:      '#ede9fe',
  unknown:    '#fee2e2',
};

export default function DA003Page() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  async function load() {
    setLoading(true);
    const res = await fetch('/api/bop/dae/sources');
    const j   = await res.json();
    setSources(j.sources ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/bop/dae/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    });
    setSources(ss => ss.map(s => s.id === id ? { ...s, active } : s));
    showToast(active ? 'Source activated' : 'Source deactivated');
  }

  const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 };
  const thStyle:   React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--muted)', whiteSpace: 'nowrap' };

  const active   = sources.filter(s => s.active).length;
  const inactive = sources.length - active;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000 }}>
      <ScreenHeader title="Source Config" description="DA003 — Data source registry: platforms, compliance basis, rate limits" />

      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, background: '#1e293b', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 200 }}>{toast}</div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[['Total', sources.length], ['Active', active], ['Inactive', inactive]].map(([label, val]) => (
          <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{val}</div>
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
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Platform</th>
                <th style={thStyle}>Source key</th>
                <th style={thStyle}>Country</th>
                <th style={thStyle}>Base URL</th>
                <th style={thStyle}>Compliance</th>
                <th style={thStyle}>Rate limit</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.id}>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>
                    {PLATFORM_FLAG[s.platform_code] ?? '🌐'} {s.platform_name}
                  </td>
                  <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 12 }}>{s.source_key}</td>
                  <td style={cellStyle}>{s.country.toUpperCase()}</td>
                  <td style={{ ...cellStyle, fontSize: 12 }}>
                    <a href={s.base_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
                      {s.base_url.replace(/^https?:\/\//, '')}
                    </a>
                  </td>
                  <td style={cellStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: COMPLIANCE_COLOR[s.compliance_basis ?? 'unknown'] ?? '#f1f5f9',
                    }}>
                      {s.compliance_basis ?? 'unknown'}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 12 }}>
                    {s.rate_limit_rps !== null ? `${s.rate_limit_rps} rps` : '—'}
                  </td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => { void toggleActive(s.id, !s.active); }}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12, cursor: 'pointer', border: 'none',
                        background: s.active ? '#d1fae5' : '#fee2e2',
                        color:      s.active ? '#065f46' : '#991b1b',
                      }}
                    >
                      {s.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
