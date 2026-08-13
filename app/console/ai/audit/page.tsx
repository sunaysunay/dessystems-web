'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const AI_ACTIONS = ['HANDOFF','SETTING_CHANGED','SCREEN_UPDATED'];

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AI004Page() {
  const [rows, setRows]      = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]    = useState(30);
  const [actionQ, setActionQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: 'iam', range: String(range) });
    if (actionQ) params.set('action', actionQ);
    const d = await fetch('/api/bop/access-audit?' + params).then(r => r.json());
    const aiRows = (d.rows ?? []).filter((r: any) => AI_ACTIONS.includes(r.action));
    setRows(aiRows);
    setLoading(false);
  }, [range, actionQ]);

  useEffect(() => { void load(); }, [load]);

  const total    = rows.length;
  const handoffs = rows.filter(r => r.action === 'HANDOFF').length;
  const configs  = rows.filter(r => r.action === 'SETTING_CHANGED').length;
  const updates  = rows.filter(r => r.action === 'SCREEN_UPDATED').length;

  return (
    <div>
      <ScreenHeader title="AI Action Audit" description="AI004 — Immutable log of all AI agent actions, handoff notes and config mutations" />

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          ['Total AI Events', total,    'text-slate-800'],
          ['Handoffs',        handoffs,  'text-violet-600'],
          ['Config Changes',  configs,   'text-amber-600'],
          ['Screen Updates',  updates,   'text-blue-600'],
        ].map(([l, v, c]) => (
          <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className={'mt-1 text-2xl font-bold ' + c}>{loading ? '—' : v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select value={actionQ} onChange={e => setActionQ(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none">
          <option value="">All AI actions</option>
          {AI_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex gap-1">
          {[7, 30, 90].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (range === r ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
              {r}d
            </button>
          ))}
        </div>
        <button onClick={() => { void load(); }} className="ml-auto text-xs text-slate-400 border border-slate-200 rounded-lg px-3 py-1.5 hover:text-slate-600">Refresh</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">When</th>
              <th className="px-5 py-3 text-left">Action</th>
              <th className="px-5 py-3 text-left">Actor</th>
              <th className="px-5 py-3 text-left">Object</th>
              <th className="px-5 py-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No AI actions found in this period</td></tr>
            ) : rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{fmt(r.created_at)}</td>
                <td className="px-5 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (r.action === 'HANDOFF' ? 'bg-violet-100 text-violet-700' : r.action === 'SETTING_CHANGED' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                    {r.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">{r.actor_email ?? 'system'}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-slate-400 max-w-[120px] truncate">{r.object_id ?? '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-400 max-w-[300px] truncate">
                  {r.new_value?.title ?? r.new_value?.summary ?? (r.new_value ? JSON.stringify(r.new_value).slice(0, 80) : '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
