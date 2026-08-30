'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface Part {
  part_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  parts: Part[];
  labour_minutes: number;
  fixed_price: number;
  category: string | null;
  active: boolean;
  created_at: string;
  updated_at: string | null;
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const ACTIVE_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function eur(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function partsTotal(parts: Part[]): number {
  return (parts || []).reduce((sum, p) => sum + (p.quantity || 0) * (p.unit_price || 0), 0);
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function ServicePackagesPage() {
  const [rows, setRows] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeFilter, setActiveFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formLabourMin, setFormLabourMin] = useState('');
  const [formFixedPrice, setFormFixedPrice] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formParts, setFormParts] = useState<Part[]>([]);

  // Toast
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  /* ── Data loading ────────────────────────────────────────────────────────── */

  function loadPackages() {
    setLoading(true);
    const p = new URLSearchParams();
    if (activeFilter) p.set('active', activeFilter);
    if (categoryFilter) p.set('category', categoryFilter);
    fetch(`/api/bop/wrk/packages?${p}`)
      .then(r => r.json())
      .then(j => { setRows(j.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPackages(); }, [activeFilter, categoryFilter]);

  /* ── Unique categories from data ─────────────────────────────────────────── */

  const categories = Array.from(new Set(rows.map(r => r.category).filter(Boolean) as string[])).sort();

  /* ── Form management ─────────────────────────────────────────────────────── */

  function resetForm() {
    setEditId(null);
    setFormName('');
    setFormDesc('');
    setFormCategory('');
    setFormLabourMin('');
    setFormFixedPrice('');
    setFormActive(true);
    setFormParts([]);
    setShowForm(false);
  }

  function startEdit(pkg: Package) {
    setEditId(pkg.id);
    setFormName(pkg.name);
    setFormDesc(pkg.description ?? '');
    setFormCategory(pkg.category ?? '');
    setFormLabourMin(String(pkg.labour_minutes));
    setFormFixedPrice(String(pkg.fixed_price));
    setFormActive(pkg.active);
    setFormParts((pkg.parts || []).map(p => ({ ...p })));
    setShowForm(true);
  }

  function addPartRow() {
    setFormParts([...formParts, { description: '', quantity: 1, unit_price: 0 }]);
  }

  function updatePartRow(idx: number, field: keyof Part, value: string | number) {
    const updated = formParts.map((p, i) => {
      if (i !== idx) return p;
      return { ...p, [field]: value };
    });
    setFormParts(updated);
  }

  function removePartRow(idx: number) {
    setFormParts(formParts.filter((_, i) => i !== idx));
  }

  function savePackage() {
    if (!formName) { showToast('Name is required'); return; }

    const payload = {
      name: formName,
      description: formDesc || null,
      parts: formParts.map(p => ({
        description: p.description,
        quantity: Number(p.quantity),
        unit_price: Number(p.unit_price),
      })),
      labour_minutes: parseInt(formLabourMin) || 0,
      fixed_price: parseFloat(formFixedPrice) || 0,
      category: formCategory || null,
      active: formActive,
    };

    if (editId) {
      fetch('/api/bop/wrk/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...payload }),
      })
        .then(r => r.json())
        .then(j => {
          if (j.error) { showToast(`Error: ${j.error}`); return; }
          showToast('Package updated');
          resetForm();
          loadPackages();
        });
    } else {
      fetch('/api/bop/wrk/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(r => r.json())
        .then(j => {
          if (j.error) { showToast(`Error: ${j.error}`); return; }
          showToast('Package created');
          resetForm();
          loadPackages();
        });
    }
  }

  function deactivatePackage(id: string) {
    if (!confirm('Deactivate this service package?')) return;
    fetch('/api/bop/wrk/packages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { showToast(`Error: ${j.error}`); return; }
        showToast('Package deactivated');
        loadPackages();
      });
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="p-6 space-y-4">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <ScreenHeader />

      {/* Action row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => { if (showForm && !editId) { resetForm(); } else { resetForm(); setShowForm(true); } }}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm">
          + Add Package
        </button>

        {/* Active tabs */}
        <div className="flex gap-1">
          {ACTIVE_TABS.map(t => (
            <button key={t.value} onClick={() => setActiveFilter(t.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === t.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 focus:border-blue-400 focus:outline-none">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <button onClick={() => { loadPackages(); showToast('Refreshed'); }}
          className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          Refresh
        </button>

        <span className="text-xs text-slate-400">{rows.length} packages</span>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {editId ? 'Edit Package' : 'New Service Package'}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="text" placeholder="Package name" value={formName}
              onChange={e => setFormName(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
            <input type="text" placeholder="Category" value={formCategory}
              onChange={e => setFormCategory(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Labour (minutes)" value={formLabourMin}
                onChange={e => setFormLabourMin(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
              {formLabourMin && (
                <span className="text-xs text-slate-400 whitespace-nowrap">{fmtMinutes(parseInt(formLabourMin) || 0)}</span>
              )}
            </div>
            <input type="number" step="0.01" placeholder="Fixed price (EUR)" value={formFixedPrice}
              onChange={e => setFormFixedPrice(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
          </div>

          <textarea placeholder="Description (optional)" value={formDesc}
            onChange={e => setFormDesc(e.target.value)} rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />

          {/* Parts builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Parts</div>
              <button onClick={addPartRow}
                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200">
                + Add Part
              </button>
            </div>
            {formParts.length > 0 && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit Price</span>
                  <span></span>
                </div>
                {formParts.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2">
                    <input type="text" placeholder="Part description" value={p.description}
                      onChange={e => updatePartRow(idx, 'description', e.target.value)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
                    <input type="number" min="1" value={p.quantity}
                      onChange={e => updatePartRow(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none" />
                    <input type="number" step="0.01" value={p.unit_price}
                      onChange={e => updatePartRow(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none" />
                    <button onClick={() => removePartRow(idx)}
                      className="rounded bg-red-50 px-1 py-1 text-[10px] font-bold text-red-500 hover:bg-red-100">
                      X
                    </button>
                  </div>
                ))}
                <div className="text-xs text-slate-500 px-1">
                  Parts total: <span className="font-semibold text-slate-700">{eur(partsTotal(formParts))}</span>
                </div>
              </div>
            )}
          </div>

          {/* Active toggle + actions */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)}
                className="rounded border-slate-300" />
              Active
            </label>
            <div className="ml-auto flex gap-2">
              <button onClick={savePackage}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                {editId ? 'Update' : 'Save'}
              </button>
              <button onClick={resetForm}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No packages found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Parts</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Labour</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Fixed Price</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(pkg => {
                  const pCount = (pkg.parts || []).length;
                  const pTotal = partsTotal(pkg.parts || []);
                  const isExpanded = expandedId === pkg.id;
                  const labourCostEstimate = (pkg.labour_minutes / 60) * 85; // placeholder monteur rate
                  const totalCost = pTotal + labourCostEstimate;
                  const margin = pkg.fixed_price - totalCost;

                  return (
                    <tr key={pkg.id} className="group">
                      <td colSpan={7} className="p-0">
                        {/* Main row */}
                        <div className={`flex items-center hover:bg-slate-50 transition-colors cursor-pointer ${!pkg.active ? 'opacity-50' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : pkg.id)}>
                          <div className="px-4 py-2.5 w-[200px] flex-shrink-0">
                            <div className="text-xs font-semibold text-slate-700">{pkg.name}</div>
                            {pkg.description && <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{pkg.description}</div>}
                          </div>
                          <div className="px-4 py-2.5 w-[120px] flex-shrink-0">
                            {pkg.category ? (
                              <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {pkg.category}
                              </span>
                            ) : <span className="text-xs text-slate-400">—</span>}
                          </div>
                          <div className="px-4 py-2.5 w-[80px] flex-shrink-0 text-xs text-slate-600">
                            {pCount} {pCount === 1 ? 'item' : 'items'}
                          </div>
                          <div className="px-4 py-2.5 w-[100px] flex-shrink-0 text-xs text-slate-600">
                            {fmtMinutes(pkg.labour_minutes)}
                          </div>
                          <div className="px-4 py-2.5 w-[120px] flex-shrink-0 text-xs font-semibold text-slate-700">
                            {eur(pkg.fixed_price)}
                          </div>
                          <div className="px-4 py-2.5 w-[80px] flex-shrink-0">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              pkg.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {pkg.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="px-4 py-2.5 flex-1">
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => startEdit(pkg)}
                                className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">
                                Edit
                              </button>
                              {pkg.active && (
                                <button onClick={() => deactivatePackage(pkg.id)}
                                  className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100">
                                  Deactivate
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4 space-y-3">
                            {/* Parts detail table */}
                            {(pkg.parts || []).length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full max-w-2xl text-xs">
                                  <thead>
                                    <tr className="text-left">
                                      <th className="pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Part</th>
                                      <th className="pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Qty</th>
                                      <th className="pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Unit Price</th>
                                      <th className="pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Line Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(pkg.parts || []).map((part, i) => (
                                      <tr key={i}>
                                        <td className="py-1.5 text-slate-600">{part.description || '—'}</td>
                                        <td className="py-1.5 text-slate-600">{part.quantity}</td>
                                        <td className="py-1.5 text-slate-600">{eur(part.unit_price)}</td>
                                        <td className="py-1.5 font-semibold text-slate-700">{eur(part.quantity * part.unit_price)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400">No parts defined</div>
                            )}

                            {/* Cost breakdown */}
                            <div className="flex flex-wrap gap-4 rounded-lg bg-white border border-slate-200 p-3">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Parts Total</div>
                                <div className="text-sm font-semibold text-slate-700">{eur(pTotal)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Labour Cost (est.)</div>
                                <div className="text-sm font-semibold text-slate-700">{eur(labourCostEstimate)}</div>
                                <div className="text-[10px] text-slate-400">{fmtMinutes(pkg.labour_minutes)} @ monteur rate</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Cost</div>
                                <div className="text-sm font-semibold text-slate-700">{eur(totalCost)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fixed Price</div>
                                <div className="text-sm font-semibold text-slate-700">{eur(pkg.fixed_price)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Margin</div>
                                <div className={`text-sm font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {eur(margin)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
