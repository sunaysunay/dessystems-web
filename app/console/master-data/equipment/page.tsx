'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const CATEGORIES = ['towing','heating','solar','awning','kitchen','bathroom','safety','connectivity','navigation','storage','other'];
const EMPTY = { name: '', category: 'towing', brand: '', part_number: '', compatible_types: '', description: '', unit_price: '' };

export default function MD004Page() {
  const [items, setItems]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState<any>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (catFilter) params.set('category', catFilter);
    const d = await fetch('/api/bop/md/equipment?' + params).then(r => r.json()).catch(() => ({ equipment: [] }));
    setItems(d.equipment ?? []);
    setLoading(false);
  }, [search, catFilter]);
  useEffect(() => { void load(); }, [load]);

  function openNew() { setEditing(null); setForm(EMPTY); setDrawerOpen(true); }
  function openEdit(item: any) { setEditing(item); setForm(item); setDrawerOpen(true); }

  async function save() {
    if (!form.name?.trim()) return;
    setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/bop/md/equipment/${editing.id}` : '/api/bop/md/equipment';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false); setDrawerOpen(false);
    showToast(editing ? 'Updated' : 'Created');
    void load();
  }

  async function del(item: any) {
    if (!confirm('Delete ' + item.name + '?')) return;
    await fetch('/api/bop/md/equipment/' + item.id, { method: 'DELETE' });
    showToast('Deleted'); void load();
  }

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.name?.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q)) &&
           (!catFilter || i.category === catFilter);
  });

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Equipment Catalog" description="MD004 — Accessories, parts and equipment compatible with vehicle types" />

      <div className="mb-5 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Items</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{loading ? '—' : items.length}</p>
        </div>
        {['towing','solar','heating'].map(cat => (
          <div key={cat} className="rounded-xl border border-slate-200 bg-white p-4 cursor-pointer hover:border-slate-300" onClick={() => setCatFilter(catFilter === cat ? '' : cat)}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{cat}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{loading ? '—' : items.filter(i => i.category === cat).length}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or brand..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-blue-400" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <button onClick={() => { void load(); }} className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Refresh</button>
        <button onClick={openNew} className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">+ Add Item</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Category</th>
              <th className="px-5 py-3 text-left">Brand</th>
              <th className="px-5 py-3 text-left">Part #</th>
              <th className="px-5 py-3 text-left">Compatible</th>
              <th className="px-5 py-3 text-right">Unit Price</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                {items.length === 0 ? 'No equipment items yet — click + Add Item to start' : 'No items match filter'}
              </td></tr>
            ) : filtered.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(item)}>
                <td className="px-5 py-3 font-medium text-slate-800">{item.name}</td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 capitalize">{item.category}</span>
                </td>
                <td className="px-5 py-3 text-slate-500">{item.brand || '—'}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-slate-400">{item.part_number || '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-400">{item.compatible_types || '—'}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-700">
                  {item.unit_price ? '€' + Number(item.unit_price).toFixed(2) : '—'}
                </td>
                <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { void del(item); }} className="text-xs text-slate-300 hover:text-red-500">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Item' : 'New Equipment Item'}</h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {([['Name *', 'name', 'text'], ['Brand', 'brand', 'text'], ['Part Number', 'part_number', 'text'], ['Unit Price (€)', 'unit_price', 'number']] as [string, string, string][]).map(([lbl, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{lbl}</label>
                  <input type={type} value={form[key] ?? ''} onChange={e => f(key, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select value={form.category} onChange={e => f('category', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Compatible Vehicle Types</label>
                <input value={form.compatible_types ?? ''} onChange={e => f('compatible_types', e.target.value)}
                  placeholder="e.g. caravan, camper, van"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={form.description ?? ''} onChange={e => f('description', e.target.value)} rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => { void save(); }} disabled={saving || !form.name?.trim()}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
