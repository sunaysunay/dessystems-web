'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';
import Link from 'next/link';

interface Order {
  id: string;
  internal_id: string;
  status: string;
  customer_name: string;
  customer_email: string;
  currency: string;
  total_amount: number;
  fulfilment_status: string;
  created_at: string;
}

const columns: Column<Order>[] = [
  {
    key: 'internal_id', header: 'Order #', pin: 'left', width: '130px', sortable: true,
    render: (r) => <Link href={`/console/shp/orders/${r.id}`} className="text-blue-600 dark:text-blue-400 font-mono text-xs hover:underline">{r.internal_id ?? r.id.slice(0, 8)}</Link>,
    value: (r) => r.internal_id ?? '',
  },
  {
    key: 'customer', header: 'Customer', sortable: true, width: '200px',
    render: (r) => <div><div className="text-sm font-medium">{r.customer_name ?? '—'}</div><div className="text-[11px] text-slate-400">{r.customer_email ?? ''}</div></div>,
    value: (r) => r.customer_name ?? '',
  },
  {
    key: 'status', header: 'Status', width: '100px', sortable: true,
    render: (r) => <StatusBadge status={r.status ?? 'draft'} />,
    value: (r) => r.status ?? '',
  },
  {
    key: 'fulfilment', header: 'Fulfilment', width: '110px', sortable: true,
    render: (r) => <StatusBadge status={r.fulfilment_status ?? 'pending'} />,
    value: (r) => r.fulfilment_status ?? '',
  },
  {
    key: 'total', header: 'Total', width: '100px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.total_amount ?? 0).toFixed(2)}</span>,
    value: (r) => r.total_amount ?? 0,
  },
  {
    key: 'date', header: 'Date', width: '140px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>,
    value: (r) => r.created_at ?? '',
  },
];

export default function SH003Page() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (statusFilter) qs.set('status', statusFilter);
    fetch(`/api/bop/shop/orders?${qs}`).then(r => r.json()).then(d => {
      setOrders(d.orders ?? []);
    }).finally(() => setLoading(false));
  }, [search, statusFilter]);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search orders…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm w-64"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <DataGrid columns={columns} rows={orders} rowKey={(r) => r.id} loading={loading} emptyMessage="No orders found" />
    </div>
  );
}
