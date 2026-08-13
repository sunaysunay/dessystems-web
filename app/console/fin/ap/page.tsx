'use client';
import { useState, useEffect , useCallback} from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const STATUSES = ['draft','sent','partial','paid','overdue','cancelled'] as const;
const STATUS_COLOR: Record<string,string> = {
  draft:'bg-slate-100 text-slate-500', sent:'bg-blue-100 text-blue-700',
  partial:'bg-amber-100 text-amber-700', paid:'bg-emerald-100 text-emerald-700',
  overdue:'bg-red-100 text-red-600', cancelled:'bg-slate-100 text-slate-400',
};

export default function FI003Page() {
  const { unit } = useScope();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<any>({ partner_id:'', amount:'', vat_amount:'', due_date:'', reference:'', notes:'', status:'draft' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (partnerFilter) params.set('partner_id', partnerFilter);
    const [ij, pj] = await Promise.all([
      fetch(`/api/bop/fin/ap/invoices?${params}`).then(r => r.json()),
      fetch('/api/bop/md/partners?limit=200&role=supplier').then(r => r.json()),
    ]);
    setInvoices(ij.invoices ?? []);
    setPartners(pj.partners ?? []);
    setLoading(false);
  }, [statusFilter, partnerFilter]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form.partner_id || !form.amount) return;
    setSaving(true);
    await fetch('/api/bop/fin/ap/invoices', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, tenant_id: unit.id, amount: parseFloat(form.amount), vat_amount: parseFloat(form.vat_amount||'0') }),
    });
    showToast('AP invoice created'); setSaving(false); setDrawerOpen(false); void load();
  }

  const totalOpen = invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount ?? 0), 0);

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Supplier Invoices (AP)" description="FI003 — Accounts payable: supplier and vendor invoices"/>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {[
          {label:'Total invoices',value:invoices.length,cls:'text-slate-800'},
          {label:'Open / due',value:`€${totalOpen.toLocaleString()}`,cls:'text-red-600'},
          {label:'Paid',value:`€${totalPaid.toLocaleString()}`,cls:'text-emerald-600'},
          {label:'Overdue',value:invoices.filter(i=>i.status==='overdue').length,cls:'text-red-600'},
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.cls}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BopSelect value={statusFilter} onChange={setStatusFilter}
          options={[{value:'',label:'All status'},...STATUSES.map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))]}
          placeholder="All status" className="w-40"/>
        <BopSelect value={partnerFilter} onChange={setPartnerFilter}
          options={[{value:'',label:'All suppliers'},...partners.map(p=>({value:p.id,label:p.company_name||p.name}))]}
          placeholder="All suppliers" className="w-48"/>
        <span className="ml-auto text-xs text-slate-400">{invoices.length} invoices</span>
        <button onClick={() => setDrawerOpen(true)} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">+ New AP Invoice</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr><th className="px-4 py-3 text-left">Invoice #</th><th className="px-4 py-3 text-left">Supplier</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">VAT</th><th className="px-4 py-3 text-left">Due</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Reference</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.length===0?(<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No AP invoices yet — click + New AP Invoice</td></tr>):invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{inv.invoice_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.mdm_business_partners?.company_name||inv.mdm_business_partners?.name||'—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">€{(inv.amount??0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">€{(inv.vat_amount??0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{inv.due_date?new Date(inv.due_date).toLocaleDateString():'—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[inv.status]??''}`}>{inv.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{inv.reference||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)}/>
          <div className="relative z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">New AP Invoice</h2>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-slate-100">x</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Supplier *</label>
                <select value={form.partner_id} onChange={e => f('partner_id', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select supplier...</option>
                  {partners.map((p: any) => <option key={p.id} value={p.id}>{p.company_name||p.name}</option>)}
                </select>
              </div>
              {([['Amount (€) *','amount','number'],['VAT Amount (€)','vat_amount','number'],['Due Date','due_date','date'],['Reference / Invoice #','reference','text']] as [string,string,string][]).map(([lbl,key,type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{lbl}</label>
                  <input type={type} value={form[key]} onChange={e => f(key, e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button onClick={() => { void save(); }} disabled={saving||!form.partner_id||!form.amount} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving?'Saving...':'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
