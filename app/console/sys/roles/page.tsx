'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const ACCESS_LEVELS = ['view','edit','approve','admin'] as const;
const LEVEL_COLOR: Record<string, string> = {
  view:    'bg-slate-100 text-slate-500',
  edit:    'bg-blue-100 text-blue-700',
  approve: 'bg-amber-100 text-amber-700',
  admin:   'bg-red-100 text-red-600',
};

type DrawerMode = 'create' | 'edit' | null;

export default function SY002Page() {
  const [roles, setRoles]       = useState<any[]>([]);
  const [screens, setScreens]   = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [assignments, setAssignments] = useState<Record<string,string>>({});
  const [drawer, setDrawer]     = useState<DrawerMode>(null);
  const [form, setForm]         = useState({ name:'', description:'', is_system: false });
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [search, setSearch]     = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function showToast(m: string) { setToast(m); setTimeout(()=>setToast(''),2500); }

  async function loadRoles() {
    const j = await fetch('/api/bop/sys/roles').then(r=>r.json());
    setRoles(j.roles ?? []);
  }

  async function loadScreens() {
    const j = await fetch('/api/bop/sys/screens').then(r=>r.json());
    setScreens(j.screens ?? []);
  }

  useEffect(() => { void loadRoles(); void loadScreens(); }, []);

  async function selectRole(role: any) {
    setSelected(role);
    const j = await fetch(`/api/bop/sys/roles/${role.id}/screens`).then(r=>r.json());
    const map: Record<string,string> = {};
    (j.assignments ?? []).forEach((a: any) => { map[a.screen_id] = a.access_level; });
    setAssignments(map);
  }

  function openCreate() {
    setForm({ name:'', description:'', is_system: false });
    setDrawer('create');
  }

  function openEdit() {
    if (!selected) return;
    setForm({ name: selected.name, description: selected.description ?? '', is_system: selected.is_system ?? false });
    setDrawer('edit');
  }

  function toggleScreen(screenId: string, level: string) {
    setAssignments(prev => {
      if (prev[screenId] === level) { const next = { ...prev }; delete next[screenId]; return next; }
      return { ...prev, [screenId]: level };
    });
  }

  async function saveAssignments() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/bop/sys/roles/${selected.id}/screens`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments }),
    });
    setSaving(false);
    showToast('Permissions saved');
  }

  async function submitRole() {
    setSaving(true);
    if (drawer === 'create') {
      await fetch('/api/bop/sys/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      showToast('Role created');
    } else if (drawer === 'edit' && selected) {
      await fetch(`/api/bop/sys/roles/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      showToast('Role updated');
    }
    setSaving(false);
    setDrawer(null);
    await loadRoles();
    if (drawer === 'edit' && selected) setSelected((p: any) => ({ ...p, ...form }));
  }

  async function deleteRole() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/bop/sys/roles/${selected.id}`, { method: 'DELETE' });
    setSaving(false);
    setConfirmDelete(false);
    setSelected(null);
    showToast('Role deleted');
    await loadRoles();
  }

  const activeScreens = screens.filter(s => s.status === 'active');
  const modules = [...new Set(activeScreens.map(s => s.module))].sort();
  const assignedCount = Object.keys(assignments).length;

  return (
    <div>
      <ScreenHeader title="Role Catalog" description="Define roles and assign screen-level permissions — SY002" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}

      <div className="flex h-[calc(100vh-11rem)] gap-4">
        {/* LEFT */}
        <div className="w-64 flex-shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Roles</p>
            <button onClick={openCreate} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700">+ New</button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles…"
            className="border-b border-slate-100 px-4 py-2 text-sm focus:outline-none" />
          <div className="flex-1 overflow-y-auto">
            {roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(r => (
              <div key={r.id} onClick={() => { void selectRole(r); }}
                className={`cursor-pointer border-b border-slate-50 px-4 py-3 transition-colors ${
                  selected?.id === r.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
                }`}>
                <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                {r.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{r.description}</p>}
                {r.is_system && <span className="mt-1 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">SYSTEM</span>}
              </div>
            ))}
            {roles.length === 0 && <p className="px-4 py-6 text-xs text-slate-400">No roles yet — click + New</p>}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">Select a role to assign screen permissions</div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{selected.name}</p>
                  <p className="text-xs text-slate-400">{assignedCount} screen{assignedCount !== 1 ? 's' : ''} assigned</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={openEdit}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    Edit Role
                  </button>
                  {!selected.is_system && (
                    <button onClick={() => setConfirmDelete(true)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">
                      Delete
                    </button>
                  )}
                  <div className="mx-2 h-5 w-px bg-slate-200" />
                  <div className="flex gap-1 text-[10px] font-bold">
                    {ACCESS_LEVELS.map(l => <span key={l} className={`rounded-full px-2 py-0.5 ${LEVEL_COLOR[l]}`}>{l}</span>)}
                  </div>
                  <button onClick={() => { void saveAssignments(); }} disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save Permissions'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {modules.map(mod => {
                  const modScreens = activeScreens.filter(s => s.module === mod);
                  return (
                    <div key={mod}>
                      <div className="sticky top-0 bg-slate-50 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">{mod}</div>
                      {modScreens.map(s => {
                        const assigned = assignments[s.screen_id];
                        return (
                          <div key={s.screen_id} className="flex items-center justify-between border-b border-slate-50 px-5 py-2.5 hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[10px] font-bold text-blue-500 w-12">{s.screen_id}</span>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{s.title}</p>
                                <p className="text-[10px] text-slate-400">{s.route}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => { const next={...assignments}; delete next[s.screen_id]; setAssignments(next); }}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${!assigned ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                none
                              </button>
                              {ACCESS_LEVELS.map(l => (
                                <button key={l} onClick={() => toggleScreen(s.screen_id, l)}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${assigned === l ? LEVEL_COLOR[l]+' ring-1 ring-current' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create / Edit Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(null)} />
          <div className="relative z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">{drawer === 'create' ? 'New Role' : 'Edit Role'}</h2>
              <button onClick={() => setDrawer(null)} className="rounded-lg p-2 hover:bg-slate-100">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role Name</label>
                <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))}
                  placeholder="e.g. Sales Agent NL"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                  rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_system} onChange={e => setForm(p=>({...p,is_system:e.target.checked}))} />
                <span className="text-sm text-slate-600">System role (protected)</span>
              </label>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawer(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => { void submitRole(); }} disabled={saving || !form.name}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? 'Saving…' : drawer === 'create' ? 'Create Role' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative z-50 rounded-2xl bg-white p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Role?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete <span className="font-semibold text-slate-700">"{selected?.name}"</span> and remove all its screen assignments. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => { void deleteRole(); }} disabled={saving}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Deleting…' : 'Delete Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
