'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

const VIEWS = [
  { key: 'overview', label: 'Overview' },
  { key: 'iam', label: 'IAM Changes' },
  { key: 'activity', label: 'Screen Access' },
  { key: 'sessions', label: 'Sessions' },
];

const ACTION_COLOR: Record<string, string> = {
  ROLE_CHANGED: 'bg-purple-100 text-purple-700',
  ROLE_SCREEN_GRANTED: 'bg-emerald-100 text-emerald-700',
  ROLE_SCREEN_REVOKED: 'bg-rose-100 text-rose-700',
  USER_LOCKED: 'bg-red-100 text-red-700',
  USER_UNLOCKED: 'bg-green-100 text-green-700',
  PW_RESET: 'bg-amber-100 text-amber-700',
  USER_CREATED: 'bg-blue-100 text-blue-700',
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AccessAuditPage() {
  const [view, setView] = useState('overview');
  const [range, setRange] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emailFilter, setEmailFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({ view, range: String(range) });
    if (emailFilter) params.set('email', emailFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (moduleFilter) params.set('module', moduleFilter);
    fetch(`/api/bop/access-audit?${params}`)
      .then(r => r.json())
      .then(j => { setData(j); setLoading(false); })
      .catch(() => setLoading(false));
  }, [view, range, emailFilter, actionFilter, moduleFilter]);

  return (
    <div>
      <ScreenHeader title="Access Audit" description="Immutable audit log — SY017 tracks all IAM changes, screen access, and session activity" />

      {/* Tabs + range */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                view === v.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}>{v.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {['7','30','90'].map(d => (
            <button key={d} onClick={() => setRange(Number(d))}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                range === Number(d) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>{d}d</button>
          ))}
        </div>
      </div>

      {loading && <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading…</div>}

      {/* OVERVIEW */}
      {!loading && view === 'overview' && data && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'IAM Changes', value: data.kpis?.totalChanges ?? 0, color: 'text-purple-600' },
              { label: 'Role Changes', value: data.kpis?.roleChanges ?? 0, color: 'text-orange-600' },
              { label: 'Lock Events', value: data.kpis?.lockEvents ?? 0, color: 'text-red-600' },
              { label: 'Screen Accesses', value: data.kpis?.screenAccesses ?? 0, color: 'text-blue-600' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
                <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value?.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">last {range} days</p>
              </div>
            ))}
          </div>

          {/* Activity chart — bar chart via divs */}
          {data.dailyChart?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-slate-500">Screen accesses per day</p>
              <div className="flex items-end gap-1 h-24">
                {(() => {
                  const max = Math.max(...data.dailyChart.map((d: any) => d.count), 1);
                  return data.dailyChart.map((d: any) => (
                    <div key={d.date} className="group flex-1 flex flex-col items-center gap-1">
                      <div className="relative w-full">
                        <div className="bg-blue-200 rounded-sm w-full"
                          style={{ height: `${Math.max((d.count / max) * 80, 2)}px` }}
                          title={`${d.date}: ${d.count}`} />
                      </div>
                      <span className="text-[8px] text-slate-300 rotate-45 origin-left">{d.date.slice(5)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Recent changelog */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600">Recent IAM Changes</p>
            </div>
            <ChangeLogTable rows={data.changelog ?? []} />
          </div>
        </div>
      )}

      {/* IAM CHANGES */}
      {!loading && view === 'iam' && data && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex gap-2 p-3 border-b border-slate-100">
            <BopSelect value={actionFilter} onChange={setActionFilter}
              options={[{value:'',label:'All actions'}, ...Object.keys(ACTION_COLOR).map(a => ({value:a, label:a}))]}
              placeholder="All actions" className="w-40" />
            <input value={emailFilter} onChange={e => setEmailFilter(e.target.value)}
              placeholder="Filter by actor email…"
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none w-52" />
          </div>
          <ChangeLogTable rows={data.rows ?? []} />
        </div>
      )}

      {/* SCREEN ACCESS */}
      {!loading && view === 'activity' && data && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex gap-2 p-3 border-b border-slate-100">
            <input value={emailFilter} onChange={e => setEmailFilter(e.target.value)}
              placeholder="Filter by user email…"
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none w-52" />
            <input value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
              placeholder="Module (e.g. SYS)"
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none w-32" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">TC</th>
                <th className="px-4 py-3 text-left">Screen</th>
                <th className="px-4 py-3 text-left">Module</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data.rows ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No activity in range</td></tr>
              ) : (data.rows ?? []).map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{r.user_email}</td>
                  <td className="px-4 py-2.5"><span className="font-mono text-[11px] font-bold text-blue-600">{r.screen_id}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-700">{r.screen_title}</td>
                  <td className="px-4 py-2.5"><span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500">{r.module}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SESSIONS */}
      {!loading && view === 'sessions' && data && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Last Seen</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Session ID</th>
                <th className="px-4 py-3 text-center">Screens</th>
                <th className="px-4 py-3 text-center">Events</th>
                <th className="px-4 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data.rows ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No sessions in range</td></tr>
              ) : (data.rows ?? []).map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmt(r.last_seen_at)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{r.user_email}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{r.session_id?.slice(0,8)}…</td>
                  <td className="px-4 py-2.5 text-center text-xs font-semibold text-slate-700">{r.screen_count ?? 0}</td>
                  <td className="px-4 py-2.5 text-center text-xs font-semibold text-slate-700">{r.event_count ?? 0}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{r.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChangeLogTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
        <tr>
          <th className="px-4 py-3 text-left">Time</th>
          <th className="px-4 py-3 text-left">Action</th>
          <th className="px-4 py-3 text-left">Actor</th>
          <th className="px-4 py-3 text-left">Target</th>
          <th className="px-4 py-3 text-left">Details</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {rows.length === 0 ? (
          <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No records found</td></tr>
        ) : rows.map((r: any, i: number) => (
          <tr key={i} className="hover:bg-slate-50">
            <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmt(r.created_at)}</td>
            <td className="px-4 py-2.5">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${ACTION_COLOR[r.action] ?? 'bg-slate-100 text-slate-500'}`}>
                {r.action}
              </span>
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-600">{r.actor_email}</td>
            <td className="px-4 py-2.5 text-xs text-slate-600">{r.target_email ?? r.target_id ?? '—'}</td>
            <td className="px-4 py-2.5 text-xs text-slate-400 max-w-xs truncate">
              {r.details ? JSON.stringify(r.details).slice(0, 80) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
