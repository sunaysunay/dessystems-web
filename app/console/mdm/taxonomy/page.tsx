'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const VEHICLE_TYPES = ['car','van','truck','camper','caravan','boat','machinery','other'];
const EMPTY = { category:'car', make:'', model:'', variant:'', year_from:'', year_to:'', fuel_type:'', transmission:'' };

export default function MD003Page() {
  const [taxonomy, setTaxonomy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const j = await fetch(`/api/bop/md/taxonomy?${params}`).then(r => r.json());
    const all = j.taxonomy ?? [];
    setTaxonomy(typeFilter ? all.filter((x: any) => x.category === typeFilter) : all);
    setLoading(false);
  }, [search, typeFilter]);
  useEffect(() => { void load(); }, [load]);

  function openNew() { setEditing(null); setForm(EMPTY); setDrawerOpen(true); }
  function openEdit(e: any) { setEditing(e); setForm(e); setDrawerOpen(true); }

  async function save() {
    if (!form.make.trim()) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/bop/md/taxonomy/${editing.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      showToast('Updated');
    } else {
      await fetch('/api/bop/md/taxonomy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      showToast('Created');
    }
    setSaving(false); setDrawerOpen(false); void load();
  }

  async function del(e: any) {
    await fetch(`/api/bop/md/taxonomy/${e.id}`, { method:'DELETE' });
    showToast('Deleted'); void load();
  }

  const grouped = VEHICLE_TYPES.reduce((acc: any, t) => { acc[t] = taxonomy.filter(x => x.category === t); return acc; }, {});

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Vehicle Taxonomy" description="MD003 — Make, model, variant and type catalogue" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search make, model..." className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"/>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none">
          <option value="">All types</option>
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-400">{taxonomy.length} entries</span>
        <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">+ Add Entry</button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {VEHICLE_TYPES.filter(t => !typeFilter || t === typeFilter).map(t => grouped[t]?.length > 0 && (
            <div key={t}>
              <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{t.toUpperCase()} ({grouped[t].length})</h3>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                    <tr><th className="px-4 py-2.5 text-left">Make</th><th className="px-4 py-2.5 text-left">Model</th><th className="px-4 py-2.5 text-left">Variant</th><th className="px-4 py-2.5 text-left">Years</th><th className="px-4 py-2.5 text-left">Fuel</th><th className="px-4 py-2.5 text-left">Gearbox</th><th className="px-4 py-2.5"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grouped[t].map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(e)}>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">{e.make}</td>
                        <td className="px-4 py-2.5 text-slate-600">{e.model}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{e.variant||'—'}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{e.year_from||'?'} – {e.year_to||'now'}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{e.fuel_type||'—'}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{e.transmission||'—'}</td>
                        <td className="px-4 py-2.5 text-right" onClick={e2 => e2.stopPropagation()}>
                          <button onClick={() => { void del(e); }} className="text-xs text-slate-400 hover:text-red-500">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {taxonomy.length === 0 && <div className="py-12 text-center text-sm text-slate-400">No taxonomy entries yet — click + Add Entry to start</div>}
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)}/>
          <div className="relative z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Entry' : 'New Taxonomy Entry'}</h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">x</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle Category</label>
                <select value={form.category} onChange={e => f('category', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              {([['Make *','make'],['Model *','model'],['Variant','variant'],['Year From','year_from'],['Year To','year_to'],['Fuel Type','fuel_type'],['Transmission','transmission']] as [string,string][]).map(([lbl,key]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{lbl}</label>
                  <input value={form[key]??''} onChange={e => f(key, e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void save(); }} disabled={saving || !form.make?.trim()} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving?'Saving...':editing?'Save':'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
