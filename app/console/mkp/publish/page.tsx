'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const CHANNELS = ['website','marktplaats','autoscout24','mobile.de','facebook','andere'];
const STEPS = ['Select Vehicle','Configure Listing','Publish'];

export default function MP003Page() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [form, setForm] = useState({ title:'', description:'', price:'', channel:'website', status:'active' });
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function f(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  useEffect(() => {
    void fetch('/api/bop/ast/assets?limit=200&status=published').then(r => r.json()).then(j => {
      setAssets(j.assets ?? []);
      setLoading(false);
    });
  }, []);

  function selectAsset(a: any) {
    setSelectedAsset(a);
    setForm(p => ({
      ...p,
      title: `${a.make} ${a.model} ${a.year}`.trim(),
      price: a.asking_price ?? '',
    }));
    setStep(1);
  }

  async function publish() {
    if (!selectedAsset) return;
    setSaving(true);
    const res = await fetch('/api/bop/mkp/listings', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, asset_id: selectedAsset.id, price: parseFloat(form.price||'0') }),
    });
    const j = await res.json();
    if (j.error) { showToast('Error: ' + j.error); setSaving(false); return; }
    showToast('Published!'); setSaving(false); setStep(2);
  }

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Channel Publisher" description="MP003 — Publish a vehicle to marketplace channels"/>

      <div className="mb-6 flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{i+1}</div>
            <span className={`ml-2 text-sm font-medium ${i <= step ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`mx-4 h-px w-12 ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`}/>}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">Select a vehicle to publish</div>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {assets.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">No published vehicles available</div>
              ) : assets.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer" onClick={() => selectAsset(a)}>
                  <div>
                    <div className="font-semibold text-slate-800">{a.make} {a.model} {a.year}</div>
                    <div className="text-xs text-slate-400">{a.vehicle_type} · {a.vin ?? '—'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.asking_price && <span className="font-semibold text-slate-700">€{Number(a.asking_price).toLocaleString()}</span>}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{a.status}</span>
                    <span className="text-blue-600 text-sm">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && selectedAsset && (
        <div className="max-w-2xl space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
            <span className="text-2xl">🚐</span>
            <div>
              <div className="font-semibold text-slate-800">{selectedAsset.make} {selectedAsset.model} {selectedAsset.year}</div>
              <div className="text-xs text-slate-400">{selectedAsset.vin ?? '—'}</div>
            </div>
            <button onClick={() => setStep(0)} className="ml-auto text-xs text-blue-600 hover:underline">Change</button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Listing title</label>
              <input value={form.title} onChange={e => f('title', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={5}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Price (€)</label>
                <input type="number" value={form.price} onChange={e => f('price', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Channel</label>
                <select value={form.channel} onChange={e => f('channel', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none">
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(0)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Back</button>
              <button onClick={() => { void publish(); }} disabled={saving || !form.title}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Publishing...' : 'Publish listing →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Listing published!</h2>
          <p className="text-sm text-slate-500 mb-5">{form.title} is now live on {form.channel}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => router.push('/console/mkp/listings')} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-white">View all listings</button>
            <button onClick={() => { setStep(0); setSelectedAsset(null); setForm({title:'',description:'',price:'',channel:'website',status:'active'}); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Publish another</button>
          </div>
        </div>
      )}
    </div>
  );
}
