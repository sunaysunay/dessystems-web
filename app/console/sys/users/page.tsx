'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope, BUSINESS_UNITS } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const ROLES = ['super_admin', 'platform_admin', 'tenant_manager', 'editor', 'viewer'] as const;
const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', platform_admin: 'Platform Admin',
  tenant_manager: 'Tenant Mgr', editor: 'Editor', viewer: 'Viewer',
};
const ROLE_COLOR: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700', platform_admin: 'bg-orange-100 text-orange-700',
  tenant_manager: 'bg-purple-100 text-purple-700', editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-600',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700', locked: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700', expired: 'bg-slate-100 text-slate-500',
};
const USER_TYPES = ['human', 'service', 'api', 'system'];
const TIMEZONES = ['Europe/Amsterdam','Europe/London','Europe/Berlin','Europe/Paris','Europe/Brussels','Europe/Sofia'];
const LANGUAGES = [{ v:'en', l:'English' },{ v:'nl', l:'Nederlands' },{ v:'de', l:'Deutsch' },{ v:'fr', l:'Français' },{ v:'tr', l:'Türkçe' }];

const BLANK_FORM = {
  email:'', password:'', first_name:'', last_name:'', phone:'', department:'', job_function:'',
  role:'viewer', user_type:'human', status:'active', language:'en', timezone:'Europe/Amsterdam',
  default_screen:'', valid_from:'', valid_to:'', ai_enabled:false, ai_quota:0,
  notification_email:true, notification_bell:true, tenant_ids:[] as number[],
};

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday'; if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d/30)}mo ago`; return `${Math.floor(d/365)}y ago`;
}

function initials(u: any) {
  if (u.first_name && u.last_name) return (u.first_name[0]+u.last_name[0]).toUpperCase();
  return (u.email?.[0] ?? '?').toUpperCase();
}

const inp = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none bg-white';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium text-slate-500">{label}{required && <span className="text-red-400"> *</span>}</label>}
      {children}
    </div>
  );
}

export default function UsersPage() {
  const { units, user: currentUser } = useScope();
  const tenants = units.length ? units : BUSINESS_UNITS;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [resetId, setResetId] = useState<string|null>(null);
  const [resetPw, setResetPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [expandId, setExpandId] = useState<string|null>(null);
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/bop/users');
    const j = await r.json();
    setUsers(j.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openAdd() { setForm({ ...BLANK_FORM }); setEditUser(null); setShowForm(true); }
  function openEdit(u: any) {
    setForm({
      email: u.email ?? '', password: '', first_name: u.first_name ?? '', last_name: u.last_name ?? '',
      phone: u.phone ?? '', department: u.department ?? '', job_function: u.job_function ?? '',
      role: u.role ?? 'viewer', user_type: u.user_type ?? 'human', status: u.status ?? 'active',
      language: u.language ?? 'en', timezone: u.timezone ?? 'Europe/Amsterdam',
      default_screen: u.default_screen ?? '', valid_from: u.valid_from ?? '', valid_to: u.valid_to ?? '',
      ai_enabled: u.ai_enabled ?? false, ai_quota: u.ai_quota ?? 0,
      notification_email: u.notification_email ?? true, notification_bell: u.notification_bell ?? true,
      tenant_ids: u.tenant_ids ?? [],
    });
    setEditUser(u); setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editUser) {
        const rest: Record<string, unknown> = { ...form }; delete rest['email']; delete rest['password'];
        await fetch(`/api/bop/users/${editUser.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-actor-email': currentUser?.email || 'unknown' },
          body: JSON.stringify(rest),
        });
        showToast('User updated');
      } else {
        const r = await fetch('/api/bop/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-actor-email': currentUser?.email || 'unknown' },
          body: JSON.stringify(form),
        });
        const j = await r.json();
        if (j.error) { showToast('Error: ' + j.error); setSaving(false); return; }
        showToast('User created');
      }
      setShowForm(false); await load();
    } finally { setSaving(false); }
  }

  async function handleLock(u: any) {
    const next = u.status === 'locked' ? 'active' : 'locked';
    await fetch(`/api/bop/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-actor-email': currentUser?.email || 'unknown' },
      body: JSON.stringify({ status: next }),
    });
    showToast(next === 'locked' ? 'User locked' : 'User unlocked');
    await load();
  }

  async function handleDeleteUser() {
    if (!deleteId) return;
    
    try {
      const r = await fetch(`/api/bop/users/${deleteId}`, { 
        method: 'DELETE', 
        headers: { 
          'Content-Type': 'application/json',
          'x-actor-email': currentUser?.email || 'unknown' 
        },
        body: JSON.stringify({ reason: deleteReason || null })
      });
      if (!r.ok) {
        const j = await r.json();
        showToast('Error: ' + (j.error || 'Failed to delete'));
      } else {
        showToast('User securely deleted');
        await load();
      }
    } catch {
      showToast('Error deleting user');
    } finally {
      setDeleteId(null);
      setDeleteReason('');
    }
  }

  async function handleResetPw() {
    if (!resetId || resetPw.length < 8) return;
    await fetch(`/api/bop/users/${resetId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-actor-email': currentUser?.email || 'unknown' },
      body: JSON.stringify({ password: resetPw }),
    });
    showToast('Password reset'); setResetId(null); setResetPw('');
  }

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function toggleTenant(id: number) {
    setForm(f => ({
      ...f,
      tenant_ids: f.tenant_ids.includes(id) ? f.tenant_ids.filter(x => x !== id) : [...f.tenant_ids, id],
    }));
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || (u.email ?? '').toLowerCase().includes(q)
      || (u.first_name ?? '').toLowerCase().includes(q)
      || (u.last_name ?? '').toLowerCase().includes(q);
    const matchR = !filterRole || u.role === filterRole;
    const matchS = !filterStatus || (u.status ?? 'active') === filterStatus;
    return matchQ && matchR && matchS;
  });

  return (
    <div>
      <ScreenHeader title="Users" description="Manage platform users, roles, tenants and preferences" />

      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
          className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        <BopSelect value={filterRole} onChange={setFilterRole}
          options={[{value:'',label:'All roles'}, ...ROLES.map(r => ({value:r, label:ROLE_LABEL[r]}))]}
          placeholder="All roles" className="w-36" />
        <BopSelect value={filterStatus} onChange={setFilterStatus}
          options={[{value:'',label:'All status'},{value:'active',label:'Active',color:'#10b981'},{value:'locked',label:'Locked',color:'#f59e0b'},{value:'suspended',label:'Suspended',color:'#ef4444'},{value:'expired',label:'Expired',color:'#94a3b8'}]}
          placeholder="All status" className="w-36" />
        <span className="flex-1" />
        <span className="text-xs text-slate-400">{filtered.length} users</span>
        <button onClick={openAdd}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + Add User
        </button>
      </div>

      {/* User table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading users…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Tenants</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last Login</th>
                <th className="px-4 py-3 text-left">Default Screen</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No users found</td></tr>
              ) : filtered.flatMap(u => {
                const isExpanded = expandId === u.id;
                return [
                  <tr key={u.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandId(isExpanded ? null : u.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {initials(u)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-slate-800">{u.email}</p>
                            {u.email === currentUser.email && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">You</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {u.first_name || u.last_name
                              ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                              : <span className="italic text-slate-300">No name set</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLOR[u.role] ?? 'bg-slate-100 text-slate-500'}`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {!(u.tenant_ids ?? []).length
                          ? <span className="text-xs text-slate-300">—</span>
                          : (u.tenant_ids ?? []).map((tid: number) => {
                              const t = tenants.find(x => x.id === tid);
                              return <span key={tid} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{t?.code ?? tid}</span>;
                            })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLOR[u.status ?? 'active']}`}>
                        {u.status ?? 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(u.last_sign_in_at)}</td>
                    <td className="px-4 py-3">
                      {u.default_screen
                        ? <span className="font-mono text-[11px] font-semibold text-blue-600">{u.default_screen}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.email === currentUser.email ? (
                        <span className="text-xs text-slate-300 italic">own account</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setDeleteId(u.id)}
                            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
                          <button onClick={() => openEdit(u)}
                            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Edit</button>
                          <button onClick={() => { setResetId(u.id); setResetPw(''); setShowPw(false); }}
                            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Reset PW</button>
                          <button onClick={() => { void handleLock(u); }}
                            className={`rounded px-2 py-1 text-xs hover:bg-slate-100 ${(u.status ?? 'active') === 'locked' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {(u.status ?? 'active') === 'locked' ? 'Unlock' : 'Lock'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={u.id + '-exp'} className="bg-slate-50/80">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs lg:grid-cols-4">
                          {([
                            ['User ID', u.id?.slice(0,18) + '…'],
                            ['Type', u.user_type ?? 'human'],
                            ['Department', u.department || '—'],
                            ['Function', u.job_function || '—'],
                            ['Language', u.language || 'en'],
                            ['Timezone', u.timezone || '—'],
                            ['Valid From', u.valid_from || '—'],
                            ['Valid To', u.valid_to || '—'],
                            ['AI Enabled', u.ai_enabled ? 'Yes' : 'No'],
                            ['AI Quota', String(u.ai_quota ?? 0)],
                            ['Email Notify', u.notification_email !== false ? 'Yes' : 'No'],
                            ['Bell Notify', u.notification_bell !== false ? 'Yes' : 'No'],
                            ['Phone', u.phone || '—'],
                            ['Created', u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'],
                          ] as [string, string][]).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="w-24 flex-shrink-0 font-semibold text-slate-400">{k}</span>
                              <span className="text-slate-600 truncate">{v}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ),
                ].filter(Boolean);
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reset Password dialog */}
      {resetId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setResetId(null)}>
          <div className="w-80 rounded-xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="mb-3 text-base font-semibold text-slate-800">Reset Password</p>
            <div className="relative mb-3">
              <input type={showPw ? 'text' : 'password'} value={resetPw} onChange={e => setResetPw(e.target.value)}
                placeholder="New password (min. 8 chars)" minLength={8} autoFocus
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm pr-14 focus:border-blue-400 focus:outline-none" />
              <button onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600">
                {showPw ? 'hide' : 'show'}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { void handleResetPw(); }} disabled={resetPw.length < 8}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-blue-700">Save</button>
              <button onClick={() => setResetId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete User Confirmation dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-red-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-red-800">Delete User</h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-4">
                Are you absolutely sure you want to completely wipe this user from the system? 
                <br/><br/>
                This action is <span className="font-semibold text-slate-800">permanent</span> and cannot be undone. All associated data will be removed.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for deletion (Optional)</label>
                <input type="text" value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                  placeholder="e.g. Requested by user, Spam account..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 bg-slate-50 px-6 py-4">
              <button onClick={() => { setDeleteId(null); setDeleteReason(''); }}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none">
                Cancel
              </button>
              <button onClick={() => { void handleDeleteUser(); }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none">
                Yes, delete user
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setShowForm(false)}>
          <div className="flex-1 bg-black/20" />
          <div className="w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">{editUser ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={() => setShowForm(false)} className="text-xl leading-none text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            <div className="space-y-6 px-6 py-5">
              {/* Identity */}
              <Section label="Identity">
                <Row>
                  <Field label="First Name"><input value={form.first_name} onChange={e => setF('first_name', e.target.value)} className={inp} /></Field>
                  <Field label="Last Name"><input value={form.last_name} onChange={e => setF('last_name', e.target.value)} className={inp} /></Field>
                </Row>
                <Field label="Email Address" required>
                  <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} className={inp} disabled={!!editUser} />
                </Field>
                {!editUser && (
                  <Field label="Password" required>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={form.password}
                        onChange={e => setF('password', e.target.value)} placeholder="Min. 8 characters"
                        className={inp + ' pr-14'} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600">{showPw ? 'hide' : 'show'}</button>
                    </div>
                  </Field>
                )}
                <Row>
                  <Field label="Phone"><input value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+31 6…" className={inp} /></Field>
                  <Field label="Department"><input value={form.department} onChange={e => setF('department', e.target.value)} className={inp} /></Field>
                </Row>
                <Field label="Job Function"><input value={form.job_function} onChange={e => setF('job_function', e.target.value)} className={inp} /></Field>
              </Section>

              {/* Account & Security */}
              <Section label="Account & Security">
                <Row>
                  <Field label="Role">
                    <BopSelect value={form.role} onChange={v => setF('role', v)}
                      options={ROLES.map(r => ({value:r, label:ROLE_LABEL[r]}))}
                      placeholder="Role" size="md" />
                  </Field>
                  <Field label="User Type">
                    <BopSelect value={form.user_type} onChange={v => setF('user_type', v)}
                      options={USER_TYPES.map(t => ({value:t, label:t.charAt(0).toUpperCase()+t.slice(1)}))}
                      placeholder="User type" size="md" />
                  </Field>
                </Row>
                <Field label="Status">
                  <BopSelect value={form.status} onChange={v => setF('status', v)}
                    options={[{value:'active',label:'Active',color:'#10b981'},{value:'locked',label:'Locked',color:'#f59e0b'},{value:'suspended',label:'Suspended',color:'#ef4444'},{value:'expired',label:'Expired',color:'#94a3b8'}]}
                    placeholder="Status" size="md" />
                </Field>
                <Row>
                  <Field label="Valid From"><input type="date" value={form.valid_from} onChange={e => setF('valid_from', e.target.value)} className={inp} /></Field>
                  <Field label="Valid To"><input type="date" value={form.valid_to} onChange={e => setF('valid_to', e.target.value)} className={inp} /></Field>
                </Row>
              </Section>

              {/* Preferences */}
              <Section label="Preferences">
                <Row>
                  <Field label="Language">
                    <BopSelect value={form.language} onChange={v => setF('language', v)}
                      options={LANGUAGES.map(l => ({value:l.v, label:l.l}))}
                      placeholder="Language" size="md" />
                  </Field>
                  <Field label="Timezone">
                    <BopSelect value={form.timezone} onChange={v => setF('timezone', v)}
                      options={TIMEZONES.map(t => ({value:t, label:t}))}
                      placeholder="Timezone" size="md" />
                  </Field>
                </Row>
                <Field label="Default Screen (TC code)">
                  <input value={form.default_screen} onChange={e => setF('default_screen', e.target.value.toUpperCase())}
                    placeholder="e.g. BO002" maxLength={5} className={inp + ' font-mono uppercase tracking-widest'} />
                </Field>
              </Section>

              {/* Tenant Access */}
              <Section label="Tenant Access">
                <div className="flex flex-wrap gap-2">
                  {tenants.map(t => (
                    <button key={t.id} type="button" onClick={() => toggleTenant(t.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        form.tenant_ids.includes(t.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {t.code} · {t.label}
                    </button>
                  ))}
                </div>
              </Section>

              {/* AI & Notifications */}
              <Section label="AI & Notifications">
                <Row>
                  <Field label="">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={form.ai_enabled} onChange={e => setF('ai_enabled', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                      <span className="text-sm text-slate-700">AI Assistant enabled</span>
                    </label>
                  </Field>
                  <Field label="AI Quota / month">
                    <input type="number" value={form.ai_quota} onChange={e => setF('ai_quota', Number(e.target.value))} min={0} className={inp} />
                  </Field>
                </Row>
                <div className="flex gap-6">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={form.notification_email} onChange={e => setF('notification_email', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    <span className="text-xs text-slate-600">Email notifications</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={form.notification_bell} onChange={e => setF('notification_bell', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    <span className="text-xs text-slate-600">Bell notifications</span>
                  </label>
                </div>
              </Section>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
              <button onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void handleSave(); }}
                disabled={saving || (!editUser && (!form.email || form.password.length < 8))}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-blue-700">
                {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
