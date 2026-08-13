'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const RISK_COLOR: Record<string,string> = {
  Critical:'bg-red-100 text-red-600',
  High:'bg-orange-100 text-orange-700',
  Medium:'bg-amber-100 text-amber-700',
  Low:'bg-slate-100 text-slate-500',
};

const SOD_RULES: { role_a: string; role_b: string; risk: string; desc: string }[] = [
  { role_a:'accountant',     role_b:'dealer_owner',    risk:'High',     desc:'Can create invoices AND control company finances — no 4-eye separation' },
  { role_a:'accountant',     role_b:'dealer_manager',  risk:'Medium',   desc:'Can log sales AND manage AP/AR without oversight' },
  { role_a:'salesperson',    role_b:'accountant',       risk:'Medium',   desc:'Can create orders AND process related payments' },
  { role_a:'platform_admin', role_b:'dealer_owner',    risk:'Critical', desc:'Cross-track: DES internal admin with full business customer access' },
  { role_a:'platform_admin', role_b:'dealer_manager',  risk:'Critical', desc:'Cross-track: DES admin duties combined with dealer operations' },
  { role_a:'super_admin',    role_b:'dealer_owner',    risk:'Critical', desc:'Cross-track: unrestricted platform access combined with business role' },
  { role_a:'super_admin',    role_b:'dealer_manager',  risk:'Critical', desc:'Cross-track: unrestricted platform access combined with business role' },
  { role_a:'biz_supervisor', role_b:'accountant',      risk:'High',     desc:'Business supervisor can override financial entries they also create' },
  { role_a:'content_mod',    role_b:'dealer_owner',    risk:'Low',      desc:'Content mod can publish listings they also own commercially' },
];

export default function SY006Page() {
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState('');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [userCount, setUserCount] = useState(0);

  async function load() {
    setLoading(true);
    const [u, r] = await Promise.all([
      fetch('/api/bop/sys/users').then(res => res.json()),
      fetch('/api/bop/sys/roles').then(res => res.json()),
    ]);
    const userList: any[] = u.users ?? [];
    const roleMap: Record<string, { role_id: string; role_name: string }[]> = u.roleMap ?? {};
    const roleList: any[] = r.roles ?? [];

    const roleIndex: Record<string,string> = {};
    for (const ro of roleList) roleIndex[ro.id] = ro.name;

    const found: any[] = [];
    for (const user of userList) {
      const userRoles = roleMap[user.id] ?? [];
      const userRoleNames = userRoles.map((ur: any) => ur.role_name || roleIndex[ur.role_id] || '');
      for (const rule of SOD_RULES) {
        if (userRoleNames.includes(rule.role_a) && userRoleNames.includes(rule.role_b)) {
          found.push({
            user_email: user.email,
            user_id: user.id,
            role_a: rule.role_a,
            role_b: rule.role_b,
            risk: rule.risk,
            desc: rule.desc,
          });
        }
      }
    }
    setConflicts(found);
    setUserCount(userList.length);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = filterRisk ? conflicts.filter(c => c.risk === filterRisk) : conflicts;
  const byRisk = (r: string) => conflicts.filter(c => c.risk === r).length;

  return (
    <div>
      <ScreenHeader title="SoD Conflict Report" description="SY006 — Segregation of Duties conflict detection across all users"/>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {(['Critical','High','Medium','Low'] as const).map(level => (
          <div key={level} onClick={() => setFilterRisk(filterRisk === level ? '' : level)}
            className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{level} Risk</p>
            <p className={'mt-1 text-2xl font-bold ' + (level==='Critical'?'text-red-600':level==='High'?'text-orange-600':level==='Medium'?'text-amber-600':'text-slate-500')}>{byRisk(level)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{filterRisk === level ? 'click to clear' : 'click to filter'}</p>
          </div>
        ))}
      </div>

      {filterRisk && (
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filterRisk}</span> risk
          <button onClick={() => setFilterRisk('')} className="text-blue-600 hover:underline ml-1">Clear</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-400 font-medium">{conflicts.length === 0 ? 'No SoD conflicts detected' : 'No conflicts for this risk level'}</p>
          <p className="text-xs text-slate-300 mt-1">{conflicts.length === 0 ? 'All ' + userCount + ' users have clean role assignments' : ''}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Role A</th>
                <th className="px-5 py-3 text-left">Role B</th>
                <th className="px-5 py-3 text-left">Risk</th>
                <th className="px-5 py-3 text-left">Conflict Reason</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{c.user_email}</td>
                  <td className="px-5 py-3"><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{c.role_a}</span></td>
                  <td className="px-5 py-3"><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{c.role_b}</span></td>
                  <td className="px-5 py-3"><span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (RISK_COLOR[c.risk]??'bg-slate-100 text-slate-500')}>{c.risk}</span></td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-sm">{c.desc}</td>
                  <td className="px-5 py-3">
                    <a href={'/console/sys/users?search=' + encodeURIComponent(c.user_email)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600">
                      Review user
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">SoD Rule Catalog ({SOD_RULES.length} rules)</p>
        <div className="space-y-2">
          {SOD_RULES.map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className={'rounded-full px-2 py-0.5 font-semibold ' + (RISK_COLOR[r.risk]??'bg-slate-100 text-slate-500')}>{r.risk}</span>
              <span className="font-mono text-slate-600">{r.role_a}</span>
              <span className="text-slate-300">+</span>
              <span className="font-mono text-slate-600">{r.role_b}</span>
              <span className="text-slate-400">— {r.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
