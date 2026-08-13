'use client';
import { useState, useEffect, useCallback } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const ACTION_COLOR: Record<string, string> = {
  ROLE_CHANGED:         'bg-purple-100 text-purple-700',
  ROLE_SCREEN_GRANTED:  'bg-emerald-100 text-emerald-700',
  ROLE_SCREEN_REVOKED:  'bg-rose-100 text-rose-700',
  USER_LOCKED:          'bg-red-100 text-red-700',
  USER_UNLOCKED:        'bg-green-100 text-green-700',
  PW_RESET:             'bg-amber-100 text-amber-700',
  USER_CREATED:         'bg-blue-100 text-blue-700',
  ACCESS_REQUEST:       'bg-indigo-100 text-indigo-700',
  SETTING_CHANGED:      'bg-slate-100 text-slate-600',
};

const ACTIONS = Object.keys(ACTION_COLOR);

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SY012Page() {
  const [rows, setRows]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]  = useState(30);
  const [emailQ, setEmailQ] = useState('');
  const [actionQ, setActionQ] = useState('');
  const [page, setPage]    = useState(0);
  const PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ view: 'iam', range: String(range) });
    if (actionQ) params.set('action', actionQ);
    const d = await fetch('/api/bop/access-audit?' + params).then(r => r.json());
    setRows(d.rows ?? []);
    setPage(0);
    setLoading(false);
  }, [range, actionQ]);

  useEffect(() => { void load(); }, [load]);

  const filtered = emailQ
    ? rows.filter(r => (r.actor_email ?? '').toLowerCase().includes(emailQ.toLowerCase()))
    : rows;

  const pageRows = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const pages    = Math.ceil(filtered.length / PAGE);

  return (
    <div>
      <ScreenHeader title="Audit Log" description="SY012 — Immutable record of all IAM and configuration changes across BOP" />

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          ['Total Events',   filtered.length,                                         'text-slate-800'],
          ['Role Changes',   filtered.filter(r => r.action?.includes('ROLE')).length, 'text-purple-600'],
          ['Security Events',filtered.filter(r => ['USER_LOCKED','USER_UNLOCKED','PW_RESET'].includes(r.action)).length,'text-red-600'],
          ['Other',          filtered.filter(r => !r.action?.includes('ROLE') && !['USER_LOCKED','USER_UNLOCKED','PW_RESET'].includes(r.action)).length,'text-slate-500'],
        ].map(([l,v,c]) => (
          <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className={'mt-1 text-2xl font-bold ' + c}>{loading ? '—' : v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={emailQ} onChange={e => setEmailQ(e.target.value)}
          placeholder="Filter by actor email..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-blue-400" />
        <BopSelect value={actionQ} onChange={v => setActionQ(v)} options={[{ value: String(''), label: `All actions` }, ...ACTIONS.map((a) => ({ value: String(a), label: `${a}` }))]} className="min-w-[130px]" />
        <div className="flex gap-1">
          {[7, 30, 90].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (range === r ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
              {r}d
            </button>
          ))}
        </div>
        <button onClick={() => { void load(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Refresh</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">When</th>
              <th className="px-5 py-3 text-left">Actor</th>
              <th className="px-5 py-3 text-left">Action</th>
              <th className="px-5 py-3 text-left">Object</th>
              <th className="px-5 py-3 text-left">Object ID</th>
              <th className="px-5 py-3 text-left">Changed Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No events found</td></tr>
            ) : pageRows.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{fmt(r.created_at)}</td>
                <td className="px-5 py-3 font-medium text-slate-800 max-w-[160px] truncate">{r.actor_email ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (ACTION_COLOR[r.action] ?? 'bg-slate-100 text-slate-500')}>
                    {r.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">{r.object_type ?? '—'}</td>
                <td className="px-5 py-3 font-mono text-[10px] text-slate-400 max-w-[120px] truncate">{r.object_id ?? '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                  {r.new_value ? JSON.stringify(r.new_value).slice(0, 80) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>{filtered.length} events · page {page + 1}/{pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
