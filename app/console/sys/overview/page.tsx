'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const MODULE_LINKS: Record<string, string> = {
  SY: '/console/sys/dashboard',
  CR: '/console/crm',
  AS: '/console/ast',
  FI: '/console/fin',
  MD: '/console/md',
  MP: '/console/mkp',
  SA: '/console/sal',
  AN: '/console/an',
};

const PROCESS_ROWS = [
  { name: 'dessystems-console (prod)', port: '4400', pm2: 12 },
  { name: 'dessystems-console-dev',    port: '4401', pm2: 13 },
  { name: 'des-site-ag',               port: '3000', pm2: 0  },
  { name: 'desmobil',                  port: '3001', pm2: 1  },
  { name: 'desshop',                   port: '3002', pm2: 2  },
];

export default function SY006Page() {
  const [dash, setDash]     = useState<any>(null);
  const [health, setHealth] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [d, h] = await Promise.all([
      fetch('/api/bop/sys/admin-dashboard').then(r => r.json()),
      fetch('/api/bop/sys/health').then(r => r.json()),
    ]);
    setDash(d);
    setHealth(h.health ?? {});
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const healthOf = (module_id: string) => {
    const screens: any[] = dash?.screens?.filter((s: any) => s.module === module_id) ?? [];
    const statuses = screens.map((s: any) => health[s.screen_id] ?? 'warn');
    return statuses.includes('error') ? 'error' : statuses.includes('warn') ? 'warn' : 'ok';
  };

  const DOT: Record<string, string> = { ok:'bg-emerald-500', warn:'bg-amber-400', error:'bg-red-500' };
  const LABEL: Record<string, string> = { ok:'Healthy', warn:'Warning', error:'Error' };
  const LC: Record<string, string>  = { ok:'text-emerald-600', warn:'text-amber-600', error:'text-red-600' };

  return (
    <div>
      <ScreenHeader title="Systems Overview" description="SY006 — BOP module registry, process map, and global health at a glance" />

      {/* Top stats */}
      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          ['Modules',  dash?.modules?.length ?? '—', 'text-slate-800'],
          ['Screens',  dash?.screens?.length  ?? '—', 'text-slate-800'],
          ['Users',    dash?.users             ?? '—', 'text-slate-800'],
          ['Tenants',  dash?.tenants           ?? '—', 'text-slate-800'],
        ].map(([l,v,c]) => (
          <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className={'mt-1 text-2xl font-bold ' + c}>{loading ? '—' : v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Module registry */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Module Registry</div>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-2 text-left">Module</th>
                  <th className="px-5 py-2 text-left">Screens</th>
                  <th className="px-5 py-2 text-left">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(dash?.modules ?? []).map((m: any) => {
                  const h = healthOf(m.module_id);
                  return (
                    <tr key={m.module_id} className="hover:bg-slate-50">
                      <td className="px-5 py-2.5">
                        <a href={MODULE_LINKS[m.code] ?? '#'} className="font-semibold text-slate-800 hover:text-blue-600">
                          {m.code} — {m.name}
                        </a>
                      </td>
                      <td className="px-5 py-2.5 text-slate-500">{m.active_screens ?? 0}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={'h-2 w-2 rounded-full ' + DOT[h]} />
                          <span className={'text-xs font-medium ' + LC[h]}>{LABEL[h]}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Process map */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">VPS Process Map</div>
          <table className="w-full text-sm">
            <thead className="text-[10px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-2 text-left">Process</th>
                <th className="px-5 py-2 text-left">Port</th>
                <th className="px-5 py-2 text-left">PM2 ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {PROCESS_ROWS.map(p => (
                <tr key={p.pm2} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-slate-500">:{p.port}</td>
                  <td className="px-5 py-3 font-mono text-slate-400">{p.pm2}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-5 py-3">
            <p className="text-[10px] text-slate-400">Process status is static — run <code className="font-mono bg-slate-100 px-1 rounded">pm2 list</code> on VPS for live state.</p>
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        {[
          ['System Health', '/console/sys/health', 'SY005'],
          ['User Cockpit',  '/console/sys/user-cockpit', 'SY015'],
          ['Access Audit',  '/console/sys/access-audit', 'SY016'],
          ['Session Mgr',   '/console/sys/sessions', 'SY026'],
        ].map(([l, href, tc]) => (
          <a key={href} href={href}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all">
            <p className="text-[10px] font-mono text-slate-400">{tc}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{l}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
