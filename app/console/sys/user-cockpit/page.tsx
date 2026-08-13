'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';
import { useScope } from '@/lib/scope-context';

const TABS = ['Identity & Status','Roles','Effective Permissions','Access Audit','Denied Access'];
const LEVEL_COLOR: Record<string,string> = {
  view:'bg-slate-100 text-slate-500', edit:'bg-blue-100 text-blue-700',
  approve:'bg-amber-100 text-amber-700', admin:'bg-red-100 text-red-600',
};

type SidePanel = 'create'|'edit'|'assign-role'|null;

export default function SY015Page() {
  const { role, user: scopeUser } = useScope();
  const isAdmin = role === 'super_admin';
  const [users, setUsers]         = useState<any[]>([]);
  const [roleMap, setRoleMap]     = useState<Record<string,{role_id:string;role_name:string}[]>>({});
  const [allRoles, setAllRoles]   = useState<any[]>([]);
  const [selected, setSelected]   = useState<any>(null);
  const [tab, setTab]             = useState(0);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [detail, setDetail]       = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [panel, setPanel]         = useState<SidePanel>(null);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');

  // Forms
  const [createForm, setCreateForm] = useState({ email:'', full_name:'', password:'' });
  const [editForm, setEditForm]     = useState({ email:'', full_name:'' });
  const [assignForm, setAssignForm] = useState({ role_id:'', valid_from:'', valid_to:'', granted_by:'admin' });

  function showToast(m: string) { setToast(m); setTimeout(()=>setToast(''),2500); }

  const load = useCallback(async () => {
    const [uj, rj] = await Promise.all([
      fetch('/api/bop/sys/users').then(r=>r.json()),
      fetch('/api/bop/sys/roles').then(r=>r.json()),
    ]);
    const _all = uj.users ?? [];
    setUsers(isAdmin ? _all : _all.filter((u: any) => u.email === scopeUser.email));
    setRoleMap(uj.roleMap ?? {});
    setAllRoles(rj.roles ?? []);
  }, [isAdmin, scopeUser.email]);

  useEffect(() => {
    void load().then(() => {});
  }, [load]);

  // auto-select first user after load
  useEffect(() => {
    if (users.length > 0 && !selected) void selectUser(users[0]);
  }, [users, selected]);

  async function selectUser(u: any) {
    setSelected(u);
    setTab(0);
    setPanel(null);
    setLoading(true);
    const j = await fetch(`/api/bop/sys/users/${u.id}/detail`).then(r=>r.json());
    setDetail(j);
    setLoading(false);
  }

  async function reloadDetail(u: any) {
    const j = await fetch(`/api/bop/sys/users/${u.id}/detail`).then(r=>r.json());
    setDetail(j);
  }

  function initials(u: any) {
    const name = (u.user_metadata?.full_name ?? u.raw_user_meta_data?.full_name) ?? u.email ?? '?';
    return name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0,2);
  }
  function displayName(u: any) { return u.user_metadata?.full_name || u.raw_user_meta_data?.full_name || u.email || u.id; }
  function isSuspended(u: any) { return !!u.banned_until; }
  async function sendResetLink() {
    if (!selected) return;
    const j = await fetch('/api/bop/sys/email/reset-link', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: selected.email, tenant_id: 500 }) }).then(r=>r.json());
    if (j.error) { showToast('✗ ' + j.error); return; }
    if (j.sent) { showToast('✓ Reset email sent to ' + selected.email); return; }
    try { await navigator.clipboard.writeText(j.link); } catch {}
    showToast('Link generated (SMTP off) — copied to clipboard');
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || (u.user_metadata?.full_name ?? u.raw_user_meta_data?.full_name)?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || (roleMap[u.id]??[]).some(r=>r.role_id===roleFilter);
    return matchSearch && matchRole;
  });

  const presentRoles = allRoles.filter(r => Object.values(roleMap).some(roles=>roles.some(ur=>ur.role_id===r.id)));

  // Actions
  async function createUser() {
    setSaving(true);
    const res = await fetch('/api/bop/sys/users/invite', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(createForm),
    });
    const j = await res.json();
    if (!res.ok) { showToast('Error: '+(j.error??'unknown')); setSaving(false); return; }
    showToast('User invited');
    setSaving(false); setPanel(null); setCreateForm({email:'',full_name:'',password:''});
    await load();
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/bop/sys/users/${selected.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: editForm.email, full_name: editForm.full_name }),
    });
    const j = await res.json();
    if (!res.ok) { showToast('Error: '+(j.error??'unknown')); setSaving(false); return; }
    showToast('Profile updated');
    setSaving(false); setPanel(null);
    await load();
  }

  async function toggleSuspend() {
    if (!selected) return;
    setSaving(true);
    const action = isSuspended(selected) ? 'activate' : 'suspend';
    await fetch(`/api/bop/sys/users/${selected.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action }),
    });
    showToast(action === 'suspend' ? 'User suspended' : 'User activated');
    setSaving(false);
    await load();
    const updated = users.find(u=>u.id===selected.id);
    if (updated) setSelected(updated);
  }

  async function assignRole() {
    if (!selected || !assignForm.role_id) return;
    setSaving(true);
    const res = await fetch(`/api/bop/sys/users/${selected.id}/roles`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(assignForm),
    });
    const j = await res.json();
    if (!res.ok) { showToast('Error: '+(j.error??'unknown')); setSaving(false); return; }
    showToast('Role assigned');
    setSaving(false); setPanel(null); setAssignForm({role_id:'',valid_from:'',valid_to:'',granted_by:'admin'});
    await load(); await reloadDetail(selected);
  }

  async function removeRole(roleId: string) {
    if (!selected) return;
    await fetch(`/api/bop/sys/users/${selected.id}/roles?role_id=${roleId}`, { method:'DELETE' });
    showToast('Role removed');
    await load(); await reloadDetail(selected);
  }

  return (
    <div>
      <ScreenHeader title="User Cockpit" description="Identity, roles, permissions and access audit per user — SY015" />
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex h-[calc(100vh-11rem)] gap-4">
        {/* LEFT */}
        <div className="w-64 flex-shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Users ({filtered.length})</p>
            {isAdmin && (
            <button onClick={() => { setPanel('create'); setCreateForm({email:'',full_name:'',password:''}); }}
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700">+ New</button>
            )}
          </div>
          <div className="border-b border-slate-100 p-2 space-y-1.5">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none" />
            <BopSelect value={roleFilter} onChange={setRoleFilter}
              options={[{value:'',label:'All roles'}, ...presentRoles.map(r=>({value:r.id, label:r.name}))]}
              placeholder="All roles" />
            {roleFilter && (
              <button onClick={()=>setRoleFilter('')} className="w-full rounded-lg bg-blue-50 px-3 py-1 text-[10px] font-medium text-blue-600 text-left flex items-center justify-between">
                <span>{allRoles.find(r=>r.id===roleFilter)?.name}</span>
                <span>✕</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(u => (
              <div key={u.id} onClick={() => { void selectUser(u); }}
                className={`flex cursor-pointer items-center gap-3 border-b border-slate-50 px-4 py-3 transition-colors ${selected?.id===u.id?'bg-blue-50 border-l-2 border-l-blue-500':'hover:bg-slate-50'}`}>
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${isSuspended(u)?'bg-slate-400':'bg-blue-600'}`}>
                  {initials(u)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{displayName(u)}</p>
                    {isSuspended(u) && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-500">suspended</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {(roleMap[u.id]??[]).map(r=>(
                      <span key={r.role_id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">{r.role_name}</span>
                    ))}
                    {(roleMap[u.id]??[]).length===0 && <p className="text-[10px] text-slate-300">No roles</p>}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length===0 && <p className="px-4 py-6 text-xs text-slate-400">No users found</p>}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">Select a user</div>
          ) : (
            <>
              <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${isSuspended(selected)?'bg-slate-400':'bg-blue-600'}`}>
                  {initials(selected)}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{displayName(selected)}</p>
                  <p className="text-xs text-slate-400">{selected.email} · {selected.id?.slice(0,8)}…</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {isSuspended(selected) && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-500">Suspended</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selected.email_confirmed_at?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                    {selected.email_confirmed_at?'confirmed':'unconfirmed'}
                  </span>
                  {isAdmin && (<>
                  <button onClick={()=>{setEditForm({email:selected.email??'',full_name:(selected.user_metadata?.full_name??selected.raw_user_meta_data?.full_name)??''});setPanel('edit');}}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Edit Profile</button>
                  <button onClick={()=>{setAssignForm({role_id:'',valid_from:'',valid_to:'',granted_by:'admin'});setPanel('assign-role');}}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">+ Assign Role</button>
                  <button onClick={() => { void toggleSuspend(); }} disabled={saving}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${isSuspended(selected)?'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100':'border-red-200 text-red-500 hover:bg-red-50'}`}>
                    {isSuspended(selected)?'Activate':'Suspend'}
                  </button>
                  <button onClick={() => { void sendResetLink(); }} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100">Reset PW</button>
                  </>)}
                </div>
              </div>

              <div className="flex border-b border-slate-100 px-6">
                {TABS.map((t,i)=>(
                  <button key={t} onClick={()=>setTab(i)}
                    className={`mr-1 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${tab===i?'border-blue-500 text-blue-600':'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {t}{i===1&&(detail?.roles??[]).length>0&&<span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">{(detail?.roles??[]).length}</span>}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loading ? <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading…</div> : (
                  <>
                    {tab===0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {[['User ID',selected.id?.slice(0,16)+'…'],['Email',selected.email],['Name',(selected.user_metadata?.full_name ?? selected.raw_user_meta_data?.full_name) ?? '—'],['Email confirmed',selected.email_confirmed_at?new Date(selected.email_confirmed_at).toLocaleDateString('nl-NL'):'No'],['Last sign-in',selected.last_sign_in_at?new Date(selected.last_sign_in_at).toLocaleString('nl-NL'):'—'],['Created at',selected.created_at?new Date(selected.created_at).toLocaleDateString('nl-NL'):'—'],['Provider',selected.app_metadata?.provider??'—'],['Role (auth)',selected.role??'—'],['Status',isSuspended(selected)?'Suspended':'Active']].map(([k,v])=>(
                          <div key={k}><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k}</p><p className="mt-1 text-sm font-medium text-slate-700 break-all">{v}</p></div>
                        ))}
                      </div>
                    )}

                    {tab===1 && (
                      <div>
                        {(detail?.roles??[]).length===0 ? <p className="text-sm text-slate-400">No roles assigned yet.</p> : (
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                              <tr><th className="px-4 py-2 text-left">Role</th><th className="px-4 py-2 text-left">Valid from</th><th className="px-4 py-2 text-left">Valid to</th><th className="px-4 py-2 text-left">Granted by</th><th className="px-4 py-2"></th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(detail?.roles??[]).map((r: any)=>(
                                <tr key={r.role_id}>
                                  <td className="px-4 py-2 font-semibold text-slate-800">{r.role_name}</td>
                                  <td className="px-4 py-2 text-xs text-slate-500">{r.valid_from??'—'}</td>
                                  <td className="px-4 py-2 text-xs text-slate-500">{r.valid_to??'open'}</td>
                                  <td className="px-4 py-2 text-xs text-slate-400">{r.granted_by??'—'}</td>
                                  <td className="px-4 py-2">
                                    {isAdmin && <button onClick={() => { void removeRole(r.role_id); }} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {tab===2 && (
                      <div>
                        {(detail?.permissions??[]).length===0 ? <p className="text-sm text-slate-400">No permissions resolved — assign roles first.</p> : (
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                              <tr><th className="px-4 py-2 text-left">Screen ID</th><th className="px-4 py-2 text-left">Screen</th><th className="px-4 py-2 text-left">Module</th><th className="px-4 py-2 text-left">Level</th><th className="px-4 py-2 text-left">Via Role</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(detail?.permissions??[]).map((p: any)=>(
                                <tr key={p.screen_id}>
                                  <td className="px-4 py-2 font-mono text-xs font-bold text-blue-500">{p.screen_id}</td>
                                  <td className="px-4 py-2 font-medium text-slate-700">{p.title}</td>
                                  <td className="px-4 py-2 font-mono text-xs text-slate-400">{p.module}</td>
                                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_COLOR[p.access_level]}`}>{p.access_level}</span></td>
                                  <td className="px-4 py-2 text-xs text-slate-400">{p.role_name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {tab===3 && (
                      <div>
                        {(detail?.audit??[]).length===0 ? <p className="text-sm text-slate-400">No access events recorded.</p> : (
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                              <tr><th className="px-4 py-2 text-left">Time</th><th className="px-4 py-2 text-left">Screen</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Result</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(detail?.audit??[]).map((a: any)=>(
                                <tr key={a.id}><td className="px-4 py-2 font-mono text-xs text-slate-400">{new Date(a.occurred_at).toLocaleString('nl-NL')}</td><td className="px-4 py-2 font-mono text-xs text-blue-500">{a.screen_id}</td><td className="px-4 py-2 text-xs text-slate-600">{a.action}</td><td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.result==='granted'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>{a.result}</span></td></tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {tab===4 && (
                      <div>
                        {(detail?.denied??[]).length===0 ? <p className="text-sm text-slate-400">No denied access events.</p> : (
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                              <tr><th className="px-4 py-2 text-left">Time</th><th className="px-4 py-2 text-left">Screen</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Reason</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(detail?.denied??[]).map((a: any)=>(
                                <tr key={a.id}><td className="px-4 py-2 font-mono text-xs text-slate-400">{new Date(a.occurred_at).toLocaleString('nl-NL')}</td><td className="px-4 py-2 font-mono text-xs text-blue-500">{a.screen_id}</td><td className="px-4 py-2 text-xs text-slate-600">{a.action}</td><td className="px-4 py-2 text-xs text-red-500">{a.reason??'—'}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Side Panels */}
      {panel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setPanel(null)} />
          <div className="relative z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {panel==='create'?'Invite User':panel==='edit'?'Edit Profile':'Assign Role'}
              </h2>
              <button onClick={()=>setPanel(null)} className="rounded-lg p-2 hover:bg-slate-100">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {panel==='create' && (<>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Email <span className="text-red-400">*</span></label>
                  <input value={createForm.email} onChange={e=>setCreateForm(p=>({...p,email:e.target.value}))} type="email" placeholder="user@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                  <input value={createForm.full_name} onChange={e=>setCreateForm(p=>({...p,full_name:e.target.value}))} placeholder="Jan de Vries"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
                <p className="text-xs text-slate-400">An invitation email will be sent. The user sets their own password.</p>
              </>)}

              {panel==='edit' && (<>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input value={editForm.email} onChange={e=>setEditForm(p=>({...p,email:e.target.value}))} type="email"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                  <input value={editForm.full_name} onChange={e=>setEditForm(p=>({...p,full_name:e.target.value}))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
              </>)}

              {panel==='assign-role' && (<>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Role <span className="text-red-400">*</span></label>
                  <BopSelect value={assignForm.role_id} onChange={v=>setAssignForm(p=>({...p,role_id:v}))}
                    options={[{value:'',label:'Select role…'}, ...allRoles.map(r=>({value:r.id, label:r.name}))]}
                    placeholder="Select role…" size="md" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Valid from</label>
                    <input type="date" value={assignForm.valid_from} onChange={e=>setAssignForm(p=>({...p,valid_from:e.target.value}))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Valid to</label>
                    <input type="date" value={assignForm.valid_to} onChange={e=>setAssignForm(p=>({...p,valid_to:e.target.value}))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
                </div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Granted by</label>
                  <input value={assignForm.granted_by} onChange={e=>setAssignForm(p=>({...p,granted_by:e.target.value}))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"/></div>
              </>)}
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={()=>setPanel(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => { if (panel==='create') void createUser(); else if (panel==='edit') void saveEdit(); else void assignRole(); }}
                disabled={saving||(panel==='create'&&!createForm.email)||(panel==='assign-role'&&!assignForm.role_id)}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving?'Saving…':panel==='create'?'Send Invite':panel==='edit'?'Save':'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
