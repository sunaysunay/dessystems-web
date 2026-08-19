'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface ReservedListing {
  id: string;
  listing_id: string;
  dealer_id: string;
  reserved_at: string;
  expires_at: string;
  status: string;
  success_fee_pct: number;
  success_fee_amount: number | null;
  trade_id: string | null;
}

const columns: Column<ReservedListing>[] = [
  {
    key: 'listing_id', header: 'Listing ID', pin: 'left', width: '140px', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.listing_id}</span>,
    value: (r) => r.listing_id,
  },
  {
    key: 'dealer_id', header: 'Dealer', width: '140px', sortable: true,
    render: (r) => <span className="text-sm">{r.dealer_id}</span>,
    value: (r) => r.dealer_id,
  },
  {
    key: 'status', header: 'Status', width: '110px', sortable: true,
    render: (r) => <StatusBadge status={r.status} />,
    value: (r) => r.status,
  },
  {
    key: 'reserved_at', header: 'Reserved At', width: '150px', sortable: true,
    render: (r) => (
      <span className="text-xs text-slate-500">
        {r.reserved_at ? new Date(r.reserved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </span>
    ),
    value: (r) => r.reserved_at ?? '',
  },
  {
    key: 'expires_at', header: 'Expires', width: '150px', sortable: true,
    render: (r) => (
      <span className="text-xs text-slate-500">
        {r.expires_at ? new Date(r.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </span>
    ),
    value: (r) => r.expires_at ?? '',
  },
  {
    key: 'success_fee_pct', header: 'Fee %', width: '80px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.success_fee_pct}%</span>,
    value: (r) => r.success_fee_pct,
  },
  {
    key: 'success_fee_amount', header: 'Fee Amount', width: '110px', align: 'right', sortable: true,
    render: (r) => (
      <span className="font-mono text-xs">
        {r.success_fee_amount != null ? `€ ${r.success_fee_amount.toFixed(2)}` : '—'}
      </span>
    ),
    value: (r) => r.success_fee_amount ?? 0,
  },
];

export default function DealerReservePage() {
  const [rows, setRows] = useState<ReservedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    fetch(`/api/bop/mkt/dealer/reserve?${qs}`)
      .then(r => r.json())
      .then(d => setRows(d.reservations ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="reserved">Reserved</option>
          <option value="confirmed">Confirmed</option>
          <option value="expired">Expired</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <DataGrid
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No reserved listings"
      />
    </div>
  );
}
