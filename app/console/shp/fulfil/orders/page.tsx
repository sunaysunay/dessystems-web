'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface FulfilOrder {
  id: string;
  internal_id: string;
  customer_name: string;
  fulfilment_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
}

const columns: Column<FulfilOrder>[] = [
  { key: 'order', header: 'Order #', pin: 'left', width: '130px', render: (r) => <span className="font-mono text-xs">{r.internal_id ?? r.id.slice(0, 8)}</span>, value: (r) => r.internal_id ?? '' },
  { key: 'customer', header: 'Customer', width: '180px', sortable: true, value: (r) => r.customer_name ?? '' },
  { key: 'status', header: 'Fulfilment', width: '120px', render: (r) => <StatusBadge status={r.fulfilment_status ?? 'pending'} />, value: (r) => r.fulfilment_status ?? '' },
  { key: 'total', header: 'Total', width: '100px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.total_amount ?? 0).toFixed(2)}</span>, value: (r) => r.total_amount ?? 0 },
  { key: 'date', header: 'Ordered', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.created_at ?? '' },
];

export default function SH020Page() {
  const [orders, setOrders] = useState<FulfilOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const qs = filter ? `?status=${filter}` : '';
    fetch(`/api/bop/shop/orders${qs}`).then(r => r.json()).then(d => {
      const all = d.orders ?? [];
      setOrders(filter ? all : all.filter((o: any) => o.fulfilment_status !== 'delivered'));
    }).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <div className="flex gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm">
          <option value="">Pending / Processing</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
        </select>
      </div>
      <DataGrid columns={columns} rows={orders} rowKey={(r) => r.id} loading={loading} emptyMessage="No orders awaiting fulfilment" />
    </div>
  );
}
