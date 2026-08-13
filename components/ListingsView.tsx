'use client';
// DESPANEL-V2 — Listings page. V1 filters (F03–F11) + columns (C01–C09) preserved,
// plus channel status (X06), Errors tab (X07), bulk (X08), saved views (X09), audit (X11).
import { useState, useEffect } from 'react';
import { type Listing } from '@/data/mock';
import { getListings, CHANNELS } from '@/lib/queries';
import { USING_MOCK } from '@/lib/supabase';
import { useScope } from '@/lib/scope-context';
import { can } from '@/lib/rbac';

const FILTERS = ['Category', 'Subcategory', 'Brand', 'Model', 'Item ID', 'Trans. Type', 'Status', 'Price', 'Date'];
const COLUMNS = ['Category', 'Subcategory', 'Brand', 'Model', 'Item ID', 'Trans. Type', 'Status', 'Price', 'Date'];
const TABS = ['All Listings', 'By Platform', 'By Status', 'By Model', 'Errors'];

export default function ListingsView() {
  const { unit, role } = useScope();
  const [tab, setTab] = useState(TABS[0]);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    let live = true;
    void getListings(unit.id).then(d => { if (live) setListings(d); });
    return () => { live = false; };
  }, [unit.id]);

  const errorCount = listings.filter(l => Object.values(l.channels).includes('error')).length;
  const rows = tab === 'Errors'
    ? listings.filter(l => Object.values(l.channels).includes('error'))
    : listings;

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Listings Management</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {unit.label} · tenant_id {unit.id} · manage &amp; distribute across channels
            {USING_MOCK && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">demo data — set .env.local for live</span>}
          </p>
        </div>
        {can(role, 'create') &&
          <button className="rounded-lg bg-des-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90">+ Add New</button>}
      </div>

      <div className="mb-3 flex items-center gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
              tab === t ? 'border-b-2 border-des-blue font-medium text-des-blue' : 'text-slate-500'}`}>
            {t}
            {t === 'Errors' && errorCount > 0 &&
              <span className="rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">{errorCount}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">Bulk Actions ▾</button>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">Saved Views ▾</button>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">Export</button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <input key={f} placeholder={f} className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs" />
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-3"><input type="checkbox" /></th>
              {COLUMNS.map(c => <th key={c} className="px-3 py-3">{c}</th>)}
              <th className="px-3 py-3">Tenant</th>
              <th className="px-3 py-3">Channels</th>
              <th className="px-3 py-3 text-center">Governance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(l => (
              <tr key={l.itemId} className="hover:bg-slate-50">
                <td className="px-3 py-3"><input type="checkbox" /></td>
                <td className="px-3 py-3 font-semibold text-slate-900">{l.category}</td>
                <td className="px-3 py-3 text-slate-400">{l.subcategory}</td>
                <td className="px-3 py-3">{l.brand}</td>
                <td className="px-3 py-3 text-slate-600">{l.model}</td>
                <td className="px-3 py-3 font-mono text-xs text-slate-400">{l.itemId}</td>
                <td className="px-3 py-3">{l.trans}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    l.status === 'Published' ? 'bg-emerald-50 text-emerald-700'
                    : l.status === 'Draft' ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-600'}`}>{l.status}</span>
                </td>
                <td className="px-3 py-3 text-right font-semibold text-slate-900">{l.price}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{l.date}</td>
                <td className="px-3 py-3 text-xs text-slate-600">{l.tenant}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    {CHANNELS.map(ch => (
                      <span key={ch} title={`${ch}: ${l.channels[ch]}`}
                        className={`h-2.5 w-2.5 rounded-full ${
                          l.channels[ch] === 'ok' ? 'bg-emerald-500'
                          : l.channels[ch] === 'pending' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  {can(role, 'view_audit')
                    ? <button className="rounded border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium hover:bg-blue-50 hover:text-des-blue">Audit Log</button>
                    : <span className="text-xs text-slate-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <span>Showing {rows.length} of 248 listings</span>
          <div className="flex gap-1">
            <button className="rounded border border-slate-200 bg-white px-2 py-1">‹</button>
            <button className="rounded border border-des-blue bg-blue-50 px-3 py-1 font-semibold text-des-blue">1</button>
            <button className="rounded border border-slate-200 bg-white px-3 py-1">2</button>
            <button className="rounded border border-slate-200 bg-white px-2 py-1">›</button>
          </div>
        </div>
      </div>
    </>
  );
}
