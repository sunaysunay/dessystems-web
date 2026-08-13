'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function SY008Page() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/api/bop/sys/admin-dashboard').then(r => r.json()).then(j => {
      setStats(j);
      setLoading(false);
    });
  }, []);

  const s = stats ?? {};

  return (
    <div>
      <ScreenHeader title="Admin Dashboard" description="BOP platform health and usage overview — SY008" />

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-6">

          {/* Platform counts */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Platform Overview</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Tenants',      value: s.tenants ?? 0,   color: 'text-blue-600' },
                { label: 'Total Users',  value: s.users ?? 0,     color: 'text-slate-800' },
                { label: 'Active Users', value: s.active_users ?? 0, color: 'text-emerald-600' },
                { label: 'Roles',        value: s.roles ?? 0,     color: 'text-slate-800' },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Module screen counts */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Module Status</p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Module</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-center">Active Screens</th>
                    <th className="px-4 py-3 text-center">V3 Screens</th>
                    <th className="px-4 py-3 text-left">Phase</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(s.modules ?? []).map((m: any) => (
                    <tr key={m.module_id}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{m.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-600">{m.active_screens ?? 0}</td>
                      <td className="px-4 py-3 text-center text-slate-400">{m.v3_screens ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">V{m.phase}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          m.status === 'live' ? 'bg-emerald-100 text-emerald-700' :
                          m.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-400'
                        }`}>{m.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent screens */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Registered Screens</p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Module</th>
                    <th className="px-4 py-3 text-left">Route</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(s.screens ?? []).map((sc: any) => (
                    <tr key={sc.screen_id}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{sc.screen_id}</td>
                      <td className="px-4 py-3 text-slate-800">{sc.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{sc.module}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{sc.route}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          sc.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          sc.status === 'v3' ? 'bg-slate-100 text-slate-400' :
                          'bg-amber-100 text-amber-600'
                        }`}>{sc.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
