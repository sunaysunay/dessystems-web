'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const CHANNELS = [
  { key: 'des',          label: 'DES Website' },
  { key: 'marktplaats',  label: 'Marktplaats' },
  { key: 'autoscout24',  label: 'AutoScout24' },
  { key: 'mobile_de',    label: 'Mobile.de' },
  { key: '2dehands',     label: '2dehands.be' },
  { key: 'facebook',     label: 'Facebook Marketplace' },
];
const STEPS = ['Select Vehicle', 'Configure & Publish', 'Done'];

export default function ChannelPublisherPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('listing_id') ?? '';

  const [step, setStep] = useState(0);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [channelStatus, setChannelStatus] = useState<any[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['des']);
  const [publishResults, setPublishResults] = useState<Record<string, { ok: boolean; error?: string }>>({});

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  async function loadListings() {
    const tenantId = searchParams.get('tenant') ?? searchParams.get('tenant_id') ?? '';
    const params = new URLSearchParams({ limit: '200' });
    if (tenantId) params.set('tenant_id', tenantId);
    const url = `/api/bop/mkp/listings-v2?${params.toString()}`;
    const res = await fetch(url);
    const j = await res.json();
    return j.listings ?? [];
  }

  async function loadChannelStatus(listingId: string) {
    const res = await fetch(`/api/bop/int/publish?listing_id=${listingId}`);
    const j = await res.json();
    setChannelStatus(j.channels ?? []);
  }

  async function selectListing(listing: any) {
    setSelected(listing);
    setStep(1);
    await loadChannelStatus(listing.id);
  }

  useEffect(() => {
    void (async () => {
      const data = await loadListings();
      setListings(data);
      setLoading(false);

      if (preselectedId) {
        const match = data.find((l: any) => l.id === preselectedId);
        if (match) {
          void selectListing(match);
        }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleChannel(key: string) {
    setSelectedChannels(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function channelState(key: string): string | null {
    const ch = channelStatus.find((c: any) => c.channel === key);
    return ch?.status ?? null;
  }

  async function publishToChannels() {
    if (!selected || selectedChannels.length === 0) return;
    setPublishing(true);
    const results: Record<string, { ok: boolean; error?: string }> = {};

    for (const ch of selectedChannels) {
      if (ch === 'des') {
        results[ch] = { ok: true };
        continue;
      }
      try {
        const res = await fetch('/api/bop/int/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: selected.id,
            channel: ch,
            action: channelState(ch) === 'active' ? 'update' : 'publish',
          }),
        });
        const j = await res.json();
        results[ch] = j.ok ? { ok: true } : { ok: false, error: j.error ?? 'Unknown error' };
      } catch (e: any) {
        results[ch] = { ok: false, error: e.message };
      }
    }

    setPublishResults(results);
    setPublishing(false);
    setStep(2);
    showToast('Publish jobs queued!');
  }

  const title = selected
    ? `${selected.bop_brands?.name ?? ''} ${selected.bop_models?.name ?? ''} ${selected.year ?? ''}`.trim() || 'Vehicle'
    : '';
  const price = selected?.bop_listing_pricing?.[0]?.asking_price ?? selected?.bop_listing_pricing?.asking_price ?? null;
  const coverImg = (selected?.bop_listing_media ?? []).find((m: any) => m.media_type === 'cover')?.url
    ?? (selected?.bop_listing_media ?? [])[0]?.url ?? null;

  return (
    <div>
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}
      <ScreenHeader title="Channel Publisher" description="MP004 — Publish a vehicle to marketplace channels" />

      <div className="mb-6 flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{i + 1}</div>
            <span className={`ml-2 text-sm font-medium ${i <= step ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`mx-4 h-px w-12 ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Vehicle */}
      {step === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">Select a vehicle to publish</div>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
          ) : listings.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No active listings found</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {listings.map((l: any) => {
                const lTitle = `${l.bop_brands?.name ?? ''} ${l.bop_models?.name ?? ''} ${l.year ?? ''}`.trim() || 'Vehicle';
                const lPrice = l.bop_listing_pricing?.[0]?.asking_price ?? null;
                const lImg = (l.bop_listing_media ?? []).find((m: any) => m.media_type === 'cover')?.url ?? null;
                return (
                  <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer" onClick={() => { void selectListing(l); }}>
                    <div className="flex items-center gap-3">
                      {lImg ? (
                        <img src={lImg} alt="" className="h-12 w-16 rounded-lg object-cover" />
                      ) : (
                        <div className="h-12 w-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-lg">-</div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-800">{lTitle}</div>
                        <div className="text-xs text-slate-400">{l.category ?? '—'} · REF {l.ref_no ?? '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {lPrice && <span className="font-semibold text-slate-700">{'€'}{Number(lPrice).toLocaleString()}</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{l.status}</span>
                      <span className="text-blue-600 text-sm">{'→'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure & Publish */}
      {step === 1 && selected && (
        <div className="max-w-2xl space-y-4">
          {/* Selected vehicle card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
            {coverImg ? (
              <img src={coverImg} alt="" className="h-14 w-20 rounded-lg object-cover" />
            ) : (
              <span className="text-2xl">-</span>
            )}
            <div>
              <div className="font-semibold text-slate-800">{title}</div>
              <div className="text-xs text-slate-400">REF {selected.ref_no ?? '—'}</div>
              {price && <div className="text-sm font-medium text-slate-700 mt-0.5">{'€'}{Number(price).toLocaleString()}</div>}
            </div>
            {!preselectedId && (
              <button onClick={() => { setStep(0); setSelected(null); setChannelStatus([]); }} className="ml-auto text-xs text-blue-600 hover:underline">Change</button>
            )}
          </div>

          {/* Channel selection */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="text-sm font-semibold text-slate-700">Select channels to publish</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHANNELS.map(ch => {
                const st = channelState(ch.key);
                const isSelected = selectedChannels.includes(ch.key);
                const isLive = st === 'active';
                return (
                  <label key={ch.key}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors
                      ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleChannel(ch.key)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{ch.label}</div>
                    </div>
                    {isLive && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Live</span>
                    )}
                    {st === 'pending' && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Pending</span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              {!preselectedId ? (
                <button onClick={() => { setStep(0); setSelected(null); setChannelStatus([]); }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Back</button>
              ) : (
                <button onClick={() => router.push('/console/mkp/listings')}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">Back to listings</button>
              )}
              <button onClick={() => { void publishToChannels(); }}
                disabled={publishing || selectedChannels.length === 0}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {publishing ? 'Publishing...' : `Publish to ${selectedChannels.length} channel${selectedChannels.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 2 && (
        <div className="max-w-lg space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-3">Publish jobs queued</h2>
            <p className="text-sm text-slate-500 mb-4">{title}</p>
            <div className="space-y-2">
              {Object.entries(publishResults).map(([ch, r]) => (
                <div key={ch} className="flex items-center justify-between rounded-lg bg-white px-4 py-2 border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">{CHANNELS.find(c => c.key === ch)?.label ?? ch}</span>
                  {r.ok ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Queued</span>
                  ) : (
                    <span className="text-xs text-red-600" title={r.error}>{r.error?.slice(0, 60) ?? 'Error'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={() => router.push('/console/mkp/listings')}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-white">View all listings</button>
            <button onClick={() => { setStep(0); setSelected(null); setChannelStatus([]); setSelectedChannels(['des']); setPublishResults({}); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Publish another</button>
          </div>
        </div>
      )}
    </div>
  );
}
