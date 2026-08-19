'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface PickOrder {
  id: string;
  internal_id: string;
  customer_name: string;
  fulfilment_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
}

const columns: Column<PickOrder>[] = [
  { key: 'order', header: 'Order #', pin: 'left', width: '130px', render: (r) => <span className="font-mono text-xs">{r.internal_id ?? r.id.slice(0, 8)}</span>, value: (r) => r.internal_id ?? '' },
  { key: 'customer', header: 'Customer', width: '180px', sortable: true, value: (r) => r.customer_name ?? '' },
  { key: 'status', header: 'Status', width: '120px', render: (r) => <StatusBadge status={r.fulfilment_status ?? 'confirmed'} />, value: (r) => r.fulfilment_status ?? '' },
  { key: 'total', header: 'Total', width: '100px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.total_amount ?? 0).toFixed(2)}</span>, value: (r) => r.total_amount ?? 0 },
  { key: 'date', header: 'Ordered', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.created_at ?? '' },
];

export default function SH080Page() {
  const [orders, setOrders] = useState<PickOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/orders?status=confirmed').then(r => r.json()).then(d => {
      setOrders(d.orders ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={orders} rowKey={(r) => r.id} loading={loading} emptyMessage="No orders awaiting picking" />
    </div>
  );
}
