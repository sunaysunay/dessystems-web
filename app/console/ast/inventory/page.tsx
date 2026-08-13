'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const VEHICLE_TYPES = ['car','van','truck','camper','caravan','boat','machinery','other'] as const;
const STATUSES = ['purchased','inspection','preparation','published','reserved','sold','delivered'] as const;
const FUEL_TYPES = ['Diesel','Petrol','Electric','Hybrid','LPG','Hydrogen','CNG','Other'];
const TRANSMISSIONS = ['manual','automatic','semi-auto','other'];

const STATUS_COLOR: Record<string, string> = {
  purchased:   'bg-slate-100 text-slate-600',
  inspection:  'bg-amber-100 text-amber-700',
  preparation: 'bg-orange-100 text-orange-700',
  published:   'bg-blue-100 text-blue-700',
  reserved:    'bg-violet-100 text-violet-700',
  sold:        'bg-emerald-100 text-emerald-700',
  delivered:   'bg-green-100 text-green-700',
};

const TYPE_ICON: Record<string, string> = {
  car: '🚗', van: '🚐', truck: '🚛', camper: '🚌',
  caravan: '🏕️', boat: '⛵', machinery: '🏗️', other: '📦',
};

const LIFECYCLE = ['purchased','inspection','preparation','published','reserved','sold','delivered'];

const EMPTY = {
  vehicle_type: 'car', make: '', model: '', variant: '', year: new Date().getFullYear(),
  mileage: '', vin: '', fuel_type: 'Diesel', transmission: 'manual',
  color: '', doors: '', seats: '', power_kw: '', engine_cc: '',
  weight_kg: '', length_cm: '', cost_price: '', asking_price: '',
  status: 'purchased', location: '', notes: '', partner_id: '',
};

export default function AS001Page() {
  const { unit, user } = useScope();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [partners, setPartners] = useState<any[]>([]);
  const [view, setView] = useState<'grid'|'list'>('list');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const j = await fetch(`/api/bop/ast/assets?${params}`).then(r => r.json());
    setAssets(j.assets ?? []);
    setLoading(false);
  }, [search, typeFilter, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void fetch('/api/bop/md/partners?limit=200').then(r => r.json()).then(j => setPartners(j.partners ?? []));
  }, []);

  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, tenant_id: unit.id });
    setDrawerOpen(true);
  }

  function openEdit(a: any) {
    setEditing(a);
    setForm({ ...a, partner_id: a.partner_id ?? '' });
    setDrawerOpen(true);
  }

  async function save() {
    if (!form.make || !form.model) return;
    setSaving(true);
    const payload = {
      ...form,
      tenant_id: unit.id,
      year: form.year ? parseInt(form.year) : null,
      mileage: form.mileage ? parseInt(form.mileage) : null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      asking_price: form.asking_price ? parseFloat(form.asking_price) : null,
      power_kw: form.power_kw ? parseInt(form.power_kw) : null,
      doors: form.doors ? parseInt(form.doors) : null,
      seats: form.seats ? parseInt(form.seats) : null,
      partner_id: form.partner_id || null,
    };
    if (editing) {
      await fetch(`/api/bop/ast/assets/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-actor-email': user.email },
        body: JSON.stringify(payload),
      });
      showToast('Vehicle updated');
    } else {
      await fetch('/api/bop/ast/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-actor-email': user.email },
        body: JSON.stringify(payload),
      });
      showToast('Vehicle added to inventory');
    }
    setSaving(false);
    setDrawerOpen(false);
    void load();
  }

  // Stats
  const stats = STATUSES.reduce((acc, s) => {
    acc[s] = assets.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);
  const totalValue = assets.reduce((s, a) => s + (a.asking_price ?? 0), 0);
  const totalCost  = assets.reduce((s, a) => s + (a.cost_price ?? 0), 0);

  return (
    <div>
      <ScreenHeader title="Inventory" description="Vehicle asset registry — full lifecycle from purchase to delivery" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
          <p className="text-2xl font-bold text-slate-800">{assets.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Published</p>
          <p className="text-2xl font-bold text-blue-600">{stats.published ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reserved</p>
          <p className="text-2xl font-bold text-violet-600">{stats.reserved ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sold</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.sold ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stock Value</p>
          <p className="text-lg font-bold text-slate-800">€{totalValue.toLocaleString('nl-NL')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cost Base</p>
          <p className="text-lg font-bold text-slate-500">€{totalCost.toLocaleString('nl-NL')}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search make, model, VIN…"
          className="w-56 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        <BopSelect value={typeFilter} onChange={setTypeFilter}
          options={[{value:'',label:'All types'}, ...VEHICLE_TYPES.map(t => ({value:t, label:`${TYPE_ICON[t]} ${t}`}))]}
          placeholder="All types" className="w-40" />
        <BopSelect value={statusFilter} onChange={setStatusFilter}
          options={[{value:'',label:'All status'}, ...STATUSES.map(s => ({value:s, label:s}))]}
          placeholder="All status" className="w-36" />
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm ${view==='list' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>≡ List</button>
          <button onClick={() => setView('grid')} className={`px-3 py-1.5 text-sm ${view==='grid' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>⊞ Grid</button>
        </div>
        <span className="ml-auto text-xs text-slate-400">{assets.length} vehicles</span>
        <button onClick={openNew}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + Add Vehicle
        </button>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Year / KM</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Asking</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assets.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No vehicles yet — click <strong>+ Add Vehicle</strong> to add the first one
                  </td></tr>
                ) : assets.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(a)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{a.make} {a.model}</div>
                      {a.variant && <div className="text-xs text-slate-400">{a.variant}</div>}
                      {a.vin && <div className="font-mono text-[10px] text-slate-300">{a.vin}</div>}
                    </td>
                    <td className="px-4 py-3 text-lg">{TYPE_ICON[a.vehicle_type]}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{a.year}</div>
                      <div>{a.mileage ? a.mileage.toLocaleString('nl-NL') + ' km' : '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[a.status] ?? ''}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {a.cost_price ? `€${Number(a.cost_price).toLocaleString('nl-NL')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">
                      {a.asking_price ? `€${Number(a.asking_price).toLocaleString('nl-NL')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {a.mdm_business_partners?.company_name || a.mdm_business_partners?.name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* GRID VIEW */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {loading ? <div className="col-span-4 py-12 text-center text-sm text-slate-400">Loading…</div>
          : assets.length === 0 ? <div className="col-span-4 py-12 text-center text-sm text-slate-400">No vehicles yet</div>
          : assets.map(a => (
            <div key={a.id} onClick={() => openEdit(a)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-2xl">{TYPE_ICON[a.vehicle_type]}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[a.status] ?? ''}`}>{a.status}</span>
              </div>
              <p className="font-bold text-slate-800">{a.make} {a.model}</p>
              <p className="text-xs text-slate-400">{a.year} · {a.mileage ? a.mileage.toLocaleString('nl-NL') + ' km' : '—'}</p>
              <p className="mt-2 text-sm font-semibold text-blue-600">
                {a.asking_price ? `€${Number(a.asking_price).toLocaleString('nl-NL')}` : 'No price'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editing ? `${editing.make} ${editing.model}` : 'Add Vehicle'}</h2>
                <p className="text-xs text-slate-400">AS002 — Vehicle 360</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Lifecycle stepper */}
              {editing && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Lifecycle Status</p>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {LIFECYCLE.map((s, i) => {
                      const currentIdx = LIFECYCLE.indexOf(form.status);
                      const done = i < currentIdx;
                      const active = i === currentIdx;
                      return (
                        <button key={s} onClick={() => f('status', s)}
                          className={`flex-shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold transition-all ${
                            active ? STATUS_COLOR[s] + ' ring-2 ring-offset-1 ring-current' :
                            done ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-300'
                          }`}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vehicle identity */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehicle</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
                    <select value={form.vehicle_type} onChange={e => f('vehicle_type', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                    <select value={form.status} onChange={e => f('status', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Make *</label>
                    <input value={form.make} onChange={e => f('make', e.target.value)}
                      placeholder="e.g. Volkswagen"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Model *</label>
                    <input value={form.model} onChange={e => f('model', e.target.value)}
                      placeholder="e.g. Transporter"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Variant / Trim</label>
                    <input value={form.variant} onChange={e => f('variant', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
                    <input type="number" value={form.year} onChange={e => f('year', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Mileage (km)</label>
                    <input type="number" value={form.mileage} onChange={e => f('mileage', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                    <input value={form.color} onChange={e => f('color', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fuel Type</label>
                    <select value={form.fuel_type} onChange={e => f('fuel_type', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Transmission</label>
                    <select value={form.transmission} onChange={e => f('transmission', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Power (kW)</label>
                    <input type="number" value={form.power_kw} onChange={e => f('power_kw', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Engine (cc)</label>
                    <input type="number" value={form.engine_cc} onChange={e => f('engine_cc', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">VIN</label>
                    <input value={form.vin} onChange={e => f('vin', e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pricing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cost Price (€)</label>
                    <input type="number" value={form.cost_price} onChange={e => f('cost_price', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Asking Price (€)</label>
                    <input type="number" value={form.asking_price} onChange={e => f('asking_price', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  {form.cost_price && form.asking_price && (
                    <div className="col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                      <span className="text-slate-500">Margin: </span>
                      <span className="font-bold text-emerald-700">
                        €{(parseFloat(form.asking_price) - parseFloat(form.cost_price)).toLocaleString('nl-NL')}
                        {' '}({Math.round(((parseFloat(form.asking_price) - parseFloat(form.cost_price)) / parseFloat(form.cost_price)) * 100)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier & location */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source & Location</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Supplier / From Partner</label>
                    <select value={form.partner_id} onChange={e => f('partner_id', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      <option value="">— No partner —</option>
                      {partners.map(p => (
                        <option key={p.id} value={p.id}>{p.company_name || p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
                    <input value={form.location} onChange={e => f('location', e.target.value)}
                      placeholder="e.g. Lot A, Amsterdam"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void save(); }} disabled={saving || !form.make || !form.model}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add to Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
