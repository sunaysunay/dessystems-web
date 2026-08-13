'use client';
import { useState, useEffect , useCallback} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

const TYPES = ['live','online','sealed','hybrid'];
const STATUSES = ['draft','scheduled','live','ended','settled','cancelled'];
const lbl = 'mb-1 block text-xs font-semibold text-slate-500';
const inp = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500';

function toLocal(s: string | null) { return s ? new Date(s).toISOString().slice(0,16) : ''; }

export default function AU002Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [A, setA] = useState<any>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [pickList, setPickList] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pick, setPick] = useState('');
  const [reserve, setReserve] = useState('');
  const [startBid, setStartBid] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }
  function setField(k: string, v: any) { setA((p: any) => ({ ...p, [k]: v })); }

  const load = useCallback(async () => {
    setLoading(true);
    const j = await fetch(`/api/bop/mkp/auctions/${id}`).then(r => r.json());
    if (j.error) { showToast(j.error); setLoading(false); return; }
    setA(j.auction); setLots(j.lots ?? []); setLoading(false);
    // listings for this tenant to add as lots
    const lj = await fetch(`/api/bop/mkp/bop-listings?tenant=${j.auction.tenant_id}`).then(r => r.json());
    setPickList(lj.listings ?? []);
  }, [id]);
  useEffect(() => { void load();   }, [load]);

  async function saveHeader() {
    setSaving(true);
    const j = await fetch(`/api/bop/mkp/auctions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(A),
    }).then(r => r.json());
    setSaving(false);
    showToast(j.error ? '✗ ' + j.error : '✓ Saved');
  }

  async function addLot() {
    if (!pick) { showToast('Pick a listing'); return; }
    const j = await fetch(`/api/bop/mkp/auctions/${id}/lots`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: pick, reserve_price: reserve ? Number(reserve) : null, start_bid: startBid ? Number(startBid) : null }),
    }).then(r => r.json());
    if (j.error) { showToast('✗ ' + j.error); return; }
    setShowAdd(false); setPick(''); setReserve(''); setStartBid('');
    void load();
  }
  async function removeLot(lotId: string) {
    await fetch(`/api/bop/mkp/auctions/${id}/lots?lot_id=${lotId}`, { method: 'DELETE' });
    void load();
  }

  if (loading || !A) return <div className="p-6 text-slate-400">Loading…</div>;
  const usedIds = new Set(lots.map(l => l.listing_id));
  const available = pickList.filter(l => !usedIds.has(l.id));

  return (
    <div className="p-6">
      <button onClick={() => router.push('/console/mkp/auctions')} className="mb-2 text-sm text-blue-600 hover:underline">← Auctions</button>
      <ScreenHeader title={A.title} description={`${A.type} · ${A.status} · ${lots.length} lots`} />

      {/* Header editor */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><label className={lbl}>Title</label><input className={inp} value={A.title ?? ''} onChange={e => setField('title', e.target.value)} /></div>
          <div><label className={lbl}>Type</label><BopSelect size="md" value={A.type} onChange={v => setField('type', v)} options={TYPES.map(t => ({ value:t, label:t }))} /></div>
          <div><label className={lbl}>Status</label><BopSelect size="md" value={A.status} onChange={v => setField('status', v)} options={STATUSES.map(s => ({ value:s, label:s }))} /></div>
          <div><label className={lbl}>Starts</label><input type="datetime-local" className={inp} value={toLocal(A.starts_at)} onChange={e => setField('starts_at', e.target.value || null)} /></div>
          <div><label className={lbl}>Ends</label><input type="datetime-local" className={inp} value={toLocal(A.ends_at)} onChange={e => setField('ends_at', e.target.value || null)} /></div>
          <div><label className={lbl}>Location</label><input className={inp} value={A.location ?? ''} onChange={e => setField('location', e.target.value)} /></div>
          <div><label className={lbl}>Country</label><input className={inp} maxLength={2} value={A.country ?? ''} onChange={e => setField('country', e.target.value.toUpperCase())} /></div>
          <div><label className={lbl}>Buyer premium (%)</label><input type="number" className={inp} value={A.buyer_premium_pct ?? ''} onChange={e => setField('buyer_premium_pct', e.target.value ? Number(e.target.value) : 0)} /></div>
          <div><label className={lbl}>Livestream URL</label><input className={inp} value={A.livestream_url ?? ''} onChange={e => setField('livestream_url', e.target.value)} /></div>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => { void saveHeader(); }} disabled={saving} className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {/* Lots */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Lots ({lots.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/console/mkp/auctions/${id}/bidding`)} className="rounded-lg border border-amber-300 px-4 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-50">Bidding Console →</button>
          <button onClick={() => setShowAdd(true)} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">+ Add lot</button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Lot</th><th className="px-3 py-3">Listing</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">DES</th><th className="px-3 py-3">Reserve</th><th className="px-3 py-3">Start bid</th><th className="px-3 py-3">Status</th><th className="px-3 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lots.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No lots yet. Add listings as lots.</td></tr>
            ) : lots.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-semibold text-slate-700">#{l.lot_number}</td>
                <td className="px-3 py-3 text-slate-700">{l.listing_label}</td>
                <td className="px-3 py-3 capitalize text-slate-500">{l.listing_category ?? '—'}</td>
                <td className="px-3 py-3">{l.listing_score !== null ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">{l.listing_score}</span> : '—'}</td>
                <td className="px-3 py-3 text-slate-600">{l.reserve_price ? `€${l.reserve_price}` : '—'}</td>
                <td className="px-3 py-3 text-slate-600">{l.start_bid ? `€${l.start_bid}` : '—'}</td>
                <td className="px-3 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500">{l.status}</span></td>
                <td className="px-3 py-3 text-right"><button onClick={() => { void removeLot(l.id); }} className="text-red-400 hover:text-red-600">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-900">Add lot</h2>
            <div className="space-y-4">
              <div><label className={lbl}>Listing</label>
                <BopSelect size="md" value={pick} onChange={setPick}
                  options={available.length ? available.map(l => ({ value:l.id, label:`${l.title || l.brand_name || l.category}${l.year ? ' · '+l.year : ''}` })) : [{ value:'', label:'No available listings' }]} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Reserve €</label><input type="number" className={inp} value={reserve} onChange={e => setReserve(e.target.value)} /></div>
                <div><label className={lbl}>Start bid €</label><input type="number" className={inp} value={startBid} onChange={e => setStartBid(e.target.value)} /></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void addLot(); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add lot</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
