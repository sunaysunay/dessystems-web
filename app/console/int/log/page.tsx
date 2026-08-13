'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
  partial: 'bg-orange-100 text-orange-700',
};
const TRIGGER_ICON: Record<string, string> = {
  queue: '⟳', webhook: '⚡', manual: '▶', schedule: '⏱',
};

export default function IntegrationLogPage() {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState({ status: '', limit: '50' });

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    params.set('limit', filter.limit);
    void fetch('/api/bop/int/sync-log?' + params.toString())
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setLoading(false); });
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader title="Integration Run Log" description="IT002 — Execution history for all DIE integration flows" />
      <div className="flex flex-wrap gap-3">
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue">
          <option value="">All statuses</option>
          {['ok', 'error', 'partial'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.limit} onChange={e => setFilter(f => ({ ...f, limit: e.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-des-blue">
          {['25', '50', '100'].map(l => <option key={l} value={l}>{l} rows</option>)}
        </select>
        <button onClick={load} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          ↺ Refresh
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          No integration runs yet. Trigger a plate lookup or flow to see entries.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {['System', 'Flow', 'Trigger', 'Entity', 'Ext ID', 'Status', 'ms', 'Error', 'Time'].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{r.int_systems?.system_key ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{r.int_flows?.flow_key ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{TRIGGER_ICON[r.trigger] ?? ''} {r.trigger ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">
                    {r.entity_type && r.entity_id ? `${r.entity_type}:${r.entity_id}` : (r.entity_type ?? '—')}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{r.external_id ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{r.response_ms !== null ? `${r.response_ms}ms` : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-red-600 max-w-[140px] truncate">{r.error_message ?? ''}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}
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
