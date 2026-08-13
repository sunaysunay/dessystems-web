'use client';
import { useState, useEffect , useCallback} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '@/lib/comm/resolve-locale';

const ROLE_COLOR: Record<string,string> = {
  customer:'bg-blue-100 text-blue-700',supplier:'bg-emerald-100 text-emerald-700',
  dealer:'bg-violet-100 text-violet-700',broker:'bg-amber-100 text-amber-700',
  transport:'bg-cyan-100 text-cyan-700',insurer:'bg-rose-100 text-rose-700',
  inspection:'bg-orange-100 text-orange-700',other:'bg-slate-100 text-slate-500',
};
const STATUS_COLOR: Record<string,string> = {
  active:'bg-emerald-100 text-emerald-700',inactive:'bg-slate-100 text-slate-500',blocked:'bg-red-100 text-red-700',
};
const TABS = ['overview','leads','invoices','activity'] as const;

export default function MD002Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]>('overview');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/crm/customer/${id}`).then(r => r.json());
    setPartner(j.partner); setLeads(j.leads ?? []); setInvoices(j.invoices ?? []); setActivities(j.activities ?? []);
    setForm(j.partner ?? {});
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true);
    const { mdm_partner_roles, ...rest } = form;
    await fetch(`/api/bop/md/partners/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...rest, roles: mdm_partner_roles?.map((r: any) => r.role_type) ?? [] }),
    });
    showToast('Saved'); setSaving(false); void load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!partner) return <div className="p-8 text-slate-400">Partner not found. <button onClick={() => router.back()} className="text-blue-600 underline">Back</button></div>;

  const totalAR = invoices.filter(i => i.type === 'AR').reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
  const totalAP = invoices.filter(i => i.type === 'AP').reduce((s: number, i: any) => s + (i.amount ?? 0), 0);

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title={partner.company_name || partner.name} description={`MD002 — Business Partner Detail · ${partner.country ?? ''}`} />

      <div className="mb-5 grid grid-cols-4 gap-3">
        {[{label:'Leads',value:leads.length,cls:'text-blue-600'},{label:'Invoices',value:invoices.length,cls:'text-slate-700'},{label:'AR Total',value:`€${totalAR.toLocaleString()}`,cls:'text-emerald-600'},{label:'AP Total',value:`€${totalAP.toLocaleString()}`,cls:'text-amber-600'}].map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.cls}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab===t?'border-blue-600 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identity</p>
            <div className="grid grid-cols-2 gap-3">
              {([['Full Name','name'],['Company','company_name'],['Email','email'],['Phone','phone'],['Mobile','mobile'],['Website','website']] as [string,string][]).map(([lbl,key]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{lbl}</label>
                  <input value={form[key]??''} onChange={e=>f(key,e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"/>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(partner.mdm_partner_roles??[]).map((r:any) => (
                <span key={r.role_type} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLOR[r.role_type]??'bg-slate-100 text-slate-500'}`}>{r.role_type}</span>
              ))}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[partner.status]??''}`}>{partner.status}</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Business & Address</p>
            <div className="grid grid-cols-2 gap-3">
              {([['VAT Number','vat_number'],['KvK / CoC','coc_number'],['IBAN','iban'],['Address','address'],['City','city'],['Postal Code','postal_code'],['Country','country']] as [string,string][]).map(([lbl,key]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-500 mb-1">{lbl}</label>
                  <input value={form[key]??''} onChange={e=>f(key,e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"/>
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Preferred Language</label>
                <select value={form.preferred_locale??''} onChange={e=>f('preferred_locale',e.target.value||null)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white">
                  <option value="">Auto (from country)</option>
                  {SUPPORTED_LOCALES.map(loc => (
                    <option key={loc} value={loc}>{LOCALE_LABELS[loc]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Notes</label>
              <textarea value={form.notes??''} onChange={e=>f('notes',e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"/>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={()=>router.back()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Back</button>
              <button onClick={() => { void save(); }} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving?'Saving...':'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr><th className="px-4 py-3 text-left">Lead</th><th className="px-4 py-3 text-left">Vehicle</th><th className="px-4 py-3 text-left">Stage</th><th className="px-4 py-3 text-left">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.length===0?(<tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No leads</td></tr>):leads.map((l:any) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{l.title}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{l.ast_assets?`${l.ast_assets.make} ${l.ast_assets.model} ${l.ast_assets.year}`:'—'}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{l.stage}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr><th className="px-4 py-3 text-left">Invoice #</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.length===0?(<tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No invoices</td></tr>):invoices.map((inv:any) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{inv.invoice_number}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${inv.type==='AR'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{inv.type}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">€{(inv.amount??0).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{inv.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-2">
          {activities.length===0 && <p className="text-center text-sm text-slate-400 py-8">No activities recorded</p>}
          {activities.map((a:any) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex gap-3">
              <span className="text-lg">{({'call':'📞','email':'✉️','whatsapp':'💬','visit':'🏢','note':'📝','task':'✅'} as any)[a.type]??'📌'}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 capitalize">{a.type}</span>
                  <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                {a.note && <p className="text-sm text-slate-600 mt-0.5">{a.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
