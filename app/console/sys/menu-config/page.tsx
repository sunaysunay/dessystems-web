'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';
import { MODULE_NAMES } from '@/lib/module-labels';

const STATUS_OPTIONS = ['active','v3','legacy'];
const STATUS_COLOR: Record<string,string> = {
  active:'bg-emerald-100 text-emerald-700', v3:'bg-slate-100 text-slate-400', legacy:'bg-amber-100 text-amber-600',
};

export default function SY006Page() {
  const [screens, setScreens]   = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [modFilter, setModFilter] = useState('');
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [draft, setDraft]       = useState<any>(null);

  function showToast(m: string) { setToast(m); setTimeout(()=>setToast(''),2500); }

  async function load() {
    const j = await fetch('/api/bop/sys/screens').then(r=>r.json());
    setScreens(j.screens ?? []);
  }
  useEffect(() => { void load(); }, []);

  function select(s: any) { setSelected(s); setDraft({ sequence: s.sequence, parent_id: s.parent_id ?? '', status: s.status, module: s.module }); }

  function onChange(e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) {
    const { name, value } = e.target;
    setDraft((p: any) => ({ ...p, [name]: name === 'sequence' ? Number(value) : value }));
  }

  async function move(dir: 'up'|'down') {
    if (!selected) return;
    const sameGroup = screens.filter(s => s.module === selected.module).sort((a,b)=>a.sequence-b.sequence);
    const idx = sameGroup.findIndex(s => s.screen_id === selected.screen_id);
    const swapWith = dir === 'up' ? sameGroup[idx-1] : sameGroup[idx+1];
    if (!swapWith) return;
    setSaving(true);
    await Promise.all([
      fetch(`/api/bop/sys/screens/${selected.screen_id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sequence: swapWith.sequence }) }),
      fetch(`/api/bop/sys/screens/${swapWith.screen_id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sequence: selected.sequence }) }),
    ]);
    setSaving(false);
    await load();
    showToast('Order updated');
  }

  async function save() {
    if (!selected || !draft) return;
    setSaving(true);
    const res = await fetch(`/api/bop/sys/screens/${selected.screen_id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ sequence: draft.sequence, parent_id: draft.parent_id || null, status: draft.status, module: draft.module }),
    });
    const j = await res.json();
    if (!res.ok) { showToast('Error: ' + j.error); setSaving(false); return; }
    setSaving(false);
    showToast('Saved');
    setSelected((p: any) => ({ ...p, ...draft }));
    setScreens(prev => prev.map(s => s.screen_id === selected.screen_id ? { ...s, ...draft } : s));
  }

  const modules = [...new Set(screens.map(s => s.module))].sort();
  const filtered = screens
    .filter(s => (!modFilter || s.module === modFilter) && (!search || s.screen_id.toLowerCase().includes(search.toLowerCase()) || s.title.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b) => a.module.localeCompare(b.module) || a.sequence - b.sequence);

  const groupedModules = modules.filter(m => !modFilter || m === modFilter);

  return (
    <div>
      <ScreenHeader title="Menu Config" description="Reorder screens, set sequence, parent and status — SY006" />
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex h-[calc(100vh-11rem)] gap-4">
        {/* LEFT — grouped list */}
        <div className="w-72 flex-shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Screens ({filtered.length})</p>
          </div>
          <div className="border-b border-slate-100 p-2 space-y-1.5">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" autoComplete="off"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none" />
            <BopSelect value={modFilter} onChange={setModFilter}
              options={[{value:'',label:'All modules'}, ...modules.map(m=>({value:m, label:m, sublabel: MODULE_NAMES[m]}))]}
              placeholder="All modules" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {groupedModules.map(mod => {
              const modScreens = filtered.filter(s => s.module === mod);
              if (modScreens.length === 0) return null;
              return (
                <div key={mod}>
                  <div className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 flex items-center justify-between">
                    <span>{mod}</span>
                    <span className="text-slate-300">{modScreens.length}</span>
                  </div>
                  {modScreens.map((s, idx) => (
                    <div key={s.screen_id} onClick={() => select(s)}
                      className={`flex cursor-pointer items-center gap-2 border-b border-slate-50 px-3 py-2 transition-colors ${
                        selected?.screen_id === s.screen_id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
                      }`}>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={e=>{e.stopPropagation();select(s);void move('up');}} disabled={idx===0}
                          className="text-[8px] text-slate-300 hover:text-slate-600 disabled:opacity-20 leading-none">▲</button>
                        <button onClick={e=>{e.stopPropagation();select(s);void move('down');}} disabled={idx===modScreens.length-1}
                          className="text-[8px] text-slate-300 hover:text-slate-600 disabled:opacity-20 leading-none">▼</button>
                      </div>
                      <span className="w-5 text-center text-[10px] font-mono text-slate-400">{s.sequence}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-blue-500">{s.screen_id}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${STATUS_COLOR[s.status]??STATUS_COLOR.legacy}`}>{s.status}</span>
                        </div>
                        <p className="truncate text-xs font-medium text-slate-700">{s.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — edit panel */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
              <p className="text-sm">Select a screen to configure</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-lg font-bold text-blue-600">{selected.screen_id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[selected.status]??STATUS_COLOR.legacy}`}>{selected.status}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{selected.route}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { void move('up'); }} disabled={saving}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">↑ Move Up</button>
                  <button onClick={() => { void move('down'); }} disabled={saving}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">↓ Move Down</button>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-5 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Navigation Properties</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Module</label>
                    <BopSelect value={draft?.module??''} onChange={v=>onChange({target:{name:'module',value:v}} as any)}
                      options={modules.map(m=>({value:m, label:m}))}
                      placeholder="Select module" size="md" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Sequence</label>
                    <input type="number" name="sequence" value={draft?.sequence??0} onChange={onChange}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                    <BopSelect value={draft?.status??'active'} onChange={v=>onChange({target:{name:'status',value:v}} as any)}
                      options={STATUS_OPTIONS.map(s=>({value:s, label:s}))}
                      placeholder="Status" size="md" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Parent Screen ID</label>
                    <input name="parent_id" value={draft?.parent_id??''} onChange={onChange}
                      placeholder="e.g. SY002 (leave empty for top-level)"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { void save(); }} disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                {[['Screen ID', selected.screen_id],['Title', selected.title],['Route', selected.route],['Function Type', selected.func_type],['Current Seq', selected.sequence],['Parent', selected.parent_id??'—']].map(([k,v])=>(
                  <div key={k}><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k}</p><p className="mt-0.5 font-mono text-xs text-slate-700">{v}</p></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
