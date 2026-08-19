'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface ComplianceFee {
  id: string;
  scheme: string;
  country: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  period: string;
}

const columns: Column<ComplianceFee>[] = [
  { key: 'scheme', header: 'Scheme', pin: 'left', width: '160px', sortable: true, value: (r) => r.scheme ?? '' },
  { key: 'country', header: 'Country', width: '80px', sortable: true, value: (r) => r.country ?? '' },
  { key: 'category', header: 'Category', width: '140px', value: (r) => r.category ?? '' },
  { key: 'period', header: 'Period', width: '110px', value: (r) => r.period ?? '' },
  { key: 'amount', header: 'Amount', width: '110px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.amount ?? 0).toFixed(2)}</span>, value: (r) => r.amount ?? 0 },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'due'} />, value: (r) => r.status ?? '' },
];

export default function SH086Page() {
  const [fees, setFees] = useState<ComplianceFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/compliance/fees').then(r => r.json()).then(d => {
      setFees(d.fees ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={fees} rowKey={(r) => r.id} loading={loading} emptyMessage="No compliance fees found" />
    </div>
  );
}
