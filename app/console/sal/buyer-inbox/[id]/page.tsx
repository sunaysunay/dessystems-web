'use client';
// SA015 detail — thread view: reply as DES, buyer contact card, close/block.
import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function BuyerThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params);
  const id: string = resolved.id;
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const j = await fetch(`/api/bop/sal/buyer-inbox/${id}`).then(r => r.json());
    if (j.conversation) setData(j);
    setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
  }, [id]);
  useEffect(() => { void load(); const iv = setInterval(() => { void load(); }, 20000); return () => clearInterval(iv); }, [load]);

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    await fetch(`/api/bop/sal/buyer-inbox/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text.trim() }),
    });
    setText(''); await load(); setBusy(false);
  }

  async function setStatus(status: string) {
    await fetch(`/api/bop/sal/buyer-inbox/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    void load();
  }

  if (!data) return <div className="p-6 text-sm text-slate-400">Loading…</div>;
  const { conversation: conv, messages, buyer } = data;
  const l = conv.bop_listings;

  return (
    <div className="p-6">
      <ScreenHeader title={`${l?.brand ?? ''} ${l?.model ?? ''} — ${buyer?.display_name ?? 'buyer'}`}
        description={`${l?.ref_no ?? ''} · €${Number(l?.price ?? 0).toLocaleString('nl-NL')} · ${conv.status}`} />
      <button onClick={() => router.push('/console/sal/buyer-inbox')} className="mt-2 text-[12px] text-slate-400 hover:text-slate-600">← Back to inbox</button>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex h-[600px] flex-col rounded-xl border border-slate-200 bg-white">
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.map((m: any) => (
              <div key={m.id} className={`flex ${m.sender === 'des' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-[13px] ${
                  m.sender === 'des' ? 'bg-orange-500 text-white' : m.flagged ? 'bg-red-50 border border-red-200 text-slate-800' : 'bg-slate-100 text-slate-800'}`}>
                  {m.kind === 'offer' && m.payload?.amount && (
                    <div className="mb-1 text-[11px] font-bold uppercase">OFFER €{Number(m.payload.amount).toLocaleString('nl-NL')}</div>
                  )}
                  {m.flagged && <div className="mb-1 text-[10px] font-bold text-red-500">⚠ FLAGGED (link/phone in first message)</div>}
                  {m.body}
                  <div className={`mt-1 text-[9px] ${m.sender === 'des' ? 'text-white/60' : 'text-slate-400'}`}>
                    {new Date(m.created_at).toLocaleString('nl-NL')}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void send(); }}
              placeholder="Reply as DESMOBIL…"
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] focus:outline-none focus:border-orange-400" />
            <button onClick={() => { void send(); }} disabled={busy || !text.trim()}
              className="rounded-lg bg-orange-500 px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
              Send
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Buyer</h3>
            {buyer?.account_type === 'business' && (
              <div className="mb-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${buyer?.dealer_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {buyer?.dealer_verified ? '✓ VERIFIED DEALER' : 'BUSINESS — UNVERIFIED'}
                </span>
              </div>
            )}
            {[['Name', buyer?.display_name], ['Email', buyer?.email], ['Phone', buyer?.phone],
              ['Type', buyer?.account_type], ['Company', buyer?.company_name], ['VAT/KVK', buyer?.company_vat]].map(([k, v]) => v && (
              <div key={k as string} className="flex justify-between border-b border-slate-50 py-1.5 text-[12px]">
                <span className="text-slate-400">{k}</span><span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
            <div className="mt-3 flex flex-wrap gap-2">
              {buyer?.phone && <a href={`https://wa.me/${String(buyer.phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"
                className="rounded-lg bg-emerald-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-emerald-600">WhatsApp</a>}
              {buyer?.email && <a href={`mailto:${buyer.email}`}
                className="rounded-lg bg-slate-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-slate-700">Email</a>}
              {buyer?.account_type === 'business' && (
                <button onClick={() => { void (async () => {
                  if (!confirm(buyer.dealer_verified ? 'Revoke dealer verification?' : 'Mark as verified dealer? Check KVK/VAT first.')) return;
                  await fetch(`/api/bop/sal/buyer-inbox/${id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dealerVerified: !buyer.dealer_verified }),
                  });
                  void load();
                })(); }}
                  className={`rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${buyer.dealer_verified ? 'border border-amber-300 text-amber-600 hover:bg-amber-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                  {buyer.dealer_verified ? 'Revoke verification' : 'Verify dealer'}
                </button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-[13px] font-bold text-slate-700 mb-2">Thread — {conv.status}</h3>
            <div className="flex flex-wrap gap-2">
              {conv.status !== 'closed' && <button onClick={() => { void setStatus('closed'); }} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-600 hover:border-orange-400">Close</button>}
              {conv.status !== 'blocked' && <button onClick={() => { if (confirm('Block this buyer thread?')) void setStatus('blocked'); }} className="rounded-lg border border-red-200 px-3 py-2 text-[12px] text-red-500 hover:bg-red-50">Block</button>}
              {conv.status !== 'open' && <button onClick={() => { void setStatus('open'); }} className="rounded-lg border border-emerald-200 px-3 py-2 text-[12px] text-emerald-600 hover:bg-emerald-50">Reopen</button>}
            </div>
          </div>
          {l?.slug && (
            <a href={`https://desmobil.com/${l.slug}`} target="_blank" rel="noreferrer"
              className="block rounded-xl border border-slate-200 bg-white p-5 text-[12px] font-semibold text-orange-600 hover:border-orange-300">
              View listing on desmobil.com →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
