'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Calendar, Clock, User, Phone, Mail, Link as LinkIcon, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type InspType = 'quick_check' | 'professional' | 'export';
type SortKey = 'ref' | 'date' | 'inspection_type' | 'name' | 'status';
type SortDir = 'asc' | 'desc';

interface Appt {
  id: string; ref: string; date: string; time_slot: string;
  inspection_type: InspType; vehicle_url: string | null; vin: string | null;
  name: string; email: string | null; phone: string | null; message: string | null;
  status: Status; locale: string; source: string | null; internal_notes: string | null;
  confirmed_at: string | null; completed_at: string | null; created_at: string;
}

const STATUS_COLORS: Record<Status, { bg: string; text: string }> = {
  pending:   { bg: '#fef3c7', text: '#92400e' },
  confirmed: { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280' },
  no_show:   { bg: '#fee2e2', text: '#991b1b' },
};

const TYPE_LABELS: Record<InspType, string> = {
  quick_check: 'Quick Check',
  professional: 'Professional',
  export: 'Dealer/Export',
};

const ALL_STATUSES: Status[] = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const ALL_TYPES: InspType[] = ['quick_check', 'professional', 'export'];

const STATUS_ORDER: Record<Status, number> = { pending: 0, confirmed: 1, completed: 2, cancelled: 3, no_show: 4 };

function compare(a: Appt, b: Appt, key: SortKey): number {
  switch (key) {
    case 'ref': return a.ref.localeCompare(b.ref);
    case 'date': {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : String(a.time_slot).localeCompare(String(b.time_slot));
    }
    case 'inspection_type': return (a.inspection_type ?? '').localeCompare(b.inspection_type ?? '');
    case 'name': return a.name.localeCompare(b.name);
    case 'status': return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    default: return 0;
  }
}

export default function Page() {
  const [data, setData] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [emailPrompt, setEmailPrompt] = useState<{ id: string; status: Status } | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('inspection_type', typeFilter);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/bop/sal/appointments?${params}`);
      const json = await res.json();
      setData(json.appointments ?? []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, q]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...data].sort((a, b) => {
    const c = compare(a, b, sortKey);
    const primary = sortDir === 'asc' ? c : -c;
    if (primary !== 0) return primary;
    // Secondary sort: date descending when primary is status
    if (sortKey === 'status') {
      const d = compare(a, b, 'date');
      return -d; // descending
    }
    return 0;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-slate-300 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-500 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 text-blue-500 ml-1 inline" />;
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(a => a.id)));
  }

  async function bulkUpdateStatus(status: Status) {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkSaving(true);
    try {
      await fetch('/api/bop/sal/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      setData(prev => prev.map(a => ids.includes(a.id) ? { ...a, status } : a));
      setSelected(new Set());
    } finally {
      setBulkSaving(false);
    }
  }

  function requestDelete() {
    const ids = [...selected];
    const allNoShow = ids.every(id => data.find(a => a.id === id)?.status === 'no_show');
    if (!allNoShow) return;
    setDeletePrompt(ids);
  }

  async function confirmDelete() {
    if (!deletePrompt?.length) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/bop/sal/appointments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deletePrompt }),
      });
      if (res.ok) {
        setData(prev => prev.filter(a => !deletePrompt.includes(a.id)));
        setSelected(new Set());
      }
    } finally {
      setDeleting(false);
      setDeletePrompt(null);
    }
  }

  function handleStatusClick(id: string, status: Status) {
    if (status === 'confirmed' || status === 'cancelled') {
      setEmailPrompt({ id, status });
    } else {
      doUpdateStatus(id, status, false);
    }
  }

  async function doUpdateStatus(id: string, status: Status, sendEmail: boolean) {
    setSaving(id);
    setEmailPrompt(null);
    try {
      await fetch(`/api/bop/sal/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, send_email: sendEmail }),
      });
      setData(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } finally {
      setSaving(null);
    }
  }

  async function saveNotes(id: string) {
    setSaving(id + '_notes');
    try {
      await fetch(`/api/bop/sal/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: editNotes[id] ?? '' }),
      });
      setData(prev => prev.map(a => a.id === id ? { ...a, internal_notes: editNotes[id] ?? null } : a));
    } finally {
      setSaving(null);
    }
  }

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = data.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<Status, number>);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="mt-0.5 text-sm text-slate-500">DESMobil inspection booking requests · SA007</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {ALL_STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className="rounded-full border px-3 py-1 text-xs font-semibold transition-all"
            style={{
              background: statusFilter === s ? STATUS_COLORS[s].bg : '#f8fafc',
              borderColor: statusFilter === s ? 'transparent' : '#e2e8f0',
              color: statusFilter === s ? STATUS_COLORS[s].text : '#64748b',
            }}>
            {s.replace(/_/g, ' ')} {counts[s] > 0 && <span className="ml-0.5">({counts[s]})</span>}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 mb-4">
          <span className="text-sm font-semibold text-blue-700">{selected.size} selected</span>
          <span className="text-xs text-blue-400">|</span>
          <span className="text-xs text-slate-500">Change status to:</span>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => bulkUpdateStatus(s)} disabled={bulkSaving}
              className="rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: STATUS_COLORS[s].bg, borderColor: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].text }}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
          {[...selected].every(id => data.find(a => a.id === id)?.status === 'no_show') && (
            <>
              <span className="text-xs text-blue-400">|</span>
              <button onClick={requestDelete} disabled={bulkSaving}
                className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border-red-100 hover:bg-red-200 transition-all disabled:opacity-50">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Clear</button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white mb-4">
        <div className="flex flex-wrap items-center gap-3 p-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="Search name, email, ref, VIN, URL…"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm w-full focus:outline-none focus:border-blue-400" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 bg-white">
            <option value="">All types</option>
            {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <span className="text-xs text-slate-400">{data.length} rows</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-3 py-2.5 text-left w-10">
                  <input type="checkbox" checked={selected.size > 0 && selected.size === sorted.length}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5" />
                </th>
                <th className="px-4 py-2.5 text-left w-32 cursor-pointer select-none" onClick={() => toggleSort('ref')}>
                  Ref <SortIcon col="ref" />
                </th>
                <th className="px-4 py-2.5 text-left cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  Date / Time <SortIcon col="date" />
                </th>
                <th className="px-4 py-2.5 text-left cursor-pointer select-none" onClick={() => toggleSort('inspection_type')}>
                  Type <SortIcon col="inspection_type" />
                </th>
                <th className="px-4 py-2.5 text-left cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  Customer <SortIcon col="name" />
                </th>
                <th className="px-4 py-2.5 text-left cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="px-4 py-2.5 text-left">Vehicle</th>
                <th className="px-4 py-2.5 text-left w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No appointments found.</td></tr>
              ) : sorted.map(appt => (
                <>
                  <tr key={appt.id}
                    className={`cursor-pointer ${appt.status === 'pending' ? 'bg-slate-100/70 hover:bg-slate-100' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(appt.id)}
                        onChange={() => toggleSelect(appt.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5" />
                    </td>
                    <td className="px-4 py-3" onClick={() => { setExpanded(expanded === appt.id ? null : appt.id); if (expanded !== appt.id) setEditNotes(prev => ({ ...prev, [appt.id]: appt.internal_notes ?? '' })); }}>
                      <span className="font-mono text-xs text-slate-600">{appt.ref}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={() => { setExpanded(expanded === appt.id ? null : appt.id); if (expanded !== appt.id) setEditNotes(prev => ({ ...prev, [appt.id]: appt.internal_notes ?? '' })); }}>
                      <div className="font-semibold text-slate-800">{String(appt.time_slot).slice(0, 5)} <span className="font-normal text-slate-600">{appt.date.split('-').reverse().join('-')}</span></div>
                    </td>
                    <td className="px-4 py-3" onClick={() => { setExpanded(expanded === appt.id ? null : appt.id); if (expanded !== appt.id) setEditNotes(prev => ({ ...prev, [appt.id]: appt.internal_notes ?? '' })); }}>
                      <span className="text-xs font-semibold text-slate-700">{TYPE_LABELS[appt.inspection_type] ?? appt.inspection_type}</span>
                    </td>
                    <td className="px-4 py-3" onClick={() => { setExpanded(expanded === appt.id ? null : appt.id); if (expanded !== appt.id) setEditNotes(prev => ({ ...prev, [appt.id]: appt.internal_notes ?? '' })); }}>
                      <div className="font-medium text-slate-800">{appt.name}</div>
                      <div className="text-xs text-slate-400">{appt.email ?? appt.phone ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3" onClick={() => { setExpanded(expanded === appt.id ? null : appt.id); if (expanded !== appt.id) setEditNotes(prev => ({ ...prev, [appt.id]: appt.internal_notes ?? '' })); }}>
                      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: STATUS_COLORS[appt.status]?.bg ?? '#f3f4f6', color: STATUS_COLORS[appt.status]?.text ?? '#374151' }}>
                        {appt.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" onClick={() => { setExpanded(expanded === appt.id ? null : appt.id); if (expanded !== appt.id) setEditNotes(prev => ({ ...prev, [appt.id]: appt.internal_notes ?? '' })); }}>
                      {appt.vehicle_url ? (
                        <a href={appt.vehicle_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          onClick={e => e.stopPropagation()}>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{appt.vehicle_url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400" onClick={() => { setExpanded(expanded === appt.id ? null : appt.id); if (expanded !== appt.id) setEditNotes(prev => ({ ...prev, [appt.id]: appt.internal_notes ?? '' })); }}>
                      {expanded === appt.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expanded === appt.id && (
                    <tr key={appt.id + '_detail'}>
                      <td colSpan={8} className="bg-slate-50 border-t border-b border-slate-200 px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left: details */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Appointment Details</h3>
                            <div className="flex items-center gap-2 text-sm"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>{String(appt.time_slot).slice(0, 5)} {appt.date.split('-').reverse().join('-')}</span></div>
                            <div className="flex items-center gap-2 text-sm"><User className="h-3.5 w-3.5 text-slate-400 shrink-0" /><span>{appt.name}</span></div>
                            {appt.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /><a href={`mailto:${appt.email}`} className="text-blue-600 hover:underline">{appt.email}</a></div>}
                            {appt.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /><a href={`tel:${appt.phone}`} className="text-blue-600 hover:underline">{appt.phone}</a></div>}
                            {appt.vehicle_url && <div className="flex items-start gap-2 text-sm"><LinkIcon className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" /><a href={appt.vehicle_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{appt.vehicle_url}</a></div>}
                            {appt.vin && <div className="text-sm"><span className="font-semibold text-slate-500">VIN: </span><span className="font-mono">{appt.vin}</span></div>}
                            {appt.message && <div className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-200 italic">"{appt.message}"</div>}
                            <div className="text-xs text-slate-400 pt-1">
                              Locale: {appt.locale} · Source: {appt.source ?? '—'} · Created: {new Date(appt.created_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}
                            </div>
                          </div>

                          {/* Right: status + notes */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Update Status</h3>
                              <div className="flex flex-wrap gap-2">
                                {ALL_STATUSES.map(s => (
                                  <button key={s}
                                    disabled={saving === appt.id || appt.status === s}
                                    onClick={() => handleStatusClick(appt.id, s)}
                                    className="rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:opacity-50"
                                    style={{
                                      background: appt.status === s ? STATUS_COLORS[s].bg : '#fff',
                                      borderColor: STATUS_COLORS[s].bg,
                                      color: appt.status === s ? STATUS_COLORS[s].text : '#64748b',
                                    }}>
                                    {s.replace(/_/g, ' ')}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Internal Notes</h3>
                              <textarea rows={3} value={editNotes[appt.id] ?? ''} onChange={e => setEditNotes(prev => ({ ...prev, [appt.id]: e.target.value }))}
                                placeholder="Inspector notes, confirmations, reminders…"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white" />
                              <button onClick={() => saveNotes(appt.id)} disabled={saving === appt.id + '_notes'}
                                className="mt-2 rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
                                {saving === appt.id + '_notes' ? 'Saving…' : 'Save Notes'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email confirmation popup */}
      {emailPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEmailPrompt(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-[360px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Send Confirmation Email?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Status will be changed to <span className="font-semibold" style={{ color: STATUS_COLORS[emailPrompt.status]?.text }}>{emailPrompt.status.replace(/_/g, ' ')}</span>.
              Do you want to send a notification email to the customer?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => doUpdateStatus(emailPrompt.id, emailPrompt.status, false)}
                className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                No
              </button>
              <button onClick={() => doUpdateStatus(emailPrompt.id, emailPrompt.status, true)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                Yes, Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation popup */}
      {deletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDeletePrompt(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-[400px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Delete {deletePrompt.length} Appointment{deletePrompt.length > 1 ? 's' : ''}?</h3>
            <p className="text-xs text-slate-500 mb-2">
              This will permanently delete the selected no-show appointment{deletePrompt.length > 1 ? 's' : ''} and all related records from the database.
            </p>
            <div className="mb-4 max-h-[120px] overflow-y-auto rounded-lg border border-red-100 bg-red-50 px-3 py-2">
              {deletePrompt.map(id => {
                const a = data.find(x => x.id === id);
                return (
                  <div key={id} className="text-xs text-red-700 py-0.5">
                    <span className="font-mono font-semibold">{a?.ref ?? '—'}</span>
                    <span className="text-red-500 ml-2">{a?.name ?? '—'}</span>
                    <span className="text-red-400 ml-1">({a?.date ?? ''})</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs font-semibold text-red-600 mb-4">This action cannot be undone.</p>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setDeletePrompt(null)}
                className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
