'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

const CHANNELS = ['marktplaats', 'autoscout24'] as const;
type Channel = typeof CHANNELS[number];

const CHAN_COLOR: Record<Channel, string> = {
  marktplaats: 'bg-orange-100 text-orange-700',
  autoscout24: 'bg-blue-100 text-blue-700',
};

const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  claimed:  'bg-blue-100 text-blue-700',
  done:     'bg-emerald-100 text-emerald-700',
  failed:   'bg-red-100 text-red-700',
  dead:     'bg-slate-200 text-slate-500',
};

export default function IT007Page() {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterChan, setFilterChan] = useState('');
  const [toast, setToast] = useState('');
  const [expandId, setExpandId] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: 'outbound' });
    if (filterStatus) params.set('status', filterStatus);
    const j = await fetch(`/api/bop/int/queue?${params}`).then(r => r.json());
    let rows = (j.messages ?? []).filter((m: any) =>
      ['publish','update','delete'].includes(m.message_type));
    if (filterChan) rows = rows.filter((m: any) =>
      (m.int_flows?.flow_key ?? '').startsWith(filterChan));
    setMsgs(rows);
    setLoading(false);
  }, [filterStatus, filterChan]);

  useEffect(() => { void load(); }, [load]);

  async function retryMsg(id: string) {
    const j = await fetch('/api/bop/int/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'pending', next_attempt_at: new Date().toISOString(), attempts: 0 }),
    }).then(r => r.json());
    if (j.ok) { showToast('Requeued'); void load(); } else showToast(j.error || 'Failed');
  }

  const chanFromFlow = (flowKey: string): Channel | null => {
    if (flowKey?.startsWith('marktplaats.')) return 'marktplaats';
    if (flowKey?.startsWith('autoscout24.')) return 'autoscout24';
    return null;
  };

  return (
    <div className="p-6 max-w-[1200px]">
      <ScreenHeader title="Publish Jobs" description="IT007 — Outbound channel publish queue (Marktplaats, AutoScout24)" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-40">
          <BopSelect size="sm" value={filterStatus} onChange={setFilterStatus}
            options={[{ value: '', label: 'All statuses' }, ...Object.keys(STATUS_COLOR).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]} />
        </div>
        <div className="w-44">
          <BopSelect size="sm" value={filterChan} onChange={setFilterChan}
            options={[{ value: '', label: 'All channels' }, ...CHANNELS.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]} />
        </div>
        <button onClick={() => { void load(); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Refresh
        </button>
        <span className="ml-auto text-xs text-slate-400">{msgs.length} jobs</span>
      </div>

      {/* Credential status banner */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CHANNELS.map(ch => {
          const keyVar = ch === 'marktplaats' ? 'MARKTPLAATS_CLIENT_ID' : 'AUTOSCOUT24_CLIENT_ID';
          return (
            <div key={ch} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${CHAN_COLOR[ch]}`}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</span>
              <span className="text-xs text-slate-500">
                Requires <code className="rounded bg-slate-100 px-1 text-[11px]">{keyVar}</code> in <code className="rounded bg-slate-100 px-1 text-[11px]">.env.local</code>
              </span>
              <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">NEEDS CREDENTIALS</span>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-400">Loading…</div>
      ) : msgs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-400">No outbound publish jobs match.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Channel</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Listing ID</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Tries</th>
                <th className="px-4 py-2">Next attempt</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {msgs.map(m => {
                const ch = chanFromFlow(m.int_flows?.flow_key ?? '');
                const isExpanded = expandId === m.id;
                return [
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      {ch ? <span className={`rounded px-2 py-0.5 text-xs font-bold ${CHAN_COLOR[ch]}`}>{ch}</span> : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-slate-600">{m.message_type}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{m.entity_id ? m.entity_id.slice(0, 8) + '…' : '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[m.status] ?? 'bg-slate-100 text-slate-600'}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{m.attempts}/{m.max_attempts}</td>
                    <td className="px-4 py-2 text-xs text-slate-400">
                      {m.next_attempt_at ? new Date(m.next_attempt_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">
                      {m.created_at ? new Date(m.created_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button onClick={() => setExpandId(isExpanded ? null : m.id)}
                        className="mr-2 text-xs text-slate-400 hover:text-slate-700">
                        {isExpanded ? 'Hide' : 'Detail'}
                      </button>
                      {(m.status === 'failed' || m.status === 'dead') && (
                        <button onClick={() => { void retryMsg(m.id); }}
                          className="rounded bg-amber-500 px-2 py-0.5 text-xs text-white hover:bg-amber-600">
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${m.id}-expand`} className="bg-slate-50">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="mb-1 font-semibold text-slate-500 uppercase tracking-wide">Payload</div>
                            <pre className="max-h-48 overflow-auto rounded bg-slate-100 p-2 text-[11px] text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(m.payload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 font-semibold text-slate-500 uppercase tracking-wide">Result</div>
                            <pre className="max-h-48 overflow-auto rounded bg-slate-100 p-2 text-[11px] text-slate-700 whitespace-pre-wrap">
                              {m.result ? JSON.stringify(m.result, null, 2) : '—'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
