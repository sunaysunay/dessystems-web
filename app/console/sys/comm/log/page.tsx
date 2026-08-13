'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';
import { useScope } from '@/lib/scope-context';
import { ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

type SortKey = 'created_at' | 'tenant_id' | 'module' | 'to_email' | 'to_name' | 'subject' | 'status' | 'sent_at' | 'provider_message_id';
type SortDir = 'asc' | 'desc';

const STATUS_COLOR: Record<string, string> = {
  sent: 'bg-emerald-100 text-emerald-700', failed: 'bg-red-100 text-red-600',
  scheduled: 'bg-blue-100 text-blue-700', draft: 'bg-slate-100 text-slate-400',
};

const ALL_STATUSES = ['', 'sent', 'failed', 'scheduled', 'draft'];
const ALL_MODULES = ['', 'appointment', 'vehicle', 'contact', 'lead', 'invoice', 'rental'];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function cmp(a: any, b: any, key: SortKey): number {
  const av = a[key] ?? '';
  const bv = b[key] ?? '';
  if (key === 'tenant_id') return Number(av) - Number(bv);
  if (key === 'created_at' || key === 'sent_at') return String(av).localeCompare(String(bv));
  return String(av).localeCompare(String(bv));
}

export default function CM003Page() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const { unit } = useScope();
  const [tid, setTid] = useState<string>('');
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    setTid(String(unit.id));
    void fetch('/api/bop/sys/tenant-config').then(r => r.json()).then(j => setTenants(j.tenants ?? []));
  }, [unit.id]);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const url = tid ? `/api/bop/comm/history?tenant=${tid}` : '/api/bop/comm/history';
    void fetch(url).then(r => r.json()).then(j => {
      setLoading(false);
      if (j.error) { setError(j.error); setRows([]); return; }
      setRows(j.history ?? []);
    });
  }, [tid]);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (moduleFilter && r.module !== moduleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${r.to_email ?? ''} ${r.to_name ?? ''} ${r.subject ?? ''} ${r.provider_message_id ?? ''} ${r.record_id ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const c = cmp(a, b, sortKey);
    return sortDir === 'asc' ? c : -c;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'created_at' || key === 'sent_at' ? 'desc' : 'asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-slate-300 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-500 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 text-blue-500 ml-1 inline" />;
  }

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <ScreenHeader title="Communication Log" description="Every bop_comm_* send, cross-module — CM003" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="w-56">
            <BopSelect value={tid} onChange={setTid}
              options={[{ value: '', label: 'All tenants' }, ...tenants.map(t => ({ value: String(t.tenant_id), label: `${t.name ?? t.tenant_id} (${t.tenant_id})` }))]} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input type="text" placeholder="Search email, name, subject, message ID…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 outline-none focus:border-blue-400 min-w-[260px]" />
        <BopSelect value={moduleFilter} onChange={v => setModuleFilter(v)}
          options={ALL_MODULES.map(s => ({ value: s, label: s || 'All modules' }))} className="min-w-[130px]" />
        <BopSelect value={statusFilter} onChange={v => setStatusFilter(v)}
          options={ALL_STATUSES.map(s => ({ value: s, label: s || 'All statuses' }))} className="min-w-[130px]" />
        <span className="ml-auto text-[12px] text-slate-400">{sorted.length} of {rows.length} entries</span>
      </div>

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        {loading ? (
          <p className="px-6 py-10 text-sm text-slate-400 text-center">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="px-6 py-10 text-sm text-slate-400 text-center">No entries found{tid ? ' for this tenant' : ''}.</p>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('created_at')}>
                  When <SortIcon col="created_at" />
                </th>
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('sent_at')}>
                  Sent At <SortIcon col="sent_at" />
                </th>
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('tenant_id')}>
                  Tenant <SortIcon col="tenant_id" />
                </th>
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('module')}>
                  Module <SortIcon col="module" />
                </th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Category</th>
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('to_email')}>
                  To <SortIcon col="to_email" />
                </th>
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('to_name')}>
                  Name <SortIcon col="to_name" />
                </th>
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('subject')}>
                  Subject <SortIcon col="subject" />
                </th>
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Record ID</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Brand</th>
                <th className="px-3 py-2.5 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('provider_message_id')}>
                  Provider Msg ID <SortIcon col="provider_message_id" />
                </th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Opened</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Clicked</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Scheduled</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map(r => (
                <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.sent_at)}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.tenant_id}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">{r.module ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">
                    {r.bop_comm_template?.category ?? '—'}
                    {r.bop_comm_template?.locale && <span className="text-slate-300 ml-1">({r.bop_comm_template.locale})</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{r.to_email ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.to_name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-700 max-w-[280px] truncate" title={r.subject}>{r.subject ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-400'}`}>{r.status ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400 max-w-[100px] truncate" title={r.record_id}>{r.record_id ? r.record_id.slice(0, 8) + '…' : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{r.brand_id ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400 max-w-[160px] truncate" title={r.provider_message_id}>{r.provider_message_id ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.opened_at)}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.clicked_at)}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(r.scheduled_for)}</td>
                  <td className="px-3 py-2.5">
                    {r.missing_vars?.length > 0 && <span className="mr-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">missing {r.missing_vars.length}</span>}
                    {r.quality_flags?.length > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">⚠ {r.quality_flags.length}</span>}
                    {!(r.missing_vars?.length > 0) && !(r.quality_flags?.length > 0) && <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
