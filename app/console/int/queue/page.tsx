'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  claimed:  'bg-blue-100 text-blue-700',
  done:     'bg-emerald-100 text-emerald-700',
  failed:   'bg-red-100 text-red-700',
  dead:     'bg-slate-200 text-slate-500',
};
const STATUSES = ['pending', 'claimed', 'done', 'failed', 'dead'];

export default function MessageQueuePage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState({ status: 'pending', limit: '50' });

  const load = useCallback(() => {
    const params = new URLSearchParams({ status: filter.status, limit: filter.limit });
    void fetch('/api/bop/int/queue?' + params.toString())
      .then(r => r.json())
      .then(d => { setMessages(d.messages ?? []); setLoading(false); });
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader title="Message Queue" description="IT004 — DIE job queue monitor (SKIP LOCKED worker pattern)" />
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(f => ({ ...f, status: s }))}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${filter.status === s ? 'bg-des-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {s}
            </button>
          ))}
          <button onClick={() => setFilter(f => ({ ...f, status: '' }))}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${filter.status === '' ? 'bg-des-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            all
          </button>
        </div>
        <button onClick={load} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          ↺ Refresh
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
          No messages with status <span className="font-mono">{filter.status || 'any'}</span>.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {['System', 'Type', 'Entity', 'Priority', 'Status', 'Tries', 'Next attempt', 'Created'].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{m.int_systems?.system_key ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-700 font-medium">{m.message_type}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">
                    {m.entity_type && m.entity_id ? `${m.entity_type}:${m.entity_id}` : (m.entity_type ?? '—')}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-center text-slate-600">{m.priority}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[m.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-center text-slate-500">{m.attempts}/{m.max_attempts}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {new Date(m.next_attempt_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {new Date(m.created_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}
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
