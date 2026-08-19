'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface ReturnItem {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  refund_amount: number;
  currency: string;
  created_at: string;
}

const columns: Column<ReturnItem>[] = [
  { key: 'id', header: 'Return #', pin: 'left', width: '120px', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>, value: (r) => r.id },
  { key: 'order', header: 'Order', width: '120px', render: (r) => <span className="font-mono text-xs">{r.order_id?.slice(0, 8) ?? '—'}</span>, value: (r) => r.order_id ?? '' },
  { key: 'reason', header: 'Reason', width: '200px', sortable: true, value: (r) => r.reason ?? '' },
  { key: 'refund', header: 'Refund', width: '110px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.refund_amount ?? 0).toFixed(2)}</span>, value: (r) => r.refund_amount ?? 0 },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'open'} />, value: (r) => r.status ?? '' },
  { key: 'date', header: 'Created', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.created_at ?? '' },
];

export default function SH040Page() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/returns').then(r => r.json()).then(d => {
      setReturns(d.returns ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={returns} rowKey={(r) => r.id} loading={loading} emptyMessage="No returns found" />
    </div>
  );
}
