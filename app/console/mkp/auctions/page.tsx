'use client';
import { useState, useEffect , useCallback} from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { BopSelect } from '@/components/BopSelect';

const TYPES = ['live','online','sealed','hybrid'] as const;
const STATUSES = ['draft','scheduled','live','ended','settled','cancelled'] as const;

const TYPE_LABEL: Record<string,string> = { live:'Live', online:'Online', sealed:'Sealed bid', hybrid:'Hybrid' };
const STATUS_COLOR: Record<string,string> = {
  draft:'bg-slate-100 text-slate-500', scheduled:'bg-cyan-100 text-cyan-700',
  live:'bg-emerald-100 text-emerald-700 animate-pulse', ended:'bg-amber-100 text-amber-700',
  settled:'bg-blue-100 text-blue-700', cancelled:'bg-red-100 text-red-500',
};
const TYPE_ICON: Record<string,string> = { live:'🔨', online:'💻', sealed:'✉️', hybrid:'🔀' };

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('nl-NL', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

export default function AU001Page() {
  const router = useRouter();
  const { unit } = useScope();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState('');
  const [fType, setFType] = useState('');
  const [toast, setToast] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [nTitle, setNTitle] = useState('');
  const [nType, setNType] = useState('online');
  const [nStarts, setNStarts] = useState('');
  const [nEnds, setNEnds] = useState('');
  const [creating, setCreating] = useState(false);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set('tenant', String(unit.id));
    if (fStatus) p.set('status', fStatus);
    if (fType) p.set('type', fType);
    const j = await fetch(`/api/bop/mkp/auctions?${p}`).then(r => r.json());
    setAuctions(j.auctions ?? []);
    setLoading(false);
  }, [unit.id, fStatus, fType]);
  useEffect(() => { void load();   }, [load]);

  async function createAuction() {
    if (!nTitle.trim()) { showToast('Title required'); return; }
    setCreating(true);
    const j = await fetch('/api/bop/mkp/auctions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: unit.id, title: nTitle, type: nType, starts_at: nStarts || null, ends_at: nEnds || null }),
    }).then(r => r.json());
    setCreating(false);
    if (j.id) router.push(`/console/mkp/auctions/${j.id}`);
    else showToast(j.error || 'Create failed');
  }

  const activeFilters = fStatus || fType;

  return (
    <div className="p-6">
      <ScreenHeader title="Auction Manager" description="BOP V2 auctions, lots and bidding" />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-sm">
        <BopSelect value={fStatus} onChange={setFStatus} className="w-40"
          options={[{ value:'', label:'All statuses' }, ...STATUSES.map(s => ({ value:s, label:s }))]} />
        <BopSelect value={fType} onChange={setFType} className="w-40"
          options={[{ value:'', label:'All types' }, ...TYPES.map(t => ({ value:t, label:TYPE_LABEL[t] }))]} />
        {activeFilters && (
          <button onClick={() => { setFStatus(''); setFType(''); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors">Clear</button>
        )}
        <span className="ml-auto text-xs text-slate-400">{auctions.length} auctions</span>
        <button onClick={() => setShowNew(true)}
          className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700">+ New auction</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Auction</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Lots</th>
              <th className="px-3 py-3">Starts</th>
              <th className="px-3 py-3">Ends</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : auctions.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No auctions. Click “+ New auction” to create one.</td></tr>
            ) : auctions.map(a => (
              <tr key={a.id} onClick={() => router.push(`/console/mkp/auctions/${a.id}`)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{TYPE_ICON[a.type]} {a.title}</div>
                  {a.buyer_premium_pct > 0 && <div className="text-xs text-slate-400">{a.buyer_premium_pct}% buyer premium</div>}
                </td>
                <td className="px-3 py-3 text-slate-600">{TYPE_LABEL[a.type] ?? a.type}</td>
                <td className="px-3 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[a.status] ?? 'bg-slate-100 text-slate-500'}`}>{a.status}</span></td>
                <td className="px-3 py-3"><span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{a.lot_count}</span></td>
                <td className="px-3 py-3 text-xs text-slate-500">{fmtDate(a.starts_at)}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{fmtDate(a.ends_at)}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{a.location ?? '—'}{a.country ? ` (${a.country})` : ''}</td>
                <td className="px-3 py-3 text-right"><span className="text-xs font-medium text-amber-600">Manage →</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-900">New auction</h2>
            <div className="space-y-4">
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Title</label>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" value={nTitle} onChange={e => setNTitle(e.target.value)} placeholder="Spring Commercial Vehicle Auction" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Type</label>
                <BopSelect size="md" value={nType} onChange={setNType} options={TYPES.map(t => ({ value:t, label:TYPE_LABEL[t] }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-500">Starts</label>
                  <input type="datetime-local" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={nStarts} onChange={e => setNStarts(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-500">Ends</label>
                  <input type="datetime-local" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={nEnds} onChange={e => setNEnds(e.target.value)} /></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { void createAuction(); }} disabled={creating}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">{creating ? 'Creating…' : 'Create & manage'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
