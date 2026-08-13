'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

export default function IN006Page() {
  const { unit } = useScope();
  const [models, setModels] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [search, setSearch] = useState('');
  const [fBrand, setFBrand] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [nBrand, setNBrand] = useState(''); const [nName, setNName] = useState('');
  const [nGen, setNGen] = useState(''); const [nFrom, setNFrom] = useState(''); const [nTo, setNTo] = useState('');
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [eName, setEName] = useState(''); const [eGen, setEGen] = useState(''); const [eFrom, setEFrom] = useState(''); const [eTo, setETo] = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ tenant_id: String(unit.id) });
    if (fBrand) p.set('brand_id', fBrand);
    if (search) p.set('search', search);
    const j = await fetch(`/api/bop/mkp/models?${p}`).then(r => r.json());
    setModels(j.models ?? []); setLoading(false);
  }, [unit.id, fBrand, search]);
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [load]);
  useEffect(() => { fetch(`/api/bop/mkp/brands?tenant_id=${unit.id}`).then(r => r.json()).then(j => setBrands(j.brands ?? [])); }, [unit.id]);

  const brandOpts = [{ value: '', label: 'All brands' }, ...brands.map(b => ({ value: String(b.id), label: b.name }))];
  const newBrandOpts = [{ value: '', label: 'Select brand…' }, ...brands.map(b => ({ value: String(b.id), label: b.name }))];

  async function createModel() {
    if (!nBrand || !nName.trim()) return;
    setCreating(true);
    const j = await fetch('/api/bop/mkp/models', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: unit.id, brand_id: Number(nBrand), name: nName.trim(),
        generation: nGen.trim() || null, year_from: nFrom ? Number(nFrom) : null, year_to: nTo ? Number(nTo) : null,
      }),
    }).then(r => r.json());
    setCreating(false);
    if (j.error) return showToast(j.error);
    setShowNew(false); setNBrand(''); setNName(''); setNGen(''); setNFrom(''); setNTo(''); void load();
  }

  function openEdit(m: any) {
    setEditId(m.id); setEName(m.name); setEGen(m.generation ?? ''); setEFrom(m.year_from ?? ''); setETo(m.year_to ?? '');
  }
  async function saveEdit() {
    if (editId === null) return;
    const j = await fetch(`/api/bop/mkp/models/${editId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: eName.trim(), generation: eGen.trim() || null, year_from: eFrom ? Number(eFrom) : null, year_to: eTo ? Number(eTo) : null }),
    }).then(r => r.json());
    if (j.error) return showToast(j.error);
    setEditId(null); void load();
  }
  async function del(id: number) {
    if (!confirm('Delete this model?')) return;
    const j = await fetch(`/api/bop/mkp/models/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (j.error) return showToast(j.error);
    setModels(ms => ms.filter(m => m.id !== id)); showToast('Deleted');
  }

  return (
    <div className="p-6">
      <ScreenHeader title="Model Catalog" description="All vehicle models across brands — tenant-scoped, searchable" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input type="text" placeholder="Search model…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <BopSelect size="sm" className="w-44" value={fBrand} onChange={setFBrand} options={brandOpts} />
        <span className="ml-auto text-xs text-slate-400">{models.length} model{models.length === 1 ? '' : 's'}</span>
        <button onClick={() => setShowNew(true)} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">+ Add model</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Model</th>
              <th className="px-3 py-3">Brand</th>
              <th className="px-3 py-3">Generation</th>
              <th className="px-3 py-3">Years</th>
              <th className="px-3 py-3">Listings</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            : models.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No models yet. Click "+ Add model" to create one.</td></tr>
            : models.map(m => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-3 py-3 font-medium text-slate-800">{m.name}</td>
                <td className="px-3 py-3 text-slate-600">{m.brand_name}</td>
                <td className="px-3 py-3 text-slate-500">{m.generation ?? '—'}</td>
                <td className="px-3 py-3 text-slate-500">{m.year_from || m.year_to ? `${m.year_from ?? '?'}–${m.year_to ?? '?'}` : '—'}</td>
                <td className="px-3 py-3 text-slate-600">{m.listing_count}</td>
                <td className="px-3 py-3 text-right">
                  <button onClick={() => openEdit(m)} className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">Edit</button>
                  <button onClick={() => { void del(m.id); }} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-900">New model</h2>
            <div className="space-y-4">
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Brand</label><BopSelect size="md" value={nBrand} onChange={setNBrand} options={newBrandOpts} /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Name</label><input autoFocus value={nName} onChange={e => setNName(e.target.value)} placeholder="e.g. Sprinter" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Generation (optional)</label><input value={nGen} onChange={e => setNGen(e.target.value)} placeholder="e.g. W907" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div className="flex gap-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-500">Year from</label><input type="number" value={nFrom} onChange={e => setNFrom(e.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-500">Year to</label><input type="number" value={nTo} onChange={e => setNTo(e.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void createModel(); }} disabled={creating || !nBrand || !nName.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{creating ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {editId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setEditId(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-900">Edit model</h2>
            <div className="space-y-4">
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Name</label><input value={eName} onChange={e => setEName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Generation</label><input value={eGen} onChange={e => setEGen(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              <div className="flex gap-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-500">Year from</label><input type="number" value={eFrom} onChange={e => setEFrom(e.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-500">Year to</label><input type="number" value={eTo} onChange={e => setETo(e.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditId(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void saveEdit(); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
