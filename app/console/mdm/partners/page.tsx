'use client';
import { useState, useEffect, useRef , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const ROLES = ['customer','supplier','dealer','broker','transport','insurer','inspection','other'] as const;

const ROLE_COLOR: Record<string, string> = {
  customer:   'bg-blue-100 text-blue-700',
  supplier:   'bg-emerald-100 text-emerald-700',
  dealer:     'bg-violet-100 text-violet-700',
  broker:     'bg-amber-100 text-amber-700',
  transport:  'bg-cyan-100 text-cyan-700',
  insurer:    'bg-rose-100 text-rose-700',
  inspection: 'bg-orange-100 text-orange-700',
  other:      'bg-slate-100 text-slate-500',
};

const STATUS_COLOR: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  blocked:  'bg-red-100 text-red-700',
};

const EMPTY = {
  name: '', company_name: '', email: '', phone: '', mobile: '',
  country: 'NL', city: '', address: '', postal_code: '',
  vat_number: '', coc_number: '', iban: '', website: '', notes: '',
  status: 'active', roles: ['customer'] as string[],
};

export default function MD001Page() {
  const { unit } = useScope();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const searchRef = useRef<any>(null);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);
    const j = await fetch(`/api/bop/md/partners?${params}`).then(r => r.json());
    setPartners(j.partners ?? []);
    setLoading(false);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, tenant_id: unit.id });
    setDrawerOpen(true);
  }

  function openEdit(p: any) {
    setEditing(p);
    setForm({
      ...p,
      roles: p.mdm_partner_roles?.map((r: any) => r.role_type) ?? [],
    });
    setDrawerOpen(true);
  }

  function toggleRole(r: string) {
    setForm((f: any) => {
      const has = f.roles.includes(r);
      return { ...f, roles: has ? f.roles.filter((x: string) => x !== r) : [...f.roles, r] };
    });
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, tenant_id: unit.id };
    if (editing) {
      await fetch(`/api/bop/md/partners/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showToast('Partner updated');
    } else {
      await fetch('/api/bop/md/partners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      showToast('Partner created');
    }
    setSaving(false);
    setDrawerOpen(false);
    void load();
  }

  async function archive(p: any) {
    await fetch(`/api/bop/md/partners/${p.id}`, { method: 'DELETE' });
    showToast('Partner archived');
    void load();
  }


  return (
    <div>
      <ScreenHeader title="Business Partners" description="Unified partner registry — customers, suppliers, dealers, brokers and more" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, company, email…"
          className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
        <BopSelect value={roleFilter} onChange={setRoleFilter}
          options={[{value:'',label:'All roles'}, ...ROLES.map(r => ({value:r, label:r.charAt(0).toUpperCase()+r.slice(1)}))]}
          placeholder="All roles" className="w-36" />
        <BopSelect value={statusFilter} onChange={setStatusFilter}
          options={[{value:'',label:'All status'},{value:'active',label:'Active',color:'#10b981'},{value:'inactive',label:'Inactive',color:'#94a3b8'},{value:'blocked',label:'Blocked',color:'#ef4444'}]}
          placeholder="All status" className="w-36" />
        <span className="ml-auto text-xs text-slate-400">{partners.length} partners</span>
        <button onClick={openNew}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          + New Partner
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Partner</th>
                <th className="px-4 py-3 text-left">Roles</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Country</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {partners.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  No partners yet — click <strong>+ New Partner</strong> to add the first one
                </td></tr>
              ) : partners.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(p)}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{p.company_name || p.name}</div>
                    {p.company_name && <div className="text-xs text-slate-400">{p.name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.mdm_partner_roles ?? []).map((r: any) => (
                        <span key={r.role_type} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLOR[r.role_type] ?? 'bg-slate-100 text-slate-500'}`}>
                          {r.role_type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    <div>{p.email}</div>
                    <div>{p.phone || p.mobile}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.country}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[p.status] ?? ''}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { void archive(p); }}
                      className="text-xs text-slate-400 hover:text-red-500">Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-in Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Partner' : 'New Partner'}</h2>
                <p className="text-xs text-slate-400">MD002 — Business Partner Detail</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Roles */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Partner Roles</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => {
                    const active = form.roles.includes(r);
                    return (
                      <button key={r} onClick={() => toggleRole(r)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                          active ? ROLE_COLOR[r] + ' border-current' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}>
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Identity */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Identity</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                    <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
                    <input value={form.company_name} onChange={e => setForm((f: any) => ({ ...f, company_name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Mobile</label>
                    <input value={form.mobile} onChange={e => setForm((f: any) => ({ ...f, mobile: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                    <input value={form.website} onChange={e => setForm((f: any) => ({ ...f, website: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Address</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Street Address</label>
                    <input value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Postal Code</label>
                    <input value={form.postal_code} onChange={e => setForm((f: any) => ({ ...f, postal_code: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                    <input value={form.city} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                    <select value={form.country} onChange={e => setForm((f: any) => ({ ...f, country: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      {['NL','DE','BE','FR','GB','ES','IT','PL','DK','SE','NO','AT','CH','LU','PT','Other'].map(c =>
                        <option key={c} value={c}>{c}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Business */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Business Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">VAT Number</label>
                    <input value={form.vat_number} onChange={e => setForm((f: any) => ({ ...f, vat_number: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">KvK / CoC</label>
                    <input value={form.coc_number} onChange={e => setForm((f: any) => ({ ...f, coc_number: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">IBAN</label>
                    <input value={form.iban} onChange={e => setForm((f: any) => ({ ...f, iban: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => { void save(); }} disabled={saving || !form.name.trim()}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
