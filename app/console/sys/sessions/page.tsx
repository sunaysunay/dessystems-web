'use client';
import { useState, useEffect , useCallback} from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const OS_ICON: Record<string,string> = {
  windows: '🪟', mac: '🍎', linux: '🐧', ios: '📱', android: '📱',
};

function parseUA(ua: string): { browser: string; os: string } {
  if (!ua) return { browser: '—', os: '—' };
  const browser =
    ua.includes('Chrome') && !ua.includes('Edg') ? 'Chrome' :
    ua.includes('Firefox') ? 'Firefox' :
    ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
    ua.includes('Edg') ? 'Edge' : 'Other';
  const os =
    ua.includes('Windows') ? 'windows' :
    ua.includes('Mac') ? 'mac' :
    ua.includes('Linux') ? 'linux' :
    ua.includes('iPhone') || ua.includes('iPad') ? 'ios' :
    ua.includes('Android') ? 'android' : 'other';
  return { browser, os };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

export default function SY010Page() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sessions'|'activity'>('sessions');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('7');

  const load = useCallback(async () => {
    setLoading(true);
    const [s, a] = await Promise.all([
      fetch('/api/bop/access-audit?view=sessions&range=' + range).then(r => r.json()),
      fetch('/api/bop/access-audit?view=activity&range=' + range).then(r => r.json()),
    ]);
    setSessions(s.rows ?? []);
    setActivity(a.rows ?? []);
    setLoading(false);
  }, [range]);
  useEffect(() => { void load(); }, [load]);

  const filteredSessions = sessions.filter(s =>
    !search || (s.user_email||'').toLowerCase().includes(search.toLowerCase()) ||
    (s.ip_address||'').includes(search)
  );
  const filteredActivity = activity.filter(a =>
    !search || (a.user_email||'').toLowerCase().includes(search.toLowerCase()) ||
    (a.module||'').toLowerCase().includes(search.toLowerCase())
  );

  const uniqueUsers = new Set(sessions.map(s => s.user_email)).size;
  const todaySessions = sessions.filter(s => {
    const d = new Date(s.last_active_at || s.created_at);
    return d.toDateString() === new Date().toDateString();
  }).length;

  return (
    <div>
      <ScreenHeader title="Session Monitor" description="SY010 — Active sessions, login history and screen access trail"/>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          ['Total Sessions', sessions.length, 'text-slate-900'],
          ['Unique Users', uniqueUsers, 'text-blue-600'],
          ['Active Today', todaySessions, 'text-emerald-600'],
          ['Activity Events', activity.length, 'text-slate-900'],
        ].map(([l,v,c]) => (
          <div key={String(l)} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className={'mt-1 text-2xl font-bold ' + c}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user or IP..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-400"/>
        <BopSelect value={range} onChange={v => setRange(v)} options={[{ value: String('1'), label: `Last 24h` }, { value: String('7'), label: `Last 7 days` }, { value: String('30'), label: `Last 30 days` }]} className="min-w-[130px]" />
        <div className="ml-auto flex gap-1">
          {(['sessions','activity'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={'rounded-lg px-3 py-1.5 text-xs font-medium capitalize ' + (tab===t?'bg-slate-800 text-white':'border border-slate-200 text-slate-500 hover:text-slate-700')}>
              {t === 'sessions' ? 'Sessions (' + sessions.length + ')' : 'Activity (' + activity.length + ')'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : tab === 'sessions' ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">IP Address</th>
                <th className="px-5 py-3 text-left">Browser / OS</th>
                <th className="px-5 py-3 text-left">Last Active</th>
                <th className="px-5 py-3 text-left">Tenant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No sessions found</td></tr>
              ) : filteredSessions.map((s: any, i: number) => {
                const ua = parseUA(s.user_agent || '');
                const lastSeen = s.last_active_at || s.last_seen_at || s.created_at;
                return (
                  <tr key={s.id ?? i} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                          {(s.user_email||'?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{s.user_email||'—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{s.ip_address||'—'}</td>
                    <td className="px-5 py-3 text-sm">
                      <span>{OS_ICON[ua.os]??'💻'} {ua.browser}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-500">{lastSeen ? timeAgo(lastSeen) : '—'}</span>
                      {lastSeen && <p className="text-[10px] text-slate-300">{new Date(lastSeen).toLocaleString()}</p>}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">{s.tenant_id||'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Screen</th>
                <th className="px-5 py-3 text-left">Module</th>
                <th className="px-5 py-3 text-left">Action</th>
                <th className="px-5 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivity.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No activity found</td></tr>
              ) : filteredActivity.map((a: any, i: number) => (
                <tr key={a.id ?? i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{a.user_email||'—'}</td>
                  <td className="px-5 py-3 text-slate-600">{a.screen_title||a.screen_id||'—'}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{a.module||'—'}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400 capitalize">{a.action||'view'}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{a.created_at ? timeAgo(a.created_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
