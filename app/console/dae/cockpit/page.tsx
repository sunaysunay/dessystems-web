'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

// ── Constants ─────────────────────────────────────────────────────────────────

const REVIEW_STATUSES = ['new','watching','interested','pass','acquired','archived'] as const;
type ReviewStatus = typeof REVIEW_STATUSES[number];

const PLATFORM_FLAG: Record<string, string> = {
  marktplaats: '🇳🇱', '2dehands': '🇧🇪', kleinanzeigen: '🇩🇪',
  autoscout24: '🇪🇺', mobile_de: '🇩🇪', leboncoin: '🇫🇷',
};
const PLATFORM_LABEL: Record<string, string> = {
  marktplaats: 'MP', '2dehands': '2DH', kleinanzeigen: 'KA',
  autoscout24: 'AS24', mobile_de: 'MDE', leboncoin: 'LBC',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const money = (v: number | null) =>
  v === null ? '—' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const km = (v: number | null) =>
  v === null ? '—' : `${new Intl.NumberFormat('nl-NL').format(v)} km`;

const daysAgo = (d: string | null) =>
  d === null ? null : Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

function scoreBar(s: number | null) {
  if (s === null) return null;
  const color = s >= 70 ? '#10b981' : s >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
        <div style={{ width: `${s}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{s}</span>
    </div>
  );
}

function FlagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: color, marginRight: 3, marginBottom: 2 }}>
      {label}
    </span>
  );
}

function OpportunityFlags({ s }: { s: any }) {
  if (!s) return null;
  return (
    <div>
      {s.underpriced    && <FlagBadge label="underpriced"    color="#d1fae5" />}
      {s.low_km         && <FlagBadge label="low km"         color="#dbeafe" />}
      {s.price_dropped  && <FlagBadge label="📉 dropped"    color="#fef3c7" />}
      {s.private_seller && <FlagBadge label="private"        color="#ede9fe" />}
      {s.margeregeling  && <FlagBadge label="margeregeling"  color="#fce7f3" />}
      {s.fresh          && <FlagBadge label="🆕 fresh"       color="#cffafe" />}
      {s.stale          && <FlagBadge label="stale"          color="#f1f5f9" />}
    </div>
  );
}

// ── Price Sparkline ───────────────────────────────────────────────────────────

function PriceSparkline({ listingId }: { listingId: string }) {
  const [history, setHistory] = useState<{ price: number; recorded_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/bop/dae/price-history?listing_id=${listingId}`)
      .then(r => r.json())
      .then(j => { setHistory(j.history ?? []); setLoading(false); });
  }, [listingId]);

  if (loading) return <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Loading price history…</div>;
  if (history.length < 2) {
    return (
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
        {history.length === 1
          ? `First seen at ${money(history[0].price)} · no changes yet`
          : 'No price history yet'}
      </div>
    );
  }

  const W = 340, H = 64, PAD = 8;
  const prices = history.map(h => h.price);
  const dates  = history.map(h => new Date(h.recorded_at).getTime());
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const minD = Math.min(...dates),  maxD = Math.max(...dates);

  const px = (d: number) => PAD + ((d - minD) / (maxD - minD || 1)) * (W - PAD * 2);
  const py = (p: number) => PAD + (1 - (p - minP) / (maxP - minP || 1)) * (H - PAD * 2);

  const pathD = history.map((h, i) => {
    const x = px(new Date(h.recorded_at).getTime());
    const y = py(h.price);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  const drop = prices[prices.length - 1] < prices[0];

  return (
    <div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {/* area fill */}
        <path
          d={`${pathD} L ${px(dates[dates.length-1]).toFixed(1)} ${H} L ${px(dates[0]).toFixed(1)} ${H} Z`}
          fill={drop ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.06)'}
        />
        {/* line */}
        <path d={pathD} fill="none" stroke={drop ? '#10b981' : '#6366f1'} strokeWidth={2} strokeLinejoin="round" />
        {/* dots */}
        {history.map((h, i) => (
          <circle
            key={i}
            cx={px(new Date(h.recorded_at).getTime())}
            cy={py(h.price)}
            r={3}
            fill={drop ? '#10b981' : '#6366f1'}
          >
            <title>{money(h.price)} · {new Date(h.recorded_at).toLocaleDateString('nl-NL')}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
        <span>{money(prices[0])} · {new Date(history[0].recorded_at).toLocaleDateString('nl-NL')}</span>
        <span style={{ color: drop ? '#10b981' : '#6366f1', fontWeight: 600 }}>
          {drop ? '▼' : '▲'} {money(Math.abs(prices[prices.length-1] - prices[0]))}
        </span>
        <span>{money(prices[prices.length-1])} · {new Date(history[history.length-1].recorded_at).toLocaleDateString('nl-NL')}</span>
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ listing, onClose, onReview }: {
  listing: any;
  onClose: () => void;
  onReview: (id: string, status: ReviewStatus) => void;
}) {
  const s   = listing.dae_opportunity_scores;
  const r   = listing.dae_reviews;
  const src = listing.dae_sources;

  const [notes,   setNotes]   = useState(r?.notes ?? '');
  const [target,  setTarget]  = useState(r?.target_price ?? '');
  const [contact, setContact] = useState(r?.contact_made ?? false);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000); };

  async function saveNotes() {
    setSaving(true);
    await fetch('/api/bop/dae/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id:   listing.id,
        notes:        notes || null,
        target_price: target ? Number(target) : null,
        contact_made: contact,
      }),
    });
    setSaving(false);
    showToast('Saved');
  }

  const discount = listing.original_price && listing.price_gross
    ? Math.round((1 - listing.price_gross / listing.original_price) * 100)
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} onClick={onClose}>
      <div
        style={{ width: 440, height: '100vh', background: 'var(--card)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: 24, boxShadow: '-4px 0 24px rgba(0,0,0,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {toast && (
          <div style={{ position: 'fixed', top: 16, right: 16, background: '#1e293b', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 100 }}>{toast}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{listing.title ?? `${listing.make ?? '?'} ${listing.model ?? ''}`}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>
              {PLATFORM_FLAG[src?.platform_code] ?? '🌐'} {src?.platform_name} · {listing.country ?? '?'}
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>✕</button>
        </div>

        {/* Image */}
        {listing.image_urls?.[0] && (
          <img
            src={listing.image_urls[0]}
            alt=""
            style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        {/* Score */}
        <div style={{ background: 'var(--muted)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--muted-foreground)' }}>OPPORTUNITY SCORE</div>
          {s ? (
            <>
              {scoreBar(s.score)}
              <OpportunityFlags s={s} />
              {s.cohort_median_price && (
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>
                  Market median: {money(s.cohort_median_price)} (n={s.cohort_size ?? '?'})
                </div>
              )}
            </>
          ) : <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Not scored yet</span>}
        </div>

        {/* Price history sparkline */}
        <div style={{ background: 'var(--muted)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--muted-foreground)' }}>PRICE HISTORY</div>
          <PriceSparkline listingId={listing.id} />
        </div>

        {/* Specs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 16 }}>
          {[
            ['Price',       money(listing.price_gross)],
            ['Was',         listing.original_price ? `${money(listing.original_price)} (−${discount}%)` : '—'],
            ['Year',        listing.year ?? '—'],
            ['Mileage',     km(listing.mileage_km)],
            ['Fuel',        listing.fuel_type ?? '—'],
            ['Gearbox',     listing.transmission ?? '—'],
            ['Body',        listing.body_type ?? '—'],
            ['Color',       listing.color ?? '—'],
            ['Seller',      listing.seller_type ?? '—'],
            ['Days listed', daysAgo(listing.posted_at) !== null ? `${daysAgo(listing.posted_at)}d` : '—'],
          ].map(([label, val]) => (
            <div key={label} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--muted-foreground)' }}>{label}: </span>
              <span style={{ fontWeight: 500 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        {listing.description && (
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16, lineHeight: 1.6, maxHeight: 80, overflow: 'hidden' }}>
            {listing.description.slice(0, 280)}{listing.description.length > 280 ? '…' : ''}
          </div>
        )}

        {/* Review status buttons */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6 }}>REVIEW STATUS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {REVIEW_STATUSES.map(st => (
              <button
                key={st}
                onClick={() => onReview(listing.id, st)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                  border: (r?.review_status ?? 'new') === st ? '2px solid #6366f1' : '1px solid var(--border)',
                  background: 'var(--card)',
                }}
              >{st}</button>
            ))}
          </div>
        </div>

        {/* Target price */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)' }}>TARGET PRICE (€)</label>
          <input
            type="number"
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="What would you pay?"
            style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, background: 'var(--background)', color: 'var(--foreground)' }}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)' }}>NOTES</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Condition notes, contact details, negotiation…"
            style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, resize: 'vertical', background: 'var(--background)', color: 'var(--foreground)' }}
          />
        </div>

        {/* Contact made */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={contact} onChange={e => setContact(e.target.checked)} />
          Contact made with seller
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { void saveNotes(); }}
            disabled={saving}
            style={{ flex: 1, padding: '8px 0', borderRadius: 6, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >{saving ? 'Saving…' : 'Save notes'}</button>
          <a
            href={listing.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 1, padding: '8px 0', borderRadius: 6, background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}
          >Open listing ↗</a>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DA001Page() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const [fMake,     setFMake]     = useState('');
  const [fPlatform, setFPlatform] = useState('');
  const [fReview,   setFReview]   = useState('');
  const [fMinScore, setFMinScore] = useState('');
  const [fPriceMax, setFPriceMax] = useState('');
  const [fYearMin,  setFYearMin]  = useState('');
  const [fKmMax,    setFKmMax]    = useState('');
  const [fFlag,     setFFlag]     = useState('');

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (fMake)     params.set('make', fMake);
    if (fPlatform) params.set('platform', fPlatform);
    if (fReview)   params.set('review', fReview);
    if (fMinScore) params.set('min_score', fMinScore);
    if (fPriceMax) params.set('price_max', fPriceMax);
    if (fYearMin)  params.set('year_min', fYearMin);
    if (fKmMax)    params.set('km_max', fKmMax);
    if (fFlag)     params.set('flags', fFlag);
    const j = await fetch(`/api/bop/dae/cockpit?${params}`).then(r => r.json());
    setListings(j.listings ?? []);
    setLoading(false);
  }, [fMake, fPlatform, fReview, fMinScore, fPriceMax, fYearMin, fKmMax, fFlag]);

  useEffect(() => { void load(); }, [load]);

  async function setReview(listingId: string, status: ReviewStatus) {
    await fetch('/api/bop/dae/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, review_status: status }),
    });
    setListings(ls => ls.map(l => l.id === listingId
      ? { ...l, dae_reviews: { ...(l.dae_reviews ?? {}), review_status: status } }
      : l
    ));
    if (selected?.id === listingId) {
      setSelected((s: any) => s ? { ...s, dae_reviews: { ...(s.dae_reviews ?? {}), review_status: status } } : s);
    }
    showToast(`Marked as ${status}`);
  }

  function clearFilters() {
    setFMake(''); setFPlatform(''); setFReview(''); setFMinScore('');
    setFPriceMax(''); setFYearMin(''); setFKmMax(''); setFFlag('');
  }

  const anyFilter = fMake || fPlatform || fReview || fMinScore || fPriceMax || fYearMin || fKmMax || fFlag;

  const stats = useMemo(() => {
    const scored = listings.filter(l => l.dae_opportunity_scores?.score !== null);
    const avg    = scored.length ? Math.round(scored.reduce((s, l) => s + l.dae_opportunity_scores.score, 0) / scored.length) : 0;
    const hot    = listings.filter(l => (l.dae_opportunity_scores?.score ?? 0) >= 70).length;
    return { n: listings.length, avg, hot };
  }, [listings]);

  const inputStyle: React.CSSProperties = {
    padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)',
    fontSize: 12, background: 'var(--background)', color: 'var(--foreground)', minWidth: 100,
  };
  const selStyle: React.CSSProperties = { ...inputStyle, minWidth: 120 };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400 }}>
      <ScreenHeader title="Listings Cockpit" description="DA001 — Scored vehicle listings with opportunity flags and review workflow" />

      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, background: '#1e293b', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 200 }}>{toast}</div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {[['Listings', stats.n], ['Avg score', stats.avg], ['Hot (≥70)', stats.hot]].map(([label, value]) => (
          <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 18px', minWidth: 100 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input style={inputStyle} placeholder="Make…" value={fMake} onChange={e => setFMake(e.target.value)} />
        <select style={selStyle} value={fPlatform} onChange={e => setFPlatform(e.target.value)}>
          <option value="">All platforms</option>
          {Object.entries(PLATFORM_LABEL).map(([code, lbl]) => (
            <option key={code} value={code}>{PLATFORM_FLAG[code]} {lbl}</option>
          ))}
        </select>
        <select style={selStyle} value={fReview} onChange={e => setFReview(e.target.value)}>
          <option value="">All status</option>
          {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={selStyle} value={fFlag} onChange={e => setFFlag(e.target.value)}>
          <option value="">All flags</option>
          <option value="underpriced">Underpriced</option>
          <option value="low_km">Low km</option>
          <option value="price_dropped">Price dropped</option>
          <option value="private_seller">Private seller</option>
          <option value="margeregeling">Margeregeling</option>
          <option value="fresh">Fresh (48h)</option>
        </select>
        <input style={{ ...inputStyle, width: 80 }}  placeholder="Score ≥" type="number" value={fMinScore} onChange={e => setFMinScore(e.target.value)} />
        <input style={{ ...inputStyle, width: 90 }}  placeholder="Price ≤" type="number" value={fPriceMax} onChange={e => setFPriceMax(e.target.value)} />
        <input style={{ ...inputStyle, width: 70 }}  placeholder="Year ≥"  type="number" value={fYearMin}  onChange={e => setFYearMin(e.target.value)}  />
        <input style={{ ...inputStyle, width: 80 }}  placeholder="Km ≤"    type="number" value={fKmMax}    onChange={e => setFKmMax(e.target.value)}    />
        {anyFilter && (
          <button onClick={clearFilters} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--muted)', cursor: 'pointer' }}>
            Clear ✕
          </button>
        )}
        <button onClick={() => { void load(); }} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>
      ) : listings.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>
          No listings found. Run the scraper to populate data.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '2px solid var(--border)' }}>
                {['Score','Title','Price','Year','Km','Platform','Seller','Flags','Status',''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listings.map(l => {
                const s   = l.dae_opportunity_scores;
                const r   = l.dae_reviews;
                const src = l.dae_sources;
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected?.id === l.id ? 'var(--accent)' : 'transparent' }}
                    onMouseEnter={e => { if (selected?.id !== l.id) (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; }}
                    onMouseLeave={e => { if (selected?.id !== l.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{scoreBar(s?.score ?? null)}</td>
                    <td style={{ padding: '8px 10px', maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.title ?? `${l.make ?? '?'} ${l.model ?? ''}`}
                      </div>
                      {l.color && <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{l.color}</div>}
                    </td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{money(l.price_gross)}</div>
                      {l.original_price && l.original_price > l.price_gross && (
                        <div style={{ fontSize: 11, color: '#10b981' }}>was {money(l.original_price)}</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{l.year ?? '—'}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{km(l.mileage_km)}</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <span title={src?.platform_name ?? ''}>
                        {PLATFORM_FLAG[src?.platform_code] ?? '🌐'} {PLATFORM_LABEL[src?.platform_code] ?? src?.platform_code ?? '?'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: l.seller_type === 'private' ? '#ede9fe' : '#f1f5f9' }}>
                        {l.seller_type ?? '?'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', maxWidth: 160 }}>
                      <OpportunityFlags s={s} />
                    </td>
                    <td style={{ padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
                      <select
                        value={r?.review_status ?? 'new'}
                        onChange={(e) => { void setReview(l.id, e.target.value as ReviewStatus); }}
                        style={{ fontSize: 11, fontWeight: 600, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--background)', color: 'var(--foreground)' }}
                      >
                        {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
                      <a href={l.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>↗</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <DetailPanel listing={selected} onClose={() => setSelected(null)} onReview={(l, v) => { void setReview(l, v); }} />
      )}
    </div>
  );
}
