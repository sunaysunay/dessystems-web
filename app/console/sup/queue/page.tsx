'use client';
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { useRouter } from 'next/navigation';
import type { Case, CaseStatus, CasePriority } from '@/lib/support/types';

const STATUS_CHIP: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', triage: 'bg-indigo-100 text-indigo-700',
  assigned: 'bg-purple-100 text-purple-700', in_progress: 'bg-amber-100 text-amber-700',
  waiting_customer: 'bg-teal-100 text-teal-700', waiting_provider: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-500',
  reopened: 'bg-red-100 text-red-600', cancelled: 'bg-slate-200 text-slate-400',
};
const PRI_CHIP: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${Math.max(1, m)}m ago`;
}

export default function SU001Page() {
  useScope();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [search, setSearch] = useState('');

  const loadCases = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);
    if (search.trim()) params.set('q', search.trim());
    fetch(`/api/bop/support/queue?${params}`)
      .then(r => r.json())
      .then(j => { setCases(j.cases ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filterStatus, filterPriority, search]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const filtered = cases;
  const openCount = cases.filter(c => !['closed', 'cancelled', 'resolved'].includes(c.status)).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <ScreenHeader title="Support Queue" description="SU001 — Inbound support cases" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{openCount} open / {cases.length} total</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-1.5 text-sm w-64"
            placeholder="Search subject or case number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="border rounded px-2 py-1.5 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_CHIP).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select className="border rounded px-2 py-1.5 text-sm" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            {['low', 'normal', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={loadCases} className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm hover:bg-teal-700">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading cases...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No cases found</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-xs text-slate-500 uppercase">
              <th className="py-2 px-3">Case #</th>
              <th className="py-2 px-3">Subject</th>
              <th className="py-2 px-3">Channel</th>
              <th className="py-2 px-3">Priority</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3">Created</th>
              <th className="py-2 px-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr
                key={c.id}
                className="border-b hover:bg-slate-50 cursor-pointer"
                onClick={() => router.push(`/console/sup/cases/${c.request_no}`)}
              >
                <td className="py-2 px-3 font-mono text-xs">{c.case_number || c.request_no}</td>
                <td className="py-2 px-3 max-w-[300px] truncate">{c.subject}</td>
                <td className="py-2 px-3">
                  <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{c.channel_kind}</span>
                </td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${PRI_CHIP[c.priority] || ''}`}>{c.priority}</span>
                </td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_CHIP[c.status] || ''}`}>{c.status.replace(/_/g, ' ')}</span>
                </td>
                <td className="py-2 px-3 text-xs text-slate-500">{c.category}</td>
                <td className="py-2 px-3 text-xs text-slate-400">{timeAgo(c.created_at)}</td>
                <td className="py-2 px-3 text-xs text-slate-400">{timeAgo(c.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
