'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Refund {
  id: string;
  order_id: string;
  customer_name: string;
  reason: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
}

const columns: Column<Refund>[] = [
  { key: 'id', header: 'Refund #', pin: 'left', width: '120px', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>, value: (r) => r.id },
  { key: 'order', header: 'Order', width: '120px', render: (r) => <span className="font-mono text-xs">{r.order_id?.slice(0, 8) ?? '—'}</span>, value: (r) => r.order_id ?? '' },
  { key: 'customer', header: 'Customer', width: '160px', sortable: true, value: (r) => r.customer_name ?? '' },
  { key: 'reason', header: 'Reason', width: '200px', sortable: true, value: (r) => r.reason ?? '' },
  { key: 'amount', header: 'Amount', width: '110px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.amount ?? 0).toFixed(2)}</span>, value: (r) => r.amount ?? 0 },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'requested'} />, value: (r) => r.status ?? '' },
  { key: 'date', header: 'Requested', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.created_at ?? '' },
];

export default function SH084Page() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/payments/refund/request').then(r => r.json()).then(d => {
      setRefunds(d.refunds ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={refunds} rowKey={(r) => r.id} loading={loading} emptyMessage="No refund requests found" />
    </div>
  );
}
