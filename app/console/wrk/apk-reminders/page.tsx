'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { Kpi } from '@/components/CockpitKit';

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface Reminder {
  id: string;
  vehicle_id: string;
  customer_id: string;
  apk_expiry: string;
  reminder_sent_at: string | null;
  campaign_id: string | null;
  channel: string;
  status: string;
  created_at: string;
}

interface KpiData {
  expiring_this_month: number;
  expiring_next_month: number;
  reminders_sent: number;
  booked: number;
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Sent', value: 'sent' },
  { label: 'Booked', value: 'booked' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
];

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-purple-50 text-purple-600',
  sent:      'bg-blue-50 text-blue-600',
  booked:    'bg-emerald-50 text-emerald-600',
  expired:   'bg-red-50 text-red-600',
  cancelled: 'bg-slate-200 text-slate-500',
};

const CHANNEL_COLOR: Record<string, string> = {
  email:    'bg-sky-50 text-sky-600',
  sms:      'bg-amber-50 text-amber-600',
  whatsapp: 'bg-green-50 text-green-600',
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function shortId(uuid: string) {
  return uuid.slice(0, 8);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function expiryUrgency(iso: string): 'red' | 'amber' | 'green' {
  const diff = (new Date(iso).getTime() - Date.now()) / 86_400_000;
  if (diff < 14) return 'red';
  if (diff < 30) return 'amber';
  return 'green';
}

const URGENCY_CLASS: Record<string, string> = {
  red:   'text-red-600 font-bold',
  amber: 'text-amber-600 font-semibold',
  green: 'text-slate-700',
};

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function ApkRemindersPage() {
  const [rows, setRows] = useState<Reminder[]>([]);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const [search, setSearch] = useState('');

  // Panels
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Add form
  const [addVehicle, setAddVehicle] = useState('');
  const [addCustomer, setAddCustomer] = useState('');
  const [addExpiry, setAddExpiry] = useState('');
  const [addChannel, setAddChannel] = useState('email');

  // Import
  const [importJson, setImportJson] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  /* ── Data loading ────────────────────────────────────────────────────────── */

  function loadKpi() {
    fetch('/api/bop/wrk/apk-reminders?view=kpi')
      .then(r => r.json())
      .then(setKpi)
      .catch(() => {});
  }

  function loadReminders() {
    setLoading(true);
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(pageSize));
    if (statusFilter) p.set('status', statusFilter);
    if (expiryFrom) p.set('expiry_after', expiryFrom);
    if (expiryTo) p.set('expiry_before', expiryTo);
    if (search) p.set('search', search);
    fetch(`/api/bop/wrk/apk-reminders?${p}`)
      .then(r => r.json())
      .then(j => { setRows(j.data ?? []); setTotal(j.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadKpi(); }, []);
  useEffect(() => { loadReminders(); }, [page, statusFilter, expiryFrom, expiryTo]);

  /* ── Actions ─────────────────────────────────────────────────────────────── */

  function sendReminder(id: string) {
    fetch('/api/bop/wrk/apk-reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'sent', reminder_sent_at: new Date().toISOString() }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { showToast(`Error: ${j.error}`); return; }
        showToast('Reminder sent');
        loadReminders();
        loadKpi();
      });
  }

  function markBooked(id: string) {
    fetch('/api/bop/wrk/apk-reminders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'booked' }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { showToast(`Error: ${j.error}`); return; }
        showToast('Marked as booked');
        loadReminders();
        loadKpi();
      });
  }

  function addReminder() {
    if (!addVehicle || !addCustomer || !addExpiry) { showToast('Fill all fields'); return; }
    fetch('/api/bop/wrk/apk-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_id: addVehicle, customer_id: addCustomer, apk_expiry: addExpiry, channel: addChannel }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { showToast(`Error: ${j.error}`); return; }
        showToast('Reminder added');
        setShowAdd(false);
        setAddVehicle(''); setAddCustomer(''); setAddExpiry(''); setAddChannel('email');
        loadReminders();
        loadKpi();
      });
  }

  function bulkImport() {
    let items;
    try { items = JSON.parse(importJson); } catch { showToast('Invalid JSON'); return; }
    if (!Array.isArray(items) || items.length === 0) { showToast('Provide a non-empty array'); return; }
    fetch('/api/bop/wrk/apk-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_import', items }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { showToast(`Error: ${j.error}`); return; }
        showToast(`Imported ${j.imported} reminders`);
        setShowImport(false);
        setImportJson('');
        loadReminders();
        loadKpi();
      });
  }

  function sendAllPending() {
    if (!confirm('Send reminders to all pending entries?')) return;
    fetch('/api/bop/wrk/apk-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_send' }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.error) { showToast(`Error: ${j.error}`); return; }
        showToast(`Sent ${j.sent} reminders`);
        loadReminders();
        loadKpi();
      });
  }

  const totalPages = Math.ceil(total / pageSize);

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="p-6 space-y-4">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <ScreenHeader />

      {/* KPI Row */}
      {kpi && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Expiring This Month" value={kpi.expiring_this_month} />
          <Kpi label="Expiring Next Month" value={kpi.expiring_next_month} />
          <Kpi label="Reminders Sent" value={kpi.reminders_sent} />
          <Kpi label="Booked" value={kpi.booked} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setShowAdd(!showAdd); setShowImport(false); }}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm">
          + Add Reminder
        </button>
        <button onClick={() => { setShowImport(!showImport); setShowAdd(false); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          Bulk Import
        </button>
        <button onClick={sendAllPending}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          Send All Pending
        </button>
        <button onClick={() => { loadReminders(); loadKpi(); showToast('Refreshed'); }}
          className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          Refresh
        </button>
      </div>

      {/* Add Reminder Inline Form */}
      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">New APK Reminder</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="text" placeholder="Vehicle ID (UUID)" value={addVehicle}
              onChange={e => setAddVehicle(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
            <input type="text" placeholder="Customer ID (UUID)" value={addCustomer}
              onChange={e => setAddCustomer(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
            <input type="date" value={addExpiry}
              onChange={e => setAddExpiry(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none" />
            <select value={addChannel} onChange={e => setAddChannel(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <div className="flex gap-2">
              <button onClick={addReminder}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                Save
              </button>
              <button onClick={() => setShowAdd(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Panel */}
      {showImport && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Bulk Import (JSON)</div>
          <p className="text-xs text-slate-500">
            Paste a JSON array: [{'{'}&quot;vehicle_id&quot;:&quot;...&quot;, &quot;customer_id&quot;:&quot;...&quot;, &quot;apk_expiry&quot;:&quot;2026-12-31&quot;{'}'}]
          </p>
          <textarea value={importJson} onChange={e => setImportJson(e.target.value)}
            rows={5} placeholder='[{"vehicle_id":"...","customer_id":"...","apk_expiry":"2026-12-31"}]'
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={bulkImport}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
              Import
            </button>
            <button onClick={() => setShowImport(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status Tabs + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {STATUS_TABS.map(t => (
            <button key={t.value} onClick={() => { setStatusFilter(t.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === t.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input type="date" value={expiryFrom} onChange={e => { setExpiryFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-400 focus:outline-none"
            title="Expiry from" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={expiryTo} onChange={e => { setExpiryTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-400 focus:outline-none"
            title="Expiry to" />
          <input type="text" placeholder="Vehicle / Customer ID" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); loadReminders(); } }}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-52" />
          <span className="text-xs text-slate-400">{total} records</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No reminders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">APK Expiry</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehicle</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Channel</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sent At</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(r => {
                  const urgency = expiryUrgency(r.apk_expiry);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`px-4 py-2.5 text-xs ${URGENCY_CLASS[urgency]}`}>
                        {fmtDate(r.apk_expiry)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{shortId(r.vehicle_id)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{shortId(r.customer_id)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${CHANNEL_COLOR[r.channel] ?? 'bg-slate-100 text-slate-500'}`}>
                          {r.channel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {r.reminder_sent_at ? fmtDate(r.reminder_sent_at) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          {r.status === 'pending' && (
                            <button onClick={() => sendReminder(r.id)}
                              className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">
                              Send Reminder
                            </button>
                          )}
                          {r.status === 'sent' && (
                            <button onClick={() => markBooked(r.id)}
                              className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100">
                              Mark Booked
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Prev
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
