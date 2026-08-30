'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface ApprovalItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  recommended: boolean;
}

interface Approval {
  id: string;
  work_order_id: string;
  token: string;
  status: string;
  items: ApprovalItem[];
  total_amount: number;
  customer_response: string | null;
  signature_data: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  wrk_orders: { wo_number: string } | null;
}

interface WO { id: string; wo_number: string; status: string }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const statusBadgeMap: Record<string, string> = {
  pending: 'pending',
  approved: 'active',
  partially_approved: 'warning',
  rejected: 'error',
  expired: 'cancelled',
};

/* ── Columns ───────────────────────────────────────────────────────────────── */

const columns: Column<Approval>[] = [
  {
    key: 'created_at', header: 'Date', width: '120px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.created_at)}</span>,
    value: (r) => r.created_at ?? '',
  },
  {
    key: 'wo_number', header: 'WO Number', width: '130px', sortable: true,
    render: (r) => <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{r.wrk_orders?.wo_number ?? '—'}</span>,
    value: (r) => r.wrk_orders?.wo_number ?? '',
  },
  {
    key: 'items_count', header: 'Items', width: '70px', align: 'center',
    render: (r) => <span className="text-xs">{Array.isArray(r.items) ? r.items.length : 0}</span>,
    value: (r) => Array.isArray(r.items) ? r.items.length : 0,
  },
  {
    key: 'total_amount', header: 'Total', width: '110px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{fmtEur(r.total_amount)}</span>,
    value: (r) => r.total_amount ?? 0,
  },
  {
    key: 'status', header: 'Status', width: '130px', sortable: true,
    render: (r) => <StatusBadge status={statusBadgeMap[r.status] ?? 'draft'} label={r.status.replace(/_/g, ' ')} />,
    value: (r) => r.status ?? '',
  },
  {
    key: 'customer_response', header: 'Response', width: '160px',
    render: (r) => <span className="text-xs text-slate-500 truncate block max-w-[150px]">{r.customer_response ?? '—'}</span>,
  },
  {
    key: 'responded_at', header: 'Responded', width: '120px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.responded_at)}</span>,
    value: (r) => r.responded_at ?? '',
  },
  {
    key: 'actions', header: '', width: '90px',
    render: (r) => <CopyLinkButton token={r.token} />,
  },
];

/* ── Copy link button ──────────────────────────────────────────────────────── */

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/approve/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy(); }}
      className="text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}

/* ── KPI card ──────────────────────────────────────────────────────────────── */

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex-1 min-w-[140px]">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

/* ── Create form ───────────────────────────────────────────────────────────── */

function CreateApprovalForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [workOrders, setWorkOrders] = useState<WO[]>([]);
  const [selectedWO, setSelectedWO] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0, recommended: true }]);
  const [expiryDays, setExpiryDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/bop/wrk/orders?limit=100')
      .then(r => r.json())
      .then(d => setWorkOrders(d.data ?? []))
      .catch(() => {});
  }, []);

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, recommended: true }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: string | number | boolean) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function handleSubmit() {
    if (!selectedWO) { setError('Select a work order'); return; }
    if (items.some(i => !i.description || i.quantity <= 0 || i.unit_price <= 0)) {
      setError('All items need description, quantity, and unit price');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/bop/wrk/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_id: selectedWO,
          items,
          expires_at: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create approval');
    } finally {
      setSubmitting(false);
    }
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Create Approval Request</h3>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded p-2">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Work Order</label>
          <select
            value={selectedWO}
            onChange={e => setSelectedWO(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
          >
            <option value="">Select work order...</option>
            {workOrders.map(wo => (
              <option key={wo.id} value={wo.id}>{wo.wo_number}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expires in (days)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={expiryDays}
            onChange={e => setExpiryDays(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Line Items</label>
          <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700">+ Add item</button>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <input
              placeholder="Description"
              value={item.description}
              onChange={e => updateItem(idx, 'description', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              min={1}
              placeholder="Qty"
              value={item.quantity}
              onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
              className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Price"
              value={item.unit_price || ''}
              onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
            />
            <label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap pt-2">
              <input
                type="checkbox"
                checked={item.recommended}
                onChange={e => updateItem(idx, 'recommended', e.target.checked)}
                className="rounded"
              />
              Rec.
            </label>
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 pt-2 text-sm">x</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="text-sm font-medium">Total: {fmtEur(total)}</span>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Approval Request'}
        </button>
      </div>
    </div>
  );
}

/* ── Filter tabs ───────────────────────────────────────────────────────────── */

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'partially_approved', label: 'Partially Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired', label: 'Expired' },
];

/* ── Main page ─────────────────────────────────────────────────────────────── */

export default function CustomerApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [total, setTotal] = useState(0);

  function loadData() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    qs.set('limit', '100');
    fetch(`/api/bop/wrk/approvals?${qs}`)
      .then(r => r.json())
      .then(d => {
        setApprovals(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [statusFilter]);

  // KPI calculations
  const pending = approvals.filter(a => a.status === 'pending').length;
  const approved = approvals.filter(a => a.status === 'approved' || a.status === 'partially_approved').length;
  const rejected = approvals.filter(a => a.status === 'rejected').length;

  const respondedApprovals = approvals.filter(a => a.responded_at && a.created_at);
  const avgResponseMs = respondedApprovals.length > 0
    ? respondedApprovals.reduce((sum, a) => sum + (new Date(a.responded_at!).getTime() - new Date(a.created_at).getTime()), 0) / respondedApprovals.length
    : 0;
  const avgResponseHours = Math.round(avgResponseMs / (1000 * 60 * 60));
  const avgResponseLabel = avgResponseHours < 24
    ? `${avgResponseHours}h`
    : `${Math.round(avgResponseHours / 24)}d`;

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />

      {/* KPI row */}
      <div className="flex flex-wrap gap-3">
        <KpiCard label="Pending" value={pending} color="text-purple-600 dark:text-purple-400" />
        <KpiCard label="Approved" value={approved} color="text-emerald-600 dark:text-emerald-400" />
        <KpiCard label="Rejected" value={rejected} color="text-red-600 dark:text-red-400" />
        <KpiCard label="Avg Response" value={respondedApprovals.length > 0 ? avgResponseLabel : '—'} color="text-blue-600 dark:text-blue-400" />
      </div>

      {/* Filter tabs + create button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Create Approval Request'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateApprovalForm
          onCreated={() => { setShowCreate(false); loadData(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Data grid */}
      <DataGrid
        columns={columns}
        rows={approvals}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No approval requests found"
        defaultSort={{ key: 'created_at', dir: 'desc' }}
      />
    </div>
  );
}
