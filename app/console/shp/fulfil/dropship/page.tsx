'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface DropshipDispatch {
  id: string;
  order_id: string;
  supplier_name: string;
  status: string;
  sku: string;
  quantity: number;
  created_at: string;
}

const columns: Column<DropshipDispatch>[] = [
  { key: 'id', header: 'Dispatch #', pin: 'left', width: '120px', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>, value: (r) => r.id },
  { key: 'order', header: 'Order', width: '120px', render: (r) => <span className="font-mono text-xs">{r.order_id?.slice(0, 8) ?? '—'}</span>, value: (r) => r.order_id ?? '' },
  { key: 'supplier', header: 'Supplier', width: '160px', sortable: true, value: (r) => r.supplier_name ?? '' },
  { key: 'sku', header: 'SKU', width: '120px', render: (r) => <span className="font-mono text-xs">{r.sku ?? '—'}</span>, value: (r) => r.sku ?? '' },
  { key: 'qty', header: 'Qty', width: '70px', align: 'right', value: (r) => r.quantity ?? 0 },
  { key: 'status', header: 'Status', width: '110px', render: (r) => <StatusBadge status={r.status ?? 'pending'} />, value: (r) => r.status ?? '' },
  { key: 'date', header: 'Created', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.created_at ?? '' },
];

export default function SH083Page() {
  const [dispatches, setDispatches] = useState<DropshipDispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/fulfil/dropship/dispatch').then(r => r.json()).then(d => {
      setDispatches(d.dispatches ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={dispatches} rowKey={(r) => r.id} loading={loading} emptyMessage="No dropship dispatches found" />
    </div>
  );
}
