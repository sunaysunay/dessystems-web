'use client';
import { useState, useEffect , useCallback} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string,string> = {
  purchased:'bg-blue-100 text-blue-700', inspection:'bg-amber-100 text-amber-700',
  preparation:'bg-orange-100 text-orange-700', published:'bg-cyan-100 text-cyan-700',
  reserved:'bg-violet-100 text-violet-700', sold:'bg-emerald-100 text-emerald-700',
  delivered:'bg-slate-100 text-slate-500',
};
const STATUSES = ['purchased','inspection','preparation','published','reserved','sold','delivered'];
const TABS = ['Overview','Costs','Lifecycle'];

export default function AS002Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [edit, setEdit] = useState<any>({});
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/ast/assets/${id}`).then(r => r.json());
    setAsset(j.asset ?? null);
    setEdit(j.asset ?? {});
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true);
    const fields = ['make','model','year','vin','vehicle_type','status','asking_price','cost_price','mileage','fuel_type','transmission','color','notes'];
    const body: any = {};
    fields.forEach(f => { if (edit[f] !== undefined) body[f] = edit[f]; });
    await fetch(`/api/bop/ast/assets/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    showToast('Saved'); setSaving(false); void load();
  }

  async function moveStatus(status: string) {
    await fetch(`/api/bop/ast/assets/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
    showToast('Status updated'); void load();
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading...</div>;
  if (!asset) return <div className="p-8 text-slate-400">Asset not found. <button onClick={() => router.back()} className="text-blue-600 underline">Go back</button></div>;

  const costs = asset.ast_cost_items ?? [];
  const events = asset.ast_lifecycle_events ?? [];
  const totalCosts = costs.reduce((s: number, c: any) => s + (c.amount ?? 0), 0);
  const margin = asset.asking_price && totalCosts ? asset.asking_price - totalCosts : null;

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title={`${asset.make ?? ''} ${asset.model ?? ''} ${asset.year ?? ''}`.trim() || 'Asset Detail'} description={`AS002 — Vehicle 360 · ${asset.vin ?? id.slice(0,8)}`}/>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[asset.status]??'bg-slate-100 text-slate-500'}`}>{asset.status}</span>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.filter(s => s !== asset.status).map(s => (
            <button key={s} onClick={() => { void moveStatus(s); }}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
              → {s}
            </button>
          ))}
        </div>
        <button onClick={() => router.back()} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Back</button>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {[
          {label:'Asking price', value: asset.asking_price ? `€${Number(asset.asking_price).toLocaleString()}` : '—', cls:'text-slate-800'},
          {label:'Total costs',  value: `€${totalCosts.toLocaleString()}`, cls:'text-slate-700'},
          {label:'Margin',       value: margin !== null ? `€${margin.toLocaleString()}` : '—', cls: margin !== null && margin >= 0 ? 'text-emerald-600':'text-red-600'},
          {label:'Mileage',      value: asset.mileage ? `${Number(asset.mileage).toLocaleString()} km` : '—', cls:'text-slate-700'},
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.cls}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab===t?'bg-slate-800 text-white':'text-slate-500 hover:bg-slate-100'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-3 gap-4">
            {([
              ['Make','make','text'],['Model','model','text'],['Year','year','number'],
              ['VIN','vin','text'],['Type','vehicle_type','text'],['Color','color','text'],
              ['Fuel','fuel_type','text'],['Transmission','transmission','text'],['Mileage','mileage','number'],
              ['Asking price','asking_price','number'],['Cost price','cost_price','number'],
            ] as [string,string,string][]).map(([lbl,key,type]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-400 mb-1">{lbl}</label>
                <input type={type} value={edit[key]??''} onChange={e => setEdit((p:any) => ({...p,[key]:e.target.value}))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
            <textarea value={edit.notes??''} onChange={e => setEdit((p:any) => ({...p,notes:e.target.value}))} rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
          </div>
          {asset.mdm_business_partners && (
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Owner · </span>
              <span className="font-medium text-slate-800">{asset.mdm_business_partners.company_name || asset.mdm_business_partners.name}</span>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <button onClick={() => { void save(); }} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving?'Saving...':'Save changes'}</button>
          </div>
        </div>
      )}

      {tab === 'Costs' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-left">Note</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {costs.length===0?(<tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No costs recorded</td></tr>):costs.map((c:any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 capitalize font-medium text-slate-700">{c.category}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.note||'—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">€{(c.amount??0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.date ? new Date(c.date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {costs.length > 0 && (
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={2} className="px-4 py-3 text-slate-600">Total</td>
                  <td className="px-4 py-3 text-right text-slate-800">€{totalCosts.toLocaleString()}</td>
                  <td/>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Lifecycle' && (
        <div className="space-y-2">
          {events.length===0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">No lifecycle events recorded</div>
          ) : events.map((e:any) => (
            <div key={e.id} className="flex gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-400 w-24 flex-shrink-0 pt-0.5">{new Date(e.created_at).toLocaleDateString()}</div>
              <div>
                <span className="font-semibold text-slate-700 capitalize">{e.event_type ?? e.type}</span>
                {e.note && <p className="text-xs text-slate-400 mt-0.5">{e.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
