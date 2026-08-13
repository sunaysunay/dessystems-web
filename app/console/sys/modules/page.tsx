'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

const STATUS_OPTIONS = ['live', 'in_progress', 'planned'];
const STATUS_COLOR: Record<string,string> = {
  live:        'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  planned:     'bg-slate-100 text-slate-500',
};

type DrawerMode = 'create' | 'edit' | null;
const EMPTY = { code:'', name:'', description:'', status:'in_progress' };

export default function SY005Page() {
  const [modules, setModules]   = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [drawer, setDrawer]     = useState<DrawerMode>(null);
  const [form, setForm]         = useState<any>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch]     = useState('');
  const [screenCounts, setScreenCounts] = useState<Record<string,number>>({});

  function showToast(m: string) { setToast(m); setTimeout(()=>setToast(''),2500); }

  async function load() {
    const [mj, sj] = await Promise.all([
      fetch('/api/bop/sys/modules').then(r=>r.json()),
      fetch('/api/bop/sys/screens').then(r=>r.json()),
    ]);
    setModules(mj.modules ?? []);
    const counts: Record<string,number> = {};
    (sj.screens ?? []).forEach((s: any) => { counts[s.module] = (counts[s.module] ?? 0) + 1; });
    setScreenCounts(counts);
  }

  useEffect(() => { void load(); }, []);

  function openCreate() { setForm(EMPTY); setDrawer('create'); }
  function openEdit()   { if (selected) { setForm({ code: selected.code, name: selected.name, description: selected.description ?? '', status: selected.status }); setDrawer('edit'); } }

  function onChange(e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((p: any) => ({ ...p, [name]: value }));
  }

  async function submit() {
    setSaving(true);
    if (drawer === 'create') {
      const res = await fetch('/api/bop/sys/modules', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
      const j = await res.json();
      if (!res.ok) { showToast('Error: ' + j.error); setSaving(false); return; }
      showToast('Module created');
    } else if (drawer === 'edit' && selected) {
      const res = await fetch(`/api/bop/sys/modules/${selected.code}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
      const j = await res.json();
      if (!res.ok) { showToast('Error: ' + j.error); setSaving(false); return; }
      showToast('Module updated');
    }
    setSaving(false);
    setDrawer(null);
    await load();
  }

  async function deleteModule() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/bop/sys/modules/${selected.code}`, { method: 'DELETE' });
    setSaving(false);
    setConfirmDelete(false);
    setSelected(null);
    showToast('Module deleted');
    await load();
  }

  const filtered = modules.filter(m =>
    !search || m.code.toLowerCase().includes(search.toLowerCase()) || m.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <ScreenHeader title="Module Manager" description="CRUD for BOP core modules — SY005" />

      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex h-[calc(100vh-11rem)] gap-4">
        {/* LEFT */}
        <div className="w-72 flex-shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Modules ({filtered.length})</p>
            <button onClick={openCreate} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700">+ New</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code or name…" autoComplete="off"
            className="border-b border-slate-100 px-4 py-2 text-sm focus:outline-none" />
          <div className="flex-1 overflow-y-auto">
            {filtered.map(m => (
              <div key={m.code} onClick={() => setSelected(m)}
                className={`cursor-pointer border-b border-slate-50 px-4 py-3 transition-colors ${
                  selected?.code === m.code ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-blue-600">{m.code}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_COLOR[m.status] ?? STATUS_COLOR.planned}`}>{m.status}</span>
                </div>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{m.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{screenCounts[m.code] ?? 0} screens</p>
              </div>
            ))}
            {filtered.length === 0 && <p className="px-4 py-6 text-xs text-slate-400">No modules found</p>}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <p className="text-sm">Select a module</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-2xl font-bold text-blue-600">{selected.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[selected.status] ?? STATUS_COLOR.planned}`}>{selected.status}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                  {selected.description && <p className="text-sm text-slate-400 mt-0.5">{selected.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={openEdit} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">Edit</button>
                  <button onClick={() => setConfirmDelete(true)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">Delete</button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                {[
                  ['Code', selected.code],
                  ['Name', selected.name],
                  ['Status', selected.status],
                  ['Screens', screenCounts[selected.code] ?? 0],
                  ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString('nl-NL') : '—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-700">{v}</p>
                  </div>
                ))}
              </div>

              {selected.description && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Description</p>
                  <p className="text-sm text-slate-600">{selected.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(null)} />
          <div className="relative z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">{drawer === 'create' ? 'New Module' : 'Edit Module'}</h2>
              <button onClick={() => setDrawer(null)} className="rounded-lg p-2 hover:bg-slate-100">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Module Code <span className="text-red-400">*</span></label>
                <input name="code" value={form.code} onChange={onChange} disabled={drawer==='edit'}
                  placeholder="e.g. FIN" maxLength={6}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono uppercase focus:outline-none disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-red-400">*</span></label>
                <input name="name" value={form.name} onChange={onChange} placeholder="e.g. Finance"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={onChange} rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <BopSelect value={form.status} onChange={v=>setForm((p:any)=>({...p,status:v}))}
                  options={STATUS_OPTIONS.map(s=>({value:s, label:s}))}
                  placeholder="Status" size="md" />
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawer(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => { void submit(); }} disabled={saving || !form.code || !form.name}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? 'Saving…' : drawer === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative z-50 rounded-2xl bg-white p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Module?</h3>
            <p className="text-sm text-slate-500 mb-5">Deleting <span className="font-semibold text-slate-700">"{selected?.code}"</span> will not delete its screens but will break their module reference. Proceed?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => { void deleteModule(); }} disabled={saving} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
