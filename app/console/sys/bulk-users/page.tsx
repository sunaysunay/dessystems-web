'use client';
import { useState, useEffect } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function SY009Page() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState('');
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    void fetch('/api/bop/sys/users').then(r => r.json()).then(j => {
      setUsers(j.users ?? []); setLoading(false);
    });
  }, []);

  function toggle(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(s => s.size === users.length ? new Set() : new Set(users.map((u:any) => u.id)));
  }
  function applyAction() {
    if (!action || selected.size === 0) return;
    showToast(`${action} applied to ${selected.size} user(s) — V3 mock`);
    setSelected(new Set()); setAction('');
  }

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Bulk User Operations" description="SY009 — Mass role assignment, deactivation, and export · V3"/>
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 font-medium">V3 feature — actions are mock only and will not persist</div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-semibold text-blue-700">{selected.size} selected</span>
          <BopSelect value={action} onChange={v => setAction(v)} options={[{ value: String(''), label: `Choose action...` }, { value: String('Deactivate'), label: `Deactivate` }, { value: String('Reset password'), label: `Reset password` }, { value: String('Assign role'), label: `Assign role` }, { value: String('Export to CSV'), label: `Export to CSV` }]} className="min-w-[130px]" />
          <button onClick={applyAction} disabled={!action} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Apply</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Clear</button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 w-10"><input type="checkbox" checked={selected.size===users.length && users.length>0} onChange={toggleAll} className="rounded"/></th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No users found</td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className={`cursor-pointer hover:bg-slate-50 ${selected.has(u.id)?'bg-blue-50':''}`} onClick={() => toggle(u.id)}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} onClick={e => e.stopPropagation()} className="rounded"/></td>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.full_name || u.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.role || '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.is_active===false?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-700'}`}>{u.is_active===false?'inactive':'active'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
