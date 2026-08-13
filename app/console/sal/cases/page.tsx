'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-700',
  quotation: 'bg-blue-100 text-blue-700',
  order: 'bg-indigo-100 text-indigo-700',
  invoiced: 'bg-amber-100 text-amber-700',
  handover: 'bg-orange-100 text-orange-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  warranty: 'bg-teal-100 text-teal-700',
};

export default function CaseListPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blFilter, setBlFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (blFilter) p.set('business_line', blFilter);
    const j = await fetch(`/api/bop/sal/cases?${p}`).then(r => r.json());
    setCases(j.cases ?? []);
    setLoading(false);
  }, [search, blFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <ScreenHeader title="Cases" description="TR000 — Trade flow cases with derived lifecycle stage" />

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800"
          placeholder="Search case number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          value={blFilter}
          onChange={e => setBlFilter(e.target.value)}
        >
          <option value="">All business lines</option>
          <option value="vehicle_sale">Vehicle Sale</option>
          <option value="camper_conversion">Camper Conversion</option>
          <option value="rental">Rental</option>
          <option value="ecommerce">E-Commerce</option>
          <option value="sourcing">Sourcing</option>
        </select>
        <span className="ml-auto text-xs text-slate-400">{cases.length} cases</span>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : cases.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">No cases found</div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2">Case #</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Business Line</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Language</th>
                <th className="px-4 py-2">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {cases.map(c => (
                <tr key={c.id} onClick={() => router.push(`/console/sal/cases/${c.id}`)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{c.case_number}</td>
                  <td className="px-4 py-2.5 text-xs">{c.mdm_business_partners?.company_name || c.mdm_business_partners?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{(c.business_line ?? '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STAGE_COLORS[c.derived_stage] ?? 'bg-slate-100 text-slate-600'}`}>
                      {c.derived_stage}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{c.owner ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 uppercase">{c.language}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{c.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
