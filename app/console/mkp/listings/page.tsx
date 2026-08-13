'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const CATEGORIES = ['van','truck','trailer','camper','caravan','bus','machinery','construction'] as const;
const SALE_METHODS = ['fixed','auction','buy_now_bid','tender','lease'] as const;
const STATUSES = ['draft','review','approved','active','reserved','sold','archived'] as const;

const CAT_ICON: Record<string,string> = { van:'🚐', truck:'🚛', trailer:'🚚', camper:'🚌', caravan:'🏕️', bus:'🚌', machinery:'🏗️', construction:'🚧' };
const SALE_LABEL: Record<string,string> = { fixed:'Fixed', auction:'Auction', buy_now_bid:'Buy-now/Bid', tender:'Tender', lease:'Lease' };
const STATUS_DOT: Record<string,string> = {
  draft:'#94a3b8', review:'#f59e0b', approved:'#06b6d4', active:'#10b981', reserved:'#6366f1', sold:'#3b82f6', archived:'#cbd5e1',
};

const IS_DEV = process.env.NEXT_PUBLIC_BOP_ENV !== 'PROD';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const scoreColor = (s: number) => s >= 80 ? 'bg-emerald-100 text-emerald-700' : s >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';
const money = (v: number | null, c: string) => v === null ? '—' : new Intl.NumberFormat('nl-NL', { style:'currency', currency:c||'EUR', maximumFractionDigits:0 }).format(v);
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g,'').trim().replace(/[\s_]+/g,'-').replace(/-+/g,'-');
type TenantDomains = Record<number, { domain: string | null; dev_domain: string | null }>;
// Resolve host per environment: dev_domain when running on dev, domain on prod.
function resolveHost(l: any, td: TenantDomains): string | null {
  const t = td[l.tenant_id];
  return (IS_DEV ? t?.dev_domain : t?.domain) ?? null;
}
// previewUrl: for the '👁 Preview' action — no publish gate so operators can
// preview drafts. Route: /[locale]/[slug] (desmobil has no /vehicles/ prefix).
function previewUrl(l: any, td: TenantDomains): string | null {
  const host = resolveHost(l, td);
  if (!host || !l.ref_no) return null;
  const slug = l.ref_no + '-' + slugify([l.brand_name, l.model_name, l.year].filter(Boolean).join(' '));
  return 'https://' + host + '/en/' + slug + '?preview=1';
}
// publicUrl: 'Copy public link' — published only, full slug (rich preview cards).
function publicUrl(l: any, td: TenantDomains): string | null {
  return l.workflow_status === 'published' ? previewUrl(l, td) : null;
}
// shortUrl: 'Copy short link' — published only, bare ref_no (easy to share/type).
// Shows/works only when the listing is live on the storefront.
function shortUrl(l: any, td: TenantDomains): string | null {
  if (l.workflow_status !== 'published') return null;
  const host = resolveHost(l, td);
  if (!host || !l.ref_no) return null;
  return 'https://' + host + '/' + l.ref_no;
}
type SortKey = 'ref_no'|'category'|'brand_name'|'model_name'|'asking_price'|'sale_method'|'status'|'des_score'|'updated_at';

export default function MP001Page() {
  const router = useRouter();
  const { unit } = useScope();
  const [listings, setListings] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [newModels, setNewModels] = useState<any[]>([]);
  const [tenantDomains, setTenantDomains] = useState<Record<number, { domain: string | null; dev_domain: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [slinkOpen, setSlinkOpen] = useState<string | null>(null);
  const [slinkPrefixes, setSlinkPrefixes] = useState<{prefix:string;label:string;sort_order?:number}[]>([]);
  const [editPrice, setEditPrice] = useState<string | null>(null);

  const [fRef, setFRef] = useState(''); const [fCat, setFCat] = useState(''); const [fBrand, setFBrand] = useState('');
  const [fModel, setFModel] = useState(''); const [fSale, setFSale] = useState(''); const [fStatus, setFStatus] = useState(''); const [fPriceMax, setFPriceMax] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'|null>('desc');

  const [showNew, setShowNew] = useState(false);
  const [nPlate, setNPlate] = useState('');
  const [nYear, setNYear] = useState<number|null>(null);
  const [rdwData, setRdwData] = useState<any>(null);
  const [rdwLoading, setRdwLoading] = useState(false);
  const [nCat, setNCat] = useState('van'); const [nBrand, setNBrand] = useState(''); const [nModel, setNModel] = useState('');
  const [nSale, setNSale] = useState('fixed'); const [creating, setCreating] = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  function openNew() {
    setNPlate(''); setNYear(null); setRdwData(null); setRdwLoading(false);
    setNCat('van'); setNBrand(''); setNModel(''); setNSale('fixed');
    setShowNew(true);
  }

  async function lookupPlate() {
    const plate = nPlate.trim();
    if (!plate) return;
    setRdwLoading(true); setRdwData(null);
    try {
      const j = await fetch('/api/bop/int/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_key: 'rdw.lookup', payload: { plate } }),
      }).then(r => r.json());
      if (j.status === 'ok' && j.result) {
        const r = j.result;
        setRdwData(r);
        if (r.vehicle_type_suggestion && (CATEGORIES as readonly string[]).includes(r.vehicle_type_suggestion)) {
          setNCat(r.vehicle_type_suggestion as typeof CATEGORIES[number]);
        }
        if (r.year) setNYear(r.year);
      } else {
        setRdwData({ _error: 'Plate not found in RDW' });
      }
    } catch {
      setRdwData({ _error: 'RDW lookup failed' });
    } finally {
      setRdwLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    const j = await fetch(`/api/bop/mkp/bop-listings?tenant=${unit.id}`).then(r => r.json());
    setListings(j.listings ?? []); setLoading(false);
  }
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);
  useEffect(() => {
    void fetch('/api/bop/mkp/tenant-domains').then(r => r.json()).then(j => {
      const map: Record<number, { domain: string | null; dev_domain: string | null }> = {};
      for (const t of j.tenants ?? []) map[t.tenant_id] = { domain: t.domain, dev_domain: t.dev_domain };
      setTenantDomains(map);
    });
    void fetch(`/api/bop/shortlink?view=prefixes&tenant_id=${unit.id}`).then(r => r.json()).then(j => {
      setSlinkPrefixes((j.prefixes ?? j.data ?? []).filter((p: any) => p.active !== false).sort((a: any, b: any) => (a.sort_order ?? 50) - (b.sort_order ?? 50)));
    }).catch(() => {});
  }, [unit.id]);
  useEffect(() => { void fetch(`/api/bop/mkp/bop-listings/meta?tenant_id=${unit.id}`).then(r => r.json()).then(j => setBrands(j.brands ?? [])); }, [unit.id]);
  useEffect(() => {
    setNModel('');
    if (!nBrand) { setNewModels([]); return; }
    void fetch(`/api/bop/mkp/bop-listings/meta?brand_id=${nBrand}`).then(r => r.json()).then(j => setNewModels(j.models ?? []));
  }, [nBrand]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }
  const arrow = (k: SortKey) => (sortKey !== k || !sortDir) ? '↕' : sortDir === 'asc' ? '↑' : '↓';

  const rows = useMemo(() => {
    let r = listings.filter(l =>
      (!fRef || (l.ref_no ?? '').toLowerCase().includes(fRef.toLowerCase())) &&
      (!fCat || l.category === fCat) &&
      (!fBrand || (l.brand_name ?? '').toLowerCase().includes(fBrand.toLowerCase())) &&
      (!fModel || (l.model_name ?? '').toLowerCase().includes(fModel.toLowerCase())) &&
      (!fSale || l.sale_method === fSale) &&
      (!fStatus || l.status === fStatus) &&
      (!fPriceMax || (l.asking_price ?? Infinity) <= Number(fPriceMax)));
    if (sortDir) {
      const dir = sortDir === 'asc' ? 1 : -1;
      r = [...r].sort((a, b) => { const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''; return (av < bv ? -1 : av > bv ? 1 : 0) * dir; });
    }
    return r;
  }, [listings, fRef, fCat, fBrand, fModel, fSale, fStatus, fPriceMax, sortKey, sortDir]);

  const anyFilter = fRef||fCat||fBrand||fModel||fSale||fStatus||fPriceMax;

  async function patchCore(id: string, data: any) {
    const j = await fetch(`/api/bop/mkp/bop-listings/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ section:'core', data }) }).then(r=>r.json());
    if (j.error) return showToast(j.error);
    setListings(ls => ls.map(l => l.id === id ? { ...l, ...data } : l));
  }
  async function patchPrice(id: string, asking_price: number | null) {
    const j = await fetch(`/api/bop/mkp/bop-listings/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ section:'pricing', data:{ asking_price } }) }).then(r=>r.json());
    if (j.error) return showToast(j.error);
    setListings(ls => ls.map(l => l.id === id ? { ...l, asking_price } : l));
  }
  async function del(id: string) {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    const j = await fetch(`/api/bop/mkp/bop-listings/${id}`, { method:'DELETE' }).then(r=>r.json());
    if (j.error) return showToast(j.error);
    setListings(ls => ls.filter(l => l.id !== id)); showToast('Deleted');
  }

  async function duplicate(listingId: string) {
    const j = await fetch(`/api/bop/mkp/listings/${listingId}/duplicate`, { method: 'POST' }).then(r => r.json());
    if (j.error) { showToast('✗ ' + j.error); return; }
    showToast('✓ Duplicated — opening copy');
    router.push(`/console/mkp/listings/${j.id}`);
  }
  async function createListing() {
    setCreating(true);
    const j = await fetch('/api/bop/mkp/bop-listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: unit.id,
        category: nCat,
        brand_id: nBrand ? Number(nBrand) : null,
        model_id: nModel ? Number(nModel) : null,
        sale_method: nSale,
        year: nYear ?? null,
      }),
    }).then(r=>r.json());
    setCreating(false);
    if (j.id) router.push(`/console/mkp/listings/${j.id}`); else showToast(j.error || 'Create failed');
  }

  const th = 'px-3 py-2 cursor-pointer select-none hover:text-slate-700';
  const fin = 'w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs';

  return (
    <div className="p-6">
      <ScreenHeader title="Listing Manager" description="BOP V2 vehicle & asset listings" />

      <div className="mb-3 flex items-center gap-2">
        {anyFilter && <button onClick={() => { setFRef('');setFCat('');setFBrand('');setFModel('');setFSale('');setFStatus('');setFPriceMax(''); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 hover:bg-red-50 hover:text-red-500">Clear filters</button>}
        <span className="ml-auto text-xs text-slate-400">{rows.length} of {listings.length}</span>
        <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">+ New listing</button>
      </div>

      <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2 w-10"></th>
              <th className="px-3 py-2"></th>
              <th className={th} onClick={() => toggleSort('ref_no')}>Ref {arrow('ref_no')}</th>
              <th className={th} onClick={() => toggleSort('category')}>Category {arrow('category')}</th>
              <th className={th} onClick={() => toggleSort('brand_name')}>Brand {arrow('brand_name')}</th>
              <th className={th} onClick={() => toggleSort('model_name')}>Model {arrow('model_name')}</th>
              <th className={th} onClick={() => toggleSort('sale_method')}>Trans. {arrow('sale_method')}</th>
              <th className={th} onClick={() => toggleSort('asking_price')}>Price {arrow('asking_price')}</th>
              <th className={th} onClick={() => toggleSort('status')}>Status {arrow('status')}</th>
              <th className={th} onClick={() => toggleSort('des_score')}>DES {arrow('des_score')}</th>
              <th className={th} onClick={() => toggleSort('updated_at')}>Updated {arrow('updated_at')}</th>
            </tr>
            <tr className="bg-white">
              <th className="px-2 py-1.5"></th>
              <th className="px-3 py-1.5"></th>
              <th className="px-3 py-1.5"><input value={fRef} onChange={e=>setFRef(e.target.value)} placeholder="ID…" className={fin} /></th>
              <th className="px-3 py-1.5"><BopSelect size="sm" value={fCat} onChange={setFCat} options={[{ value:'', label:'All' }, ...CATEGORIES.map(c => ({ value:c, label:cap(c) }))]} /></th>
              <th className="px-3 py-1.5"><input value={fBrand} onChange={e=>setFBrand(e.target.value)} placeholder="Brand…" className={fin} /></th>
              <th className="px-3 py-1.5"><input value={fModel} onChange={e=>setFModel(e.target.value)} placeholder="Model…" className={fin} /></th>
              <th className="px-3 py-1.5"><BopSelect size="sm" value={fSale} onChange={setFSale} options={[{ value:'', label:'All' }, ...SALE_METHODS.map(s => ({ value:s, label:SALE_LABEL[s] ?? s }))]} /></th>
              <th className="px-3 py-1.5"><input value={fPriceMax} onChange={e=>setFPriceMax(e.target.value)} placeholder="≤ €" type="number" className={fin} /></th>
              <th className="px-3 py-1.5"><BopSelect size="sm" value={fStatus} onChange={setFStatus} options={[{ value:'', label:'All' }, ...STATUSES.map(s => ({ value:s, label:cap(s), ...(STATUS_DOT[s] !== undefined ? { color: STATUS_DOT[s] } : {}) }))]} /></th>
              <th className="px-3 py-1.5"></th><th className="px-3 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            : rows.length === 0 ? <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">No listings match.</td></tr>
            : rows.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-2 py-2 relative">
                  <button onClick={() => setMenuId(menuId === l.id ? null : l.id)} className="rounded px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">⋯</button>
                  {menuId === l.id && (<>
                    <div className="fixed inset-0 z-10" onClick={() => { setMenuId(null); setSlinkOpen(null); }} />
                    <div className="absolute left-2 top-9 z-20 w-40 rounded-lg border border-slate-200 bg-white py-1 text-left text-sm shadow-lg">
                      <button onClick={() => router.push(`/console/mkp/listings/${l.id}`)} className="block w-full px-3 py-1.5 text-left hover:bg-slate-50">✏️ Edit</button>
                      <a href={previewUrl(l, tenantDomains) ?? `/console/mkp/listings/${l.id}/preview`} target="_blank" rel="noreferrer" className="block px-3 py-1.5 hover:bg-slate-50">👁 Preview</a>
                      <div className="my-1 border-t border-slate-100" />
                      <button onClick={() => { const u = publicUrl(l, tenantDomains); if (!u) { showToast('Publish first to get a public link'); return; } void navigator.clipboard.writeText(u); setMenuId(null); showToast('Public link copied'); }} disabled={!publicUrl(l, tenantDomains)} title={!publicUrl(l, tenantDomains) ? 'Publish listing first' : undefined} className="block w-full px-3 py-1.5 text-left hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">🔗 Copy public link</button>
                      <div className="relative" onMouseEnter={() => { if (shortUrl(l, tenantDomains)) setSlinkOpen(l.id); }} onMouseLeave={() => setSlinkOpen(null)}>
                        <button disabled={!shortUrl(l, tenantDomains)} className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed">
                          <span>🔗 Copy S.Link</span><span className="text-xs text-slate-400">›</span>
                        </button>
                        {slinkOpen === l.id && (
                          <div className="absolute left-full top-0 z-30 ml-1 w-52 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg max-h-[400px] overflow-y-auto">
                            <button onClick={() => { const host = resolveHost(l, tenantDomains); void navigator.clipboard.writeText(`https://${host}/${l.ref_no}`); setMenuId(null); setSlinkOpen(null); showToast('Neutral link copied'); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50">
                              <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white bg-slate-400">—</span>
                              <span>Neutral</span><span className="ml-auto font-mono text-[11px] text-slate-400">/{l.ref_no}</span>
                            </button>
                            {slinkPrefixes.map(p => (
                              <button key={p.prefix} onClick={() => { const host = resolveHost(l, tenantDomains); void navigator.clipboard.writeText(`https://${host}/${p.prefix}${l.ref_no}`); setMenuId(null); setSlinkOpen(null); showToast(`${p.label} link copied`); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50">
                                <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ background: ({a:'#9333ea',m:'#f59e0b',f:'#3b82f6',i:'#e11d48',w:'#22c55e',e:'#6366f1',q:'#8b5cf6',g:'#ef4444',t:'#0ea5e9',x:'#1e293b',p:'#f97316'})[p.prefix] ?? '#64748b' }}>{p.prefix}</span>
                                <span>{p.label}</span><span className="ml-auto font-mono text-[11px] text-slate-400">/{p.prefix}{l.ref_no}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="my-1 border-t border-slate-100" />
                      <a href={`/console/mkp/analytics?listing_id=${l.id}`} className="block px-3 py-1.5 hover:bg-slate-50">📊 Analytics</a>
                      <a href={`/console/mkp/publish?listing_id=${l.id}`} className="block px-3 py-1.5 hover:bg-slate-50">🌐 Publications</a>
                      <button onClick={() => { setMenuId(null); void duplicate(l.id); }} className="block w-full px-3 py-1.5 text-left hover:bg-slate-50">📋 Duplicate</button>
                      <div className="my-1 border-t border-slate-100" />
                      <button onClick={() => { setMenuId(null); void del(l.id); }} className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50">🗑 Delete</button>
                    </div>
                  </>)}
                </td>
                <td className="px-3 py-2">
                  <div className="h-9 w-12 overflow-hidden rounded bg-slate-100">
                    {l.cover_url ? <img src={l.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">{CAT_ICON[l.category] ?? '📦'}</div>}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs font-medium text-slate-700 cursor-pointer hover:text-blue-600" onClick={() => router.push(`/console/mkp/listings/${l.id}`)}>
                  {l.ref_no || '—'}{l.is_verified && <span className="ml-1 text-emerald-500" title="Verified">✓</span>}
                </td>
                <td className="px-3 py-2 capitalize text-slate-600">{CAT_ICON[l.category]} {l.category}</td>
                <td className="px-3 py-2 text-slate-700">{l.brand_name ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{l.model_name ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{SALE_LABEL[l.sale_method] ?? l.sale_method}</td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {editPrice === l.id
                    ? <input autoFocus type="number" defaultValue={l.asking_price ?? ''} className="w-24 rounded border border-blue-300 px-1 py-0.5 text-sm"
                        onBlur={e => { setEditPrice(null); const v = e.target.value === '' ? null : Number(e.target.value); if (v !== l.asking_price) void patchPrice(l.id, v); }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditPrice(null); }} />
                    : <span className="cursor-pointer hover:underline" onClick={() => setEditPrice(l.id)} title="Click to edit">{money(l.asking_price, l.currency)}</span>}
                </td>
                <td className="px-3 py-2">
                  <BopSelect size="sm" className="w-32" value={l.status} onChange={(v) => { void patchCore(l.id, { status: v }); }}
                    options={STATUSES.map(s => ({ value:s, label:cap(s), ...(STATUS_DOT[s] !== undefined ? { color: STATUS_DOT[s] } : {}) }))} />
                </td>
                <td className="px-3 py-2"><span className={`inline-flex h-6 w-8 items-center justify-center rounded text-xs font-bold ${scoreColor(l.des_score)}`}>{l.des_score}</span></td>
                <td className="px-3 py-2 text-xs text-slate-400">{l.updated_at ? new Date(l.updated_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-900">New listing</h2>

            {/* RDW plate lookup */}
            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <label className="mb-1.5 block text-xs font-semibold text-blue-700">Dutch plate lookup (optional)</label>
              <div className="flex gap-2">
                <input
                  value={nPlate}
                  onChange={e => { setNPlate(e.target.value.toUpperCase()); setRdwData(null); setNYear(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') void lookupPlate(); }}
                  placeholder="e.g. SV-751-B"
                  className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-sm uppercase tracking-widest text-slate-800 placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => { void lookupPlate(); }}
                  disabled={rdwLoading || !nPlate.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {rdwLoading ? '…' : 'Lookup'}
                </button>
              </div>
              {rdwData && !rdwData._error && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-slate-700">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-700">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Pre-filled from RDW · {rdwData.plate}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-600">
                    {rdwData.make    && <span><b>Make:</b> {rdwData.make}</span>}
                    {rdwData.model   && <span><b>Model:</b> {rdwData.model}</span>}
                    {rdwData.year    && <span><b>Year:</b> {rdwData.year}</span>}
                    {rdwData.fuel    && <span><b>Fuel:</b> {rdwData.fuel}</span>}
                    {rdwData.color   && <span><b>Color:</b> {rdwData.color}</span>}
                    {rdwData.gvw_kg  && <span><b>GVW:</b> {rdwData.gvw_kg} kg</span>}
                    {rdwData.apk_expiry && <span><b>APK:</b> {rdwData.apk_expiry}</span>}
                    {rdwData.vehicle_type_suggestion && <span><b>Type hint:</b> {rdwData.vehicle_type_suggestion}</span>}
                  </div>
                  {rdwData.description && <div className="mt-1 text-slate-400">{rdwData.description}</div>}
                </div>
              )}
              {rdwData?._error && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{rdwData._error}</div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Category</label>
                <BopSelect value={nCat} onChange={setNCat} size="md" options={CATEGORIES.map(c => ({ value:c, label:cap(c) }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Brand (optional)
                  {rdwData?.make && !rdwData._error && <span className="ml-2 font-normal text-blue-500">RDW: {rdwData.make}</span>}
                </label>
                <BopSelect value={nBrand} onChange={setNBrand} size="md" options={[{ value:'', label:'— none —' }, ...brands.map(b => ({ value:String(b.id), label:b.name }))]} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Model (optional)
                  {rdwData?.model && !rdwData._error && <span className="ml-2 font-normal text-blue-500">RDW: {rdwData.model}</span>}
                </label>
                <BopSelect value={nModel} onChange={setNModel} size="md" disabled={!nBrand}
                  options={[{ value:'', label: nBrand ? '— none —' : 'select a brand first' }, ...newModels.map(m => ({ value:String(m.id), label:m.name }))]} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Sale method</label>
                <BopSelect value={nSale} onChange={setNSale} size="md" options={SALE_METHODS.map(s => ({ value:s, label:SALE_LABEL[s] ?? s }))} />
              </div>
              {nYear && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Year <b>{nYear}</b> will be set on the listing (from RDW).
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void createListing(); }} disabled={creating} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{creating ? 'Creating…' : 'Create & edit'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
