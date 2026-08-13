'use client';
import { useState, useEffect , useCallback} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

function eur(v: any) { return v === null ? '—' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v)); }
function time(s: string) { return new Date(s).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

const LOT_COLOR: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-700', sold: 'bg-blue-100 text-blue-700',
  unsold: 'bg-amber-100 text-amber-700', closed: 'bg-slate-200 text-slate-500',
};

export default function AU004Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [auction, setAuction] = useState<any>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    const [a, bd] = await Promise.all([
      fetch(`/api/bop/mkp/auctions/${id}`).then(r => r.json()),
      fetch(`/api/bop/mkp/auctions/${id}/bids`).then(r => r.json()),
    ]);
    if (a.auction) { setAuction(a.auction); setLots(a.lots ?? []); }
    setBids(bd.bids ?? []);
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); const t = setInterval(() => { void load(); }, 8000); return () => clearInterval(t);   }, [load]);

  async function placeBid(lotId: string) {
    const amt = amounts[lotId];
    if (!amt) { showToast('Enter an amount'); return; }
    const j = await fetch(`/api/bop/mkp/auctions/${id}/bids`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: lotId, amount: Number(amt) }),
    }).then(r => r.json());
    if (j.error) { showToast('✗ ' + j.error); return; }
    setAmounts(a => ({ ...a, [lotId]: '' }));
    void load();
  }
  async function closeLot(lotId: string, action: 'close' | 'reopen') {
    const j = await fetch(`/api/bop/mkp/auctions/${id}/lots`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: lotId, action }),
    }).then(r => r.json());
    if (j.error) { showToast('✗ ' + j.error); return; }
    showToast(action === 'close' ? `Lot ${j.status}${j.winning_bid ? ' @ ' + eur(j.winning_bid) : ''}` : 'Lot reopened');
    void load();
  }

  if (loading || !auction) return <div className="p-6 text-slate-400">Loading…</div>;
  const bidsByLot = (lotId: string) => bids.filter(b => b.lot_id === lotId);

  return (
    <div className="p-6">
      <button onClick={() => router.push(`/console/mkp/auctions/${id}`)} className="mb-2 text-sm text-blue-600 hover:underline">← Auction detail</button>
      <ScreenHeader title={`Bidding — ${auction.title}`} description={`${lots.length} lots · live feed refreshes every 8s`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lots + bidding */}
        <div className="lg:col-span-2 space-y-3">
          {lots.length === 0 ? <p className="text-slate-400">No lots. Add lots on the auction detail screen.</p> :
            lots.map(l => {
              const closed = l.status === 'sold' || l.status === 'unsold' || l.status === 'closed';
              const reserveMet = l.reserve_price === null || (l.current_bid !== null && Number(l.current_bid) >= Number(l.reserve_price));
              return (
                <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">#{l.lot_number}</span>
                        <span className="font-medium text-slate-800">{l.listing_label}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${LOT_COLOR[l.status] ?? 'bg-slate-100 text-slate-500'}`}>{l.status}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Start {eur(l.start_bid)} · Reserve {l.reserve_price ? eur(l.reserve_price) : 'none'}
                        {l.reserve_price && <span className={reserveMet ? 'text-emerald-600' : 'text-amber-600'}> · {reserveMet ? 'reserve met' : 'below reserve'}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current bid</div>
                      <div className="text-xl font-bold text-slate-900">{eur(l.current_bid)}</div>
                    </div>
                  </div>

                  {!closed ? (
                    <div className="mt-3 flex items-center gap-2">
                      <input type="number" placeholder="Bid amount €" value={amounts[l.id] ?? ''}
                        onChange={e => setAmounts(a => ({ ...a, [l.id]: e.target.value }))}
                        className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                      <button onClick={() => { void placeBid(l.id); }}
                        className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700">Place bid</button>
                      <button onClick={() => { void closeLot(l.id, 'close'); }}
                        className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600">Close lot</button>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-slate-500">{l.status === 'sold' ? `Sold at ${eur(l.current_bid)}` : 'Not sold'}</span>
                      <button onClick={() => { void closeLot(l.id, 'reopen'); }} className="text-xs text-blue-600 hover:underline">Reopen</button>
                    </div>
                  )}

                  {bidsByLot(l.id).length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bid history</div>
                      <div className="space-y-0.5">
                        {bidsByLot(l.id).slice(0, 5).map(b => (
                          <div key={b.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">{time(b.placed_at)} · {b.bid_type}{b.is_winning ? ' · leading' : ''}</span>
                            <span className={`font-mono ${b.is_winning ? 'font-bold text-emerald-600' : 'text-slate-500'}`}>{eur(b.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Live feed */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-slate-800">Live bid feed</h3>
          {bids.length === 0 ? <p className="text-sm text-slate-400">No bids yet.</p> :
            <div className="space-y-1.5">
              {bids.slice(0, 25).map(b => {
                const lot = lots.find(l => l.id === b.lot_id);
                return (
                  <div key={b.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                    <span className="text-slate-500">#{lot?.lot_number ?? '?'} · {time(b.placed_at)}</span>
                    <span className="font-mono font-semibold text-slate-700">{eur(b.amount)}</span>
                  </div>
                );
              })}
            </div>}
        </div>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
