'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string,string> = {
  overdue:'bg-red-100 text-red-600',
  expiring:'bg-orange-100 text-orange-700',
  due_soon:'bg-amber-100 text-amber-700',
  certified:'bg-emerald-100 text-emerald-700',
};

function certStatus(grantedAt: string|null, validTo: string|null): string {
  const now = Date.now();
  if (validTo) {
    const exp = new Date(validTo).getTime();
    if (exp < now) return 'overdue';
    if (exp - now < 30 * 86400000) return 'expiring';
  }
  const age = now - new Date(grantedAt ?? '2000-01-01').getTime();
  if (age > 365 * 86400000) return 'overdue';
  if (age > 270 * 86400000) return 'due_soon';
  return 'certified';
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function SY007Page() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [certifying, setCertifying] = useState<string|null>(null);
  const [toast, setToast] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  async function load() {
    setLoading(true);
    const data = await fetch('/api/bop/sys/users').then(r => r.json());
    const userList: any[] = data.users ?? [];
    const roleMap: Record<string, any[]> = data.roleMap ?? {};

    const rows: any[] = [];
    for (const user of userList) {
      const userRoles = roleMap[user.id] ?? [];
      for (const ur of userRoles) {
        const status = certStatus(ur.granted_at, ur.valid_to);
        rows.push({
          key: user.id + '_' + ur.role_id,
          user_id: user.id,
          user_email: user.email,
          role_id: ur.role_id,
          role_name: ur.role_name,
          granted_at: ur.granted_at,
          granted_by: ur.granted_by,
          valid_to: ur.valid_to,
          status,
        });
      }
    }
    const ORDER = ['overdue','expiring','due_soon','certified'];
    rows.sort((a,b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
    setAssignments(rows);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function certify(key: string, userId: string, roleId: string) {
    setCertifying(key);
    const newValidTo = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
    const r = await fetch('/api/bop/sys/users/' + userId + '/roles', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ role_id: roleId, valid_to: newValidTo, action: 'certify' }),
    });
    setCertifying(null);
    if (r.ok) { showToast('Certified — access extended 1 year'); void load(); }
    else { const e = await r.json(); showToast(e.error || 'Certification failed'); }
  }

  const counts = (s: string) => assignments.filter(a => a.status === s).length;
  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.status === filter);

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Access Recertification" description="SY007 — Periodic review and re-approval of all user role assignments"/>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[['Overdue','overdue','text-red-600'],['Expiring <30d','expiring','text-orange-600'],['Due for Review','due_soon','text-amber-600'],['Certified','certified','text-emerald-600']].map(([l,s,c]) => (
          <div key={s} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className={'mt-1 text-2xl font-bold ' + c}>{counts(s)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        {['all','overdue','expiring','due_soon','certified'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={'rounded-lg px-3 py-1.5 text-xs font-medium capitalize ' + (filter===s?'bg-slate-800 text-white':'border border-slate-200 text-slate-500')}>
            {s.replace('_',' ')}
          </button>
        ))}
        <button onClick={() => { void load(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Refresh</button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Granted</th>
                <th className="px-5 py-3 text-left">Granted By</th>
                <th className="px-5 py-3 text-left">Expires</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                  {assignments.length === 0 ? 'No role assignments found' : 'No assignments in this category'}
                </td></tr>
              ) : filtered.map((a: any) => {
                const days = a.valid_to ? daysUntil(a.valid_to) : null;
                return (
                  <tr key={a.key} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{a.user_email}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{a.role_name}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">{a.granted_at ? new Date(a.granted_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{a.granted_by||'—'}</td>
                    <td className="px-5 py-3 text-xs">
                      {a.valid_to ? (
                        <span className={days !== null && days < 0 ? 'text-red-500 font-semibold' : days !== null && days < 30 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                          {days !== null && days < 0 ? 'Expired ' + Math.abs(days) + 'd ago' : days !== null ? 'in ' + days + 'd' : '—'}
                        </span>
                      ) : (
                        <span className="italic text-slate-300">no expiry</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (STATUS_COLOR[a.status]??'bg-slate-100 text-slate-500')}>
                        {a.status.replace('_',' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {(a.status === 'overdue' || a.status === 'expiring' || a.status === 'due_soon') && (
                        <button onClick={() => { void certify(a.key, a.user_id, a.role_id); }} disabled={certifying === a.key}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                          {certifying === a.key ? '...' : 'Certify +1yr'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
