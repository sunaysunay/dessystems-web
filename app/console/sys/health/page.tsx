'use client';
import { useState, useEffect } from 'react';
import { MODULE_NAMES } from '@/lib/module-labels';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_STYLE: Record<string, string> = {
  ok:   'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  error:'bg-red-100 text-red-600',
};
const DOT: Record<string, string> = {
  ok:   'bg-emerald-500',
  warn: 'bg-amber-400',
  error:'bg-red-500',
};

export default function SY005Page() {
  const [health, setHealth]   = useState<Record<string, string>>({});
  const [screens, setScreens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');

  async function load() {
    setLoading(true);
    const [h, d] = await Promise.all([
      fetch('/api/bop/sys/health').then(r => r.json()),
      fetch('/api/bop/sys/admin-dashboard').then(r => r.json()),
    ]);
    setHealth(h.health ?? {});
    setScreens(d.screens ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const screenList = screens.filter(s => !moduleFilter || s.module === moduleFilter);
  const modules = [...new Set(screens.map((s: any) => s.module))].sort();

  const statusOf = (sid: string) => health[sid] ?? 'warn';
  const count = (s: string) => screens.filter(sc => statusOf(sc.screen_id) === s).length;

  const groupedByModule = modules.reduce<Record<string, any[]>>((acc, mod) => {
    acc[mod] = screenList.filter(s => s.module === mod);
    return acc;
  }, {});

  return (
    <div>
      <ScreenHeader title="System Health" description="SY005 — Real-time screen health by module, derived from notifications and lifecycle state" />

      <div className="mb-5 grid grid-cols-3 gap-4">
        {[['Healthy','ok','text-emerald-600'],['Warning','warn','text-amber-600'],['Error','error','text-red-600']].map(([l,s,c]) => (
          <div key={s} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className={'mt-1 text-2xl font-bold ' + c}>{loading ? '—' : count(s)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">screens</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button onClick={() => setModuleFilter('')}
          className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (!moduleFilter ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
          All modules
        </button>
        {modules.map(m => (
          <button key={m} title={MODULE_NAMES[m] ?? m} onClick={() => setModuleFilter(m === moduleFilter ? '' : m)}
            className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (moduleFilter === m ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
            {m}
          </button>
        ))}
        <button onClick={() => { void load(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Refresh</button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByModule).map(([mod, list]) => {
            const modStatuses = list.map(s => statusOf(s.screen_id));
            const modStatus = modStatuses.includes('error') ? 'error' : modStatuses.includes('warn') ? 'warn' : 'ok';
            return (
              <div key={mod} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <span className={'h-2.5 w-2.5 rounded-full flex-shrink-0 ' + DOT[modStatus]} />
                  <span className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{mod}</span>
                  <span className={'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ' + STATUS_STYLE[modStatus]}>{modStatus}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-50">
                    {list.map((sc: any) => {
                      const st = statusOf(sc.screen_id);
                      return (
                        <tr key={sc.screen_id} className="hover:bg-slate-50">
                          <td className="px-5 py-2.5 w-24 font-mono text-[10px] text-slate-400">{sc.screen_id}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{sc.title}</td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400">{sc.route}</td>
                          <td className="px-5 py-2.5 text-right">
                            <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + STATUS_STYLE[st]}>{st}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
