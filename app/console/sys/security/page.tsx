'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const SECURITY_ACTIONS = ['USER_LOCKED','USER_UNLOCKED','PW_RESET','ROLE_CHANGED'];

const EVENT_STYLE: Record<string, string> = {
  USER_LOCKED:  'bg-red-100 text-red-700',
  USER_UNLOCKED:'bg-emerald-100 text-emerald-700',
  PW_RESET:     'bg-amber-100 text-amber-700',
  ROLE_CHANGED: 'bg-purple-100 text-purple-700',
};

const RISK: Record<string, string> = {
  USER_LOCKED:  'High',
  USER_UNLOCKED:'Low',
  PW_RESET:     'Medium',
  ROLE_CHANGED: 'Medium',
};

const RISK_COLOR: Record<string, string> = {
  High:  'text-red-600',
  Medium:'text-amber-600',
  Low:   'text-emerald-600',
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SY025Page() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange]  = useState(30);
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const d = await fetch(`/api/bop/access-audit?view=iam&range=${range}`).then(r => r.json());
    const secEvents = (d.rows ?? []).filter((r: any) => SECURITY_ACTIONS.includes(r.action));
    setEvents(secEvents);
    setLoading(false);
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const filtered = typeFilter ? events.filter(e => e.action === typeFilter) : events;
  const countOf  = (a: string) => events.filter(e => e.action === a).length;

  return (
    <div>
      <ScreenHeader title="Security Events" description="SY025 — Account locks, password resets, and high-risk role changes" />

      <div className="mb-5 grid grid-cols-4 gap-4">
        {SECURITY_ACTIONS.map(a => (
          <div key={a} onClick={() => setTypeFilter(typeFilter === a ? '' : a)}
            className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{a.replace('_',' ')}</p>
            <p className={'mt-1 text-2xl font-bold ' + (RISK_COLOR[RISK[a]] ?? 'text-slate-800')}>{loading ? '—' : countOf(a)}</p>
            <p className={'text-[10px] font-medium mt-0.5 ' + (RISK_COLOR[RISK[a]] ?? '')}>{RISK[a]} risk</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-1">
          {[7, 30, 90].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (range === r ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
              {r}d
            </button>
          ))}
        </div>
        {typeFilter && (
          <span className="text-xs text-slate-500">
            Showing: <strong>{typeFilter}</strong>
            <button onClick={() => setTypeFilter('')} className="ml-2 text-blue-500 hover:underline">Clear</button>
          </span>
        )}
        <button onClick={() => { void load(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Refresh</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">When</th>
              <th className="px-5 py-3 text-left">Actor</th>
              <th className="px-5 py-3 text-left">Event</th>
              <th className="px-5 py-3 text-left">Risk</th>
              <th className="px-5 py-3 text-left">Target</th>
              <th className="px-5 py-3 text-left">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                {events.length === 0 ? 'No security events in this period' : 'No events for this filter'}
              </td></tr>
            ) : filtered.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">{fmt(e.created_at)}</td>
                <td className="px-5 py-3 font-medium text-slate-800 max-w-[160px] truncate">{e.actor_email ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (EVENT_STYLE[e.action] ?? 'bg-slate-100 text-slate-500')}>
                    {e.action}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={'text-xs font-semibold ' + (RISK_COLOR[RISK[e.action]] ?? 'text-slate-500')}>
                    {RISK[e.action] ?? '—'}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500 max-w-[140px] truncate">{e.object_id ?? '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                  {e.new_value ? JSON.stringify(e.new_value).slice(0, 60) : e.old_value ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
