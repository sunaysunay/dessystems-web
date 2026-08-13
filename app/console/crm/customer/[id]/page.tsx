'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STAGE_COLOR: Record<string,string> = {
  new:'bg-slate-100 text-slate-600', contacted:'bg-blue-100 text-blue-700',
  qualified:'bg-cyan-100 text-cyan-700', proposal:'bg-amber-100 text-amber-700',
  negotiation:'bg-orange-100 text-orange-700', won:'bg-emerald-100 text-emerald-700', lost:'bg-red-100 text-red-600',
};
const INV_COLOR: Record<string,string> = {
  paid:'bg-emerald-100 text-emerald-700', pending:'bg-amber-100 text-amber-700',
  overdue:'bg-red-100 text-red-600', draft:'bg-slate-100 text-slate-600',
};
const ACT_ICON: Record<string,string> = { call:'📞', email:'✉️', whatsapp:'💬', visit:'🏢', note:'📝', task:'✅' };

function Stat({ label, value, sub }: { label: string; value: string|number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CR003DetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'leads'|'invoices'|'cases'|'activity'>('leads');
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    void fetch('/api/bop/crm/customer/' + id).then(r => r.json()).then(j => { setData(j); setLoading(false); });
  }, [id]);

  const partnerId = data?.partner?.id;
  useEffect(() => {
    if (partnerId) {
      void fetch(`/api/bop/sal/cases?partner_id=${partnerId}`).then(r => r.json()).then(j => {
        setCases(j.cases ?? []);
      });
    }
  }, [partnerId]);

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!data?.partner) return <div className="p-8 text-slate-400">Customer not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const { partner, leads = [], invoices = [], activities = [] } = data;

  const totalRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount||0), 0);
  const wonLeads = leads.filter((l: any) => l.stage === 'won').length;

  return (
    <div>
      <ScreenHeader title={partner.company_name||partner.name||'Customer'} description="CR003 — Customer 360 View"/>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => router.push('/console/crm/customer')} className="text-xs text-slate-400 hover:text-slate-600">Back to Customers</button>
        <span className="text-xs text-slate-400">|</span>
        <span className="text-xs text-slate-500">{partner.email}</span>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="Total Revenue" value={'€' + totalRevenue.toLocaleString()} sub={invoices.filter((i:any)=>i.status==='paid').length + ' paid invoices'}/>
        <Stat label="Leads" value={leads.length} sub={wonLeads + ' won'}/>
        <Stat label="Open Invoices" value={invoices.filter((i:any)=>i.status==='pending'||i.status==='overdue').length}/>
        <Stat label="Activities" value={activities.length} sub="all time"/>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex border-b border-slate-100">
              {(['leads','invoices','cases','activity'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={'px-5 py-3 text-sm font-medium capitalize ' + (tab===t?'border-b-2 border-blue-600 text-blue-700':'text-slate-500 hover:text-slate-700')}>
                  {t === 'leads' ? 'Leads (' + leads.length + ')' : t === 'invoices' ? 'Invoices (' + invoices.length + ')' : t === 'cases' ? 'Cases (' + cases.length + ')' : 'Activity (' + activities.length + ')'}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === 'leads' && (
                <div className="space-y-2">
                  {leads.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No leads</p> : leads.map((l: any) => (
                    <div key={l.id} onClick={() => router.push('/console/crm/leads/' + l.id)}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (STAGE_COLOR[l.stage]??'bg-slate-100 text-slate-500')}>{l.stage}</span>
                      <span className="flex-1 text-sm font-medium text-slate-700">{l.title||'—'}</span>
                      {l.ast_assets && <span className="text-xs text-slate-400">{l.ast_assets.make} {l.ast_assets.model} {l.ast_assets.year}</span>}
                      <span className="text-[10px] text-slate-400">{new Date(l.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'invoices' && (
                <div className="space-y-2">
                  {invoices.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No invoices</p> : invoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                      <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (INV_COLOR[inv.status]??'bg-slate-100 text-slate-500')}>{inv.status}</span>
                      <span className="flex-1 text-sm font-medium text-slate-700">{inv.invoice_number||inv.id.slice(0,8)}</span>
                      <span className="text-xs font-semibold text-slate-700">{'€' + Number(inv.amount||0).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'cases' && (
                <div className="space-y-2">
                  {cases.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No cases</p> : cases.map((c: any) => (
                    <div key={c.id} onClick={() => router.push('/console/sal/cases/' + c.id)}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{c.derived_stage}</span>
                      <span className="flex-1 text-sm font-medium font-mono text-slate-700">{c.case_number}</span>
                      <span className="text-xs text-slate-400">{(c.business_line ?? '').replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-400">{c.created_at?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'activity' && (
                <div className="space-y-2">
                  {activities.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No activity</p> : activities.slice(0,30).map((a: any) => (
                    <div key={a.id} className="flex gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                      <span className="text-base">{ACT_ICON[a.type]??'📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600 capitalize">{a.type}</span>
                          <span className="ml-auto text-[10px] text-slate-400">{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                        {a.note && <p className="text-xs text-slate-500 mt-0.5">{a.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-sm h-fit">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Profile</p>
          {([['Company', partner.company_name||'—'],['Name', partner.name||'—'],['Email', partner.email||'—'],
            ['Phone', partner.phone||'—'],['Type', partner.partner_type||'—'],['Country', partner.country||'—'],
            ['VAT', partner.vat_number||'—'],['Since', partner.created_at ? new Date(partner.created_at).toLocaleDateString() : '—'],
          ] as [string,string][]).map(([l,v]) => (
            <div key={l} className="flex justify-between gap-2">
              <span className="text-slate-400 flex-shrink-0">{l}</span>
              <span className="font-medium text-slate-700 text-right truncate">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
