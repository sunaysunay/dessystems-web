'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

type DeleteParam = {
  id: string;
  label: string | null;
  ipv4: string | null;
  ipv6: string | null;
  city: string | null;
  created_at: string;
};

const BUILTIN_FILTERS = [
  { name: 'VPS IP', table: 'log', pattern: 'ip_address = 204.168.163.146' },
  { name: 'Localhost', table: 'log', pattern: 'ip_address like 127.%' },
  { name: 'Loopback IPv6', table: 'log', pattern: 'ip_address = ::1' },
  { name: 'curl/wget/python', table: 'both', pattern: 'user_agent like curl/wget/python-requests' },
  { name: 'Bots', table: 'both', pattern: 'user_agent like bot' },
  { name: 'Admin pages', table: 'both', pattern: 'page/entry_page like /admin, /console' },
  { name: 'QA test sessions', table: 'sessions', pattern: 'session_id = qa-hardening-test' },
  { name: 'VPS referrer', table: 'sessions', pattern: 'referrer like 204.168.163.146' },
  { name: 'Localhost referrer', table: 'sessions', pattern: 'referrer like localhost' },
];

export default function LogFiltersPage() {
  const [params, setParams] = useState<DeleteParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [ipv4, setIpv4] = useState('');
  const [ipv6, setIpv6] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [purging, setPurging] = useState(false);
  const [result, setResult] = useState<any>(null);

  const fetchParams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bop/an/delete-params');
      const json = await res.json();
      if (json.ok) setParams(json.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchParams(); }, [fetchParams]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!ipv4.trim() && !ipv6.trim() && !city.trim()) {
      setError('Enter at least one of: IPv4, IPv6, or City');
      return;
    }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await fetch('/api/bop/an/delete-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim() || null,
          ipv4: ipv4.trim() || null,
          ipv6: ipv6.trim() || null,
          city: city.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSuccess('Added');
        setLabel(''); setIpv4(''); setIpv6(''); setCity('');
        void fetchParams();
      } else setError(json.error);
    } catch { setError('Request failed'); }
    setSaving(false);
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this parameter?')) return;
    try {
      const res = await fetch('/api/bop/an/delete-params?id=' + id, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) void fetchParams();
    } catch { /* ignore */ }
  }

  async function handleDeleteMyLogs() {
    if (!confirm('Delete all activity matching your IPs/cities from dm_activity_log + dm_activity_sessions?')) return;
    setDeleting(true); setResult(null);
    try {
      const res = await fetch('/api/bop/an/cleanup', { method: 'DELETE' });
      const json = await res.json();
      setResult(json);
    } catch { setResult({ ok: false, error: 'Request failed' }); }
    setDeleting(false);
  }

  async function handlePurge() {
    if (!confirm('Purge all dm_activity entries older than 90 days?')) return;
    setPurging(true); setResult(null);
    try {
      const res = await fetch('/api/bop/an/purge', { method: 'DELETE' });
      const json = await res.json();
      setResult(json);
    } catch { setResult({ ok: false, error: 'Request failed' }); }
    setPurging(false);
  }

  return (
    <div>
      <ScreenHeader title="Log Filters" description="Activity log filter and exclusion rule configuration" />

      {/* Action buttons */}
      <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <button onClick={() => { void fetchParams(); }} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50">
          <svg className={'h-3.5 w-3.5' + (loading ? ' animate-spin' : '')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.2-8.6" /><path d="M21 3v6h-6" /></svg>
          Refresh
        </button>
        <button onClick={() => { void handleDeleteMyLogs(); }} disabled={deleting}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          {deleting ? 'Deleting…' : 'Delete My Logs'}
        </button>
        <button onClick={() => { void handlePurge(); }} disabled={purging}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          {purging ? 'Purging…' : 'Purge >90d'}
        </button>
      </div>

      {/* Result toast */}
      {result && (
        <div className={'mb-4 rounded-xl border px-5 py-3 text-sm ' + (result.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800')}>
          {result.ok ? (
            <span>Deleted <strong>{result.deleted}</strong> rows — dm_activity_log: {result.detail?.dm_activity_log ?? 0}, dm_activity_sessions: {result.detail?.dm_activity_sessions ?? 0}
              {result.caller_ip && <span className="ml-2 text-xs text-slate-500">(your IP: {result.caller_ip})</span>}
              {result.cutoff && <span className="ml-2 text-xs text-slate-500">(cutoff: {new Date(result.cutoff).toLocaleDateString()})</span>}
            </span>
          ) : (
            <span>Error: {result.error}</span>
          )}
        </div>
      )}

      {/* Delete parameters manager */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
          <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <h3 className="text-sm font-semibold text-slate-700">Delete My Logs — Parameters</h3>
          <span className="ml-1 text-xs text-slate-400">
            Entries below are automatically applied on every &ldquo;Delete My Logs&rdquo; click
          </span>
        </div>

        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : params.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm italic">No parameters configured yet</div>
          ) : (
            params.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 group hover:bg-slate-50 transition-colors">
                <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                  <span className="font-medium text-slate-800">{p.label || <em className="text-slate-400">No label</em>}</span>
                  <span className="text-slate-500 font-mono">{p.ipv4 || <span className="opacity-30">—</span>}</span>
                  <span className="text-slate-500 font-mono text-[10px] truncate">{p.ipv6 || <span className="opacity-30">—</span>}</span>
                  <span className="text-slate-500">{p.city || <span className="opacity-30">—</span>}</span>
                </div>
                <button onClick={() => { void handleRemove(p.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-all" title="Remove">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            ))
          )}
        </div>

        {params.length > 0 && (
          <div className="grid grid-cols-4 gap-2 px-5 py-1 border-t border-b border-slate-100 bg-slate-50/40 text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
            <span>Label</span><span>IPv4</span><span>IPv6</span><span>City</span>
          </div>
        )}

        <form onSubmit={(e) => { void handleAdd(e); }} className="px-4 py-3 bg-slate-50/30 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <input type="text" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)}
              className="w-28 shrink-0 px-2 py-1 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="text" placeholder="IPv4" value={ipv4} onChange={(e) => setIpv4(e.target.value)}
              className="w-32 shrink-0 px-2 py-1 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
            <input type="text" placeholder="IPv6" value={ipv6} onChange={(e) => setIpv6(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
            <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)}
              className="w-24 shrink-0 px-2 py-1 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <button type="submit" disabled={saving}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
              + {saving ? '…' : 'Add'}
            </button>
            {error && <span className="text-xs text-red-500 truncate">{error}</span>}
            {success && <span className="text-xs text-green-600">{success}</span>}
          </div>
        </form>
      </div>

      {/* Built-in exclusion rules */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-semibold text-slate-700">Built-in Exclusion Rules (hardcoded)</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="px-5 py-2 text-left">Filter</th>
              <th className="px-5 py-2 text-left">Table</th>
              <th className="px-5 py-2 text-left">Pattern</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs">
            {BUILTIN_FILTERS.map(f => (
              <tr key={f.name} className="hover:bg-slate-50">
                <td className="px-5 py-2 font-medium text-slate-700">{f.name}</td>
                <td className="px-5 py-2 text-slate-400">{f.table}</td>
                <td className="px-5 py-2 font-mono text-slate-400">{f.pattern}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
