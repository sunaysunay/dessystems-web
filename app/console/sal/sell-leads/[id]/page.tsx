'use client';
// SA014 — Sell Lead Detail: vehicle card + RDW facts, photo gallery (signed
// URLs), seller contact, five answers, valuation/offer, status machine,
// timeline. "Send offer" emails template C and moves the lead to offer_sent.
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const TRANSITIONS: Record<string, string[]> = {
  new:        ['reviewing', 'declined_by_us', 'expired', 'lost'],
  reviewing:  ['offer_sent', 'declined_by_us', 'expired', 'lost'],
  offer_sent: ['negotiating', 'accepted', 'rejected_by_seller', 'expired', 'lost'],
  negotiating:['accepted', 'rejected_by_seller', 'declined_by_us', 'expired', 'lost'],
  accepted:   ['purchased', 'lost'],
  purchased: [], declined_by_us: [], rejected_by_seller: [], expired: [], lost: [],
};

export default function SellLeadDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Next <15 passes params as a plain object; use() only accepts promises
  const resolved: any = typeof (params as any)?.then === 'function' ? use(params as any) : params;
  const id: string = resolved.id;
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [valLow, setValLow] = useState(''); const [valHigh, setValHigh] = useState('');
  const [offer, setOffer] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/bop/sal/sell-leads/${id}`);
    const j = await res.json();
    if (j.lead) {
      setLead(j.lead); setImages(j.images ?? []); setEvents(j.events ?? []);
      setValLow(j.lead.valuation_low_eur ?? ''); setValHigh(j.lead.valuation_high_eur ?? '');
      setOffer(j.lead.our_offer_eur ?? '');
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function patch(body: any) {
    setBusy(true); setMsg('');
    const res = await fetch(`/api/bop/sal/sell-leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) setMsg(j.error ?? 'failed');
    else { setMsg('Saved.'); await load(); }
    setBusy(false);
  }

  if (!lead) return <div className="p-6 text-slate-400 text-sm">Loading…</div>;

  const card = 'rounded-xl border border-slate-200 bg-white p-5';
  const label = 'block text-[10px] uppercase tracking-wider text-slate-400 font-semibold';
  const input = 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:border-orange-400';
  const btn = 'rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40';

  const q = (l: string, v: any) => (
    <div className="flex justify-between border-b border-slate-50 py-1.5 text-[12px]">
      <span className="text-slate-400">{l}</span><span className="font-medium text-slate-700">{v ?? '—'}</span>
    </div>
  );

  return (
    <div className="p-6">
      <ScreenHeader title={`Sell Lead ${lead.ref}`} description={`${lead.make ?? ''} ${lead.model ?? ''} · ${lead.status}`} />
      <button onClick={() => router.push('/console/sal/sell-leads')} className="mt-2 text-[12px] text-slate-400 hover:text-slate-600">← Back to list</button>
      {msg && <div className={`mt-3 rounded-lg px-4 py-2 text-[12px] ${msg === 'Saved.' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{msg}</div>}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* vehicle + questions */}
        <div className="space-y-4">
          <div className={card}>
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Vehicle</h3>
            {q('Make / model', `${lead.make ?? '—'} ${lead.model ?? ''}`)}
            {q('Year', lead.build_year)}
            {q('Plate', lead.license_plate)}
            {q('Type', lead.vehicle_type?.replace('_', ' '))}
            {q('Category code', lead.category_code)}
            {q('Fuel', lead.fuel)}
            {q('APK expiry', lead.apk_expiry)}
            {q('GVW', lead.gvw_kg ? `${lead.gvw_kg} kg` : null)}
            {q('Entry', lead.manual_entry ? 'manual' : 'RDW lookup')}
          </div>
          <div className={card}>
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Five questions</h3>
            {q('Mileage', lead.mileage_km ? `${Number(lead.mileage_km).toLocaleString('nl-NL')} km` : null)}
            {q('Condition', lead.condition)}
            {q('Damage', lead.has_damage ? (lead.damage_description || 'yes') : 'no')}
            {q('BTW status', lead.btw_status)}
            {q('Finance/lease', lead.finance_outstanding === null ? null : lead.finance_outstanding ? 'YES' : 'no')}
          </div>
          <div className={card}>
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Seller</h3>
            {q('Name', lead.seller_name)}
            {q('Type', lead.seller_type)}
            {lead.company_name && q('Company', `${lead.company_name} ${lead.company_vat ? `(${lead.company_vat})` : ''}`)}
            {q('Asking price', lead.asking_price_eur ? `€${Number(lead.asking_price_eur).toLocaleString('nl-NL')}` : null)}
            {q('Locale / source', `${lead.locale} / ${lead.source}`)}
            <div className="mt-3 flex gap-2">
              <a href={`tel:${lead.seller_phone}`} className={`${btn} bg-orange-500 text-white hover:bg-orange-600`}>Call</a>
              <a href={`https://wa.me/${String(lead.seller_phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className={`${btn} bg-emerald-500 text-white hover:bg-emerald-600`}>WhatsApp</a>
              <a href={`mailto:${lead.seller_email}`} className={`${btn} bg-slate-600 text-white hover:bg-slate-700`}>Email</a>
            </div>
          </div>
        </div>

        {/* photos + valuation/offer */}
        <div className="space-y-4">
          <div className={card}>
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Photos ({images.length})</h3>
            {images.length === 0 ? <p className="text-[12px] text-slate-400">No photos uploaded.</p> : (
              <div className="grid grid-cols-3 gap-2">
                {images.map(img => img.url && (
                  <button key={img.id} onClick={() => setLightbox(img.url)} className="relative aspect-square overflow-hidden rounded-lg border border-slate-100">
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={card}>
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Valuation & offer</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Valuation low (€)</label>
                <input value={valLow} onChange={e => setValLow(e.target.value.replace(/[^\d.]/g, ''))} className={input} /></div>
              <div><label className={label}>Valuation high (€)</label>
                <input value={valHigh} onChange={e => setValHigh(e.target.value.replace(/[^\d.]/g, ''))} className={input} /></div>
              <div className="col-span-2"><label className={label}>Our offer (€)</label>
                <input value={offer} onChange={e => setOffer(e.target.value.replace(/[^\d.]/g, ''))} className={input} /></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button disabled={busy} onClick={() => { void patch({ valuation_low_eur: valLow || null, valuation_high_eur: valHigh || null, our_offer_eur: offer || null }); }}
                className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`}>Save</button>
              <button disabled={busy || !offer} onClick={() => { if (confirm(`Send offer of €${Number(offer).toLocaleString('nl-NL')} to ${lead.seller_email}?`)) void patch({ action: 'send_offer', our_offer_eur: offer }); }}
                className={`${btn} bg-orange-500 text-white hover:bg-orange-600`}>Send offer email</button>
            </div>
          </div>
          <div className={card}>
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Status — {lead.status}</h3>
            <div className="flex flex-wrap gap-2">
              {(TRANSITIONS[lead.status] ?? []).map(s => (
                <button key={s} disabled={busy} onClick={() => { void patch({ status: s }); }}
                  className={`${btn} border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600`}>
                  → {s.replace(/_/g, ' ')}
                </button>
              ))}
              {(TRANSITIONS[lead.status] ?? []).length === 0 && <span className="text-[12px] text-slate-400">Final state.</span>}
            </div>
          </div>
        </div>

        {/* notes + timeline */}
        <div className="space-y-4">
          <div className={card}>
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Internal notes</h3>
            {lead.internal_notes && <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 max-h-48 overflow-y-auto">{lead.internal_notes}</pre>}
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add note…" className={`${input} resize-none`} />
            <button disabled={busy || !note.trim()} onClick={() => { void patch({ appendNote: note }); setNote(''); }}
              className={`${btn} mt-2 bg-slate-100 text-slate-700 hover:bg-slate-200`}>Append note</button>
          </div>
          <div className={card}>
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Timeline</h3>
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {events.map(ev => (
                <div key={ev.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="font-semibold uppercase">{ev.event.replace(/_/g, ' ')}</span>
                    <span>{new Date(ev.created_at).toLocaleString('nl-NL')}</span>
                  </div>
                  {ev.payload && <div className="mt-0.5 text-[11px] text-slate-600">{JSON.stringify(ev.payload)}</div>}
                  <div className="text-[10px] text-slate-400">{ev.actor}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-6" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
