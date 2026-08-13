'use client';
// SA013 — Sell Leads (acquisition funnel inbox). SLA discipline: the 2-hour
// offer promise is the product — leads breaching it turn red.
import { useState, useEffect, useCallback } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { RefreshCw, Search } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  new:                'bg-blue-100 text-blue-700',
  reviewing:          'bg-amber-100 text-amber-700',
  offer_sent:         'bg-violet-100 text-violet-700',
  negotiating:        'bg-cyan-100 text-cyan-700',
  accepted:           'bg-emerald-100 text-emerald-700',
  purchased:          'bg-emerald-200 text-emerald-800',
  declined_by_us:     'bg-slate-100 text-slate-500',
  rejected_by_seller: 'bg-red-100 text-red-600',
  expired:            'bg-slate-100 text-slate-400',
  lost:               'bg-slate-100 text-slate-400',
};

const VEHICLE_TYPES = ['', 'van', 'truck', 'commercial_truck', 'camper', 'car', 'caravan', 'boat'];
const STATUSES = ['', 'new', 'reviewing', 'offer_sent', 'negotiating', 'accepted', 'purchased', 'declined_by_us', 'rejected_by_seller', 'expired', 'lost'];
const BULK_STATUSES = ['declined_by_us', 'lost', 'expired', 'reviewing'];
const DELETABLE = ['declined_by_us', 'lost'];

type SortKey = 'ref' | 'created_at' | 'vehicle_type' | 'make' | 'license_plate' | 'mileage_km' | 'condition' | 'asking_price_eur' | 'our_offer_eur' | 'status' | 'source';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey | 'sla'; label: string; sortable: boolean }[] = [
  { key: 'ref',              label: 'Ref',       sortable: true },
  { key: 'sla',              label: 'SLA',       sortable: false },
  { key: 'created_at',       label: 'Created',   sortable: true },
  { key: 'vehicle_type',     label: 'Type',      sortable: true },
  { key: 'make',             label: 'Vehicle',   sortable: true },
  { key: 'license_plate',    label: 'Plate',     sortable: true },
  { key: 'mileage_km',       label: 'Km',        sortable: true },
  { key: 'condition',        label: 'Condition',  sortable: true },
  { key: 'asking_price_eur', label: 'Asking',    sortable: true },
  { key: 'our_offer_eur',    label: 'Offer',     sortable: true },
  { key: 'status',           label: 'Status',    sortable: true },
  { key: 'source',           label: 'Source',     sortable: true },
];

function slaBadge(createdAt: string, status: string) {
  if (!['new', 'reviewing'].includes(status)) return null;
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const label = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  const breach = mins > 120;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${breach ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
      {label}
    </span>
  );
}

function sortVal(row: any, key: SortKey): string | number {
  const v = row[key];
  if (key === 'mileage_km' || key === 'asking_price_eur' || key === 'our_offer_eur')
    return v == null ? -Infinity : Number(v);
  if (key === 'created_at') return v ? new Date(v).getTime() : 0;
  if (key === 'make') return `${row.make ?? ''} ${row.model ?? ''}`.toLowerCase();
  return (v ?? '').toString().toLowerCase();
}

export default function SellLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [vtype, setVtype] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (vtype) p.set('vehicle_type', vtype);
    if (!status && activeOnly) p.set('active', '1');
    if (search.trim()) p.set('q', search.trim());
    const res = await fetch(`/api/bop/sal/sell-leads?${p}`);
    const j = await res.json();
    setLeads(j.leads ?? []);
    setSelected(new Set());
    setLoading(false);
  }, [status, vtype, activeOnly, search]);

  useEffect(() => { void load(); const iv = setInterval(() => { void load(); }, 60000); return () => clearInterval(iv); }, [load]);

  const sorted = [...leads].sort((a, b) => {
    const av = sortVal(a, sortKey);
    const bv = sortVal(b, sortKey);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(l => l.id)));
  }

  async function bulkAction(action: 'set_status' | 'delete', newStatus?: string) {
    if (!selected.size) return;
    const ids = [...selected];
    const label = action === 'delete'
      ? `Delete ${ids.length} lead(s)? Only declined_by_us/lost leads will be removed.`
      : `Set ${ids.length} lead(s) to "${newStatus}"?`;
    if (!confirm(label)) return;
    setBulkBusy(true);
    await fetch('/api/bop/sal/sell-leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action, status: newStatus }),
    });
    setBulkBusy(false);
    void load();
  }

  const selCount = selected.size;
  const selDeletable = selCount > 0 && [...selected].every(id => {
    const l = leads.find(x => x.id === id);
    return l && DELETABLE.includes(l.status);
  });

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <ScreenHeader title="Sell Leads" description="Vehicle acquisition funnel — desmobil.com instant offer" />
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Deep search */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Deep search — ref, make, model, plate, VIN, email, phone, name, seller notes…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:bg-white" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <BopSelect value={status} onChange={v => setStatus(v)} options={STATUSES.map((s) => ({ value: String(s), label: `${s || 'All statuses'}` }))} className="min-w-[130px]" />
        <BopSelect value={vtype} onChange={v => setVtype(v)} options={VEHICLE_TYPES.map((v) => ({ value: String(v), label: `${v ? v.replace('_', ' ') : 'All types'}` }))} className="min-w-[130px]" />
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} className="accent-orange-500" />
          Active only
        </label>
        <span className="ml-auto text-[12px] text-slate-400">{leads.length} leads · SLA target 2h</span>
      </div>

      {selCount > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-4 py-2 text-[12px]">
          <span className="font-semibold text-orange-700">{selCount} selected</span>
          <span className="text-slate-300">|</span>
          {BULK_STATUSES.map(s => (
            <button key={s} onClick={() => bulkAction('set_status', s)} disabled={bulkBusy}
              className="rounded bg-white border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              → {s.replace(/_/g, ' ')}
            </button>
          ))}
          <span className="text-slate-300">|</span>
          <button onClick={() => bulkAction('delete')} disabled={bulkBusy || !selDeletable}
            className="rounded bg-red-50 border border-red-200 px-2 py-0.5 text-red-600 hover:bg-red-100 disabled:opacity-30"
            title={selDeletable ? '' : 'Only declined_by_us / lost leads can be deleted'}>
            Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-400 hover:text-slate-600">✕ Clear</button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-2 py-2.5 w-8">
                <input type="checkbox" checked={sorted.length > 0 && selected.size === sorted.length}
                  onChange={toggleAll} className="accent-orange-500" ref={el => { if (el) el.indeterminate = selCount > 0 && selCount < sorted.length; }} />
              </th>
              {COLUMNS.map(col => (
                <th key={col.key}
                  className={`px-3 py-2.5 font-semibold ${col.sortable ? 'cursor-pointer select-none hover:text-slate-600' : ''}`}
                  onClick={() => col.sortable && col.key !== 'sla' && toggleSort(col.key as SortKey)}>
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="ml-1 text-orange-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="px-3 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={13} className="px-3 py-10 text-center text-slate-400">No sell leads yet.</td></tr>
            ) : sorted.map(l => (
              <tr key={l.id}
                className={`border-b border-slate-50 transition-colors hover:bg-orange-50/40 ${selected.has(l.id) ? 'bg-orange-50/60' : ''}`}>
                <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleOne(l.id)} className="accent-orange-500" />
                </td>
                <td className="px-3 py-2.5 font-mono font-semibold text-slate-700 cursor-pointer" onClick={() => router.push(`/console/sal/sell-leads/${l.id}`)}>{l.ref}</td>
                <td className="px-3 py-2.5">{slaBadge(l.created_at, l.status)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 cursor-pointer" onClick={() => router.push(`/console/sal/sell-leads/${l.id}`)}>{new Date(l.created_at).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-3 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{l.vehicle_type?.replace('_', ' ')}</span></td>
                <td className="px-3 py-2.5 font-medium text-slate-800 cursor-pointer" onClick={() => router.push(`/console/sal/sell-leads/${l.id}`)}>{l.make} {l.model} {l.build_year ? `(${l.build_year})` : ''}</td>
                <td className="px-3 py-2.5 font-mono text-slate-500">{l.license_plate ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-600">{l.mileage_km ? Number(l.mileage_km).toLocaleString('nl-NL') : '—'}</td>
                <td className="px-3 py-2.5 capitalize text-slate-600">{l.condition ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-600">{l.asking_price_eur ? `€${Number(l.asking_price_eur).toLocaleString('nl-NL')}` : '—'}</td>
                <td className="px-3 py-2.5 font-semibold text-orange-600">{l.our_offer_eur ? `€${Number(l.our_offer_eur).toLocaleString('nl-NL')}` : '—'}</td>
                <td className="px-3 py-2.5"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[l.status] ?? ''}`}>{l.status}</span></td>
                <td className="px-3 py-2.5 text-slate-400">{l.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
