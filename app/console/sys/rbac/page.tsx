'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function SY011Page() {
  const [roles, setRoles]   = useState<any[]>([]);
  const [users, setUsers]   = useState<any[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [rd, ud] = await Promise.all([
      fetch('/api/bop/sys/roles').then(r => r.json()),
      fetch('/api/bop/sys/users').then(r => r.json()),
    ]);
    setRoles(rd.roles ?? []);
    setUsers(ud.users ?? []);
    setRoleMap(ud.roleMap ?? {});
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  // Build inverse map: role_id → [user_emails]
  const roleUsers: Record<string, string[]> = {};
  for (const [uid, assignments] of Object.entries(roleMap)) {
    const user = users.find(u => u.id === uid);
    const email = user?.email ?? uid;
    for (const a of assignments) {
      if (!roleUsers[a.role_id]) roleUsers[a.role_id] = [];
      roleUsers[a.role_id].push(email);
    }
  }

  const filteredRoles = roles.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q);
  });

  const selectedUsers = selected ? (roleUsers[selected] ?? []) : [];
  const selectedRole  = roles.find(r => r.id === selected);

  return (
    <div>
      <ScreenHeader title="RBAC Roles" description="SY011 — Role catalog with user assignment breakdown" />

      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Roles</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{loading ? '—' : roles.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{loading ? '—' : users.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assignments</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {loading ? '—' : Object.values(roleUsers).reduce((a, v) => a + v.length, 0)}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Role list */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search roles..."
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-2.5 text-left">Role</th>
                  <th className="px-5 py-2.5 text-left">Type</th>
                  <th className="px-5 py-2.5 text-right">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRoles.map(r => (
                  <tr key={r.id}
                    onClick={() => setSelected(selected === r.id ? null : r.id)}
                    className={'cursor-pointer hover:bg-slate-50 ' + (selected === r.id ? 'bg-blue-50' : '')}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      {r.description && <p className="text-[11px] text-slate-400">{r.description}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (r.is_system ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500')}>
                        {r.is_system ? 'system' : 'custom'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600">{(roleUsers[r.id] ?? []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Role detail panel */}
        {selected && (
          <div className="w-72 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">{selectedRole?.name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>
            {selectedRole?.description && (
              <p className="mb-4 text-xs text-slate-500">{selectedRole.description}</p>
            )}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Assigned Users ({selectedUsers.length})</p>
            {selectedUsers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No users assigned</p>
            ) : (
              <div className="space-y-1.5">
                {selectedUsers.map(email => (
                  <div key={email} className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700">{email}</div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <a href="/console/sys/users" className="text-xs text-blue-600 hover:underline">Manage in Users screen →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
