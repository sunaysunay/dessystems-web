'use client';
import { useState, useEffect, useMemo, Fragment , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';

const CATEGORIES = ['van','truck','trailer','camper','caravan','bus','machinery','construction'] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function MD002Page() {
  const { unit } = useScope();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modelsByBrand, setModelsByBrand] = useState<Record<number, any[]>>({});
  const [toast, setToast] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState(''); const [nCountry, setNCountry] = useState(''); const [nCats, setNCats] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [newModelName, setNewModelName] = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/mkp/brands?tenant_id=${unit.id}`).then(r => r.json());
    setBrands(j.brands ?? []); setLoading(false);
  }, [unit.id]);
  useEffect(() => { void load(); setExpanded(null); setModelsByBrand({});   }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const s = search.toLowerCase();
    return brands.filter(b => b.name.toLowerCase().includes(s));
  }, [brands, search]);

  async function toggleExpand(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!modelsByBrand[id]) {
      const j = await fetch(`/api/bop/mkp/brands/${id}/models`).then(r => r.json());
      setModelsByBrand(m => ({ ...m, [id]: j.models ?? [] }));
    }
  }

  async function createBrand() {
    if (!nName.trim()) return;
    setCreating(true);
    const j = await fetch('/api/bop/mkp/brands', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: unit.id, name: nName.trim(), country_origin: nCountry.trim().toUpperCase() || null, categories: nCats }),
    }).then(r => r.json());
    setCreating(false);
    if (j.error) return showToast(j.error);
    setShowNew(false); setNName(''); setNCountry(''); setNCats([]); void load();
  }

  async function deleteBrand(id: number, name: string) {
    if (!confirm(`Delete brand "${name}"? Its models will be removed too.`)) return;
    const j = await fetch(`/api/bop/mkp/brands/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (j.error) return showToast(j.error);
    setBrands(bs => bs.filter(b => b.id !== id)); showToast('Deleted');
  }

  async function addModel(brandId: number) {
    if (!newModelName.trim()) return;
    const j = await fetch(`/api/bop/mkp/brands/${brandId}/models`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newModelName.trim() }),
    }).then(r => r.json());
    if (j.error) return showToast(j.error);
    setNewModelName('');
    const mj = await fetch(`/api/bop/mkp/brands/${brandId}/models`).then(r => r.json());
    setModelsByBrand(m => ({ ...m, [brandId]: mj.models ?? [] }));
    setBrands(bs => bs.map(b => b.id === brandId ? { ...b, model_count: (b.model_count ?? 0) + 1 } : b));
  }

  async function deleteModel(brandId: number, modelId: number) {
    const j = await fetch(`/api/bop/mkp/brands/${brandId}/models/${modelId}`, { method: 'DELETE' }).then(r => r.json());
    if (j.error) return showToast(j.error);
    setModelsByBrand(m => ({ ...m, [brandId]: (m[brandId] ?? []).filter(x => x.id !== modelId) }));
    setBrands(bs => bs.map(b => b.id === brandId ? { ...b, model_count: Math.max(0, (b.model_count ?? 1) - 1) } : b));
  }

  return (
    <div className="p-6">
      <ScreenHeader title="Brands" description="Manage vehicle brands and models — own list per platform, never shared" />

      <div className="mb-4 flex items-center gap-2">
        <input type="text" placeholder="Search brand…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="ml-auto text-xs text-slate-400">{filtered.length} of {brands.length}</span>
        <button onClick={() => setShowNew(true)} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">+ Add brand</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 w-8"></th>
              <th className="px-3 py-3">Brand</th>
              <th className="px-3 py-3">Country</th>
              <th className="px-3 py-3">Categories</th>
              <th className="px-3 py-3">Models</th>
              <th className="px-3 py-3">Listings</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No brands yet. Click "+ Add brand" to create one.</td></tr>
            : filtered.map(b => (
              <Fragment key={b.id}>
                <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => { void toggleExpand(b.id); }}>
                  <td className="px-3 py-3 text-slate-400">{expanded === b.id ? '▾' : '▸'}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{b.name}</td>
                  <td className="px-3 py-3 text-slate-500">{b.country_origin ?? '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(b.categories ?? []).map((c: string) => <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{cap(c)}</span>)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{b.model_count}</td>
                  <td className="px-3 py-3 text-slate-600">{b.listing_count}</td>
                  <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { void deleteBrand(b.id, b.name); }} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
                  </td>
                </tr>
                {expanded === b.id && (
                  <tr>
                    <td></td>
                    <td colSpan={6} className="bg-slate-50/70 px-3 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="New model name…"
                          onKeyDown={(e) => { if (e.key === 'Enter') void addModel(b.id); }}
                          className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm" />
                        <button onClick={() => { void addModel(b.id); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">+ Add model</button>
                      </div>
                      {(modelsByBrand[b.id] ?? []).length === 0 ? (
                        <p className="px-1 text-xs text-slate-400">No models yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(modelsByBrand[b.id] ?? []).map(m => (
                            <span key={m.id} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                              {m.name}
                              <button onClick={() => { void deleteModel(b.id, m.id); }} className="text-slate-300 hover:text-red-500">✕</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-900">New brand</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Name</label>
                <input autoFocus value={nName} onChange={e => setNName(e.target.value)} placeholder="e.g. Mercedes-Benz"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Country (optional, 2-letter)</label>
                <input value={nCountry} onChange={e => setNCountry(e.target.value.slice(0, 2))} placeholder="DE"
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Categories (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c} type="button"
                      onClick={() => setNCats(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c])}
                      className={`rounded-full border px-3 py-1 text-xs ${nCats.includes(c) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {cap(c)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void createBrand(); }} disabled={creating || !nName.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {creating ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
