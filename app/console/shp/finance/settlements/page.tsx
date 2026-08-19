'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Settlement {
  id: string;
  reference: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  settled_at: string;
}

const columns: Column<Settlement>[] = [
  { key: 'reference', header: 'Reference', pin: 'left', width: '150px', render: (r) => <span className="font-mono text-xs">{r.reference ?? r.id.slice(0, 8)}</span>, value: (r) => r.reference ?? '' },
  { key: 'provider', header: 'Provider', width: '130px', sortable: true, value: (r) => r.provider ?? '' },
  { key: 'amount', header: 'Amount', width: '110px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.amount ?? 0).toFixed(2)}</span>, value: (r) => r.amount ?? 0 },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'pending'} />, value: (r) => r.status ?? '' },
  { key: 'settled', header: 'Settled', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.settled_at ? new Date(r.settled_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.settled_at ?? '' },
];

export default function SH031Page() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/finance/settlements').then(r => r.json()).then(d => {
      setSettlements(d.settlements ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={settlements} rowKey={(r) => r.id} loading={loading} emptyMessage="No settlements found" />
    </div>
  );
}
