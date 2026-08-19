'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface VatEntry {
  id: string;
  period: string;
  country_code: string;
  net_amount: number;
  vat_amount: number;
  rate: number;
  status: string;
  created_at: string;
}

const columns: Column<VatEntry>[] = [
  { key: 'period', header: 'Period', pin: 'left', width: '120px', sortable: true, value: (r) => r.period ?? '' },
  { key: 'country', header: 'Country', width: '80px', sortable: true, value: (r) => r.country_code ?? '' },
  { key: 'rate', header: 'Rate', width: '80px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.rate ?? 0}%</span>, value: (r) => r.rate ?? 0 },
  { key: 'net', header: 'Net', width: '110px', align: 'right', render: (r) => <span className="font-mono text-xs">€ {(r.net_amount ?? 0).toFixed(2)}</span>, value: (r) => r.net_amount ?? 0 },
  { key: 'vat', header: 'VAT', width: '110px', align: 'right', render: (r) => <span className="font-mono text-xs">€ {(r.vat_amount ?? 0).toFixed(2)}</span>, value: (r) => r.vat_amount ?? 0 },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'draft'} />, value: (r) => r.status ?? '' },
];

export default function SH030Page() {
  const [entries, setEntries] = useState<VatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/finance/vat').then(r => r.json()).then(d => {
      setEntries(d.entries ?? d.data ?? d.transactions ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={entries} rowKey={(r) => r.id} loading={loading} emptyMessage="No VAT entries found" />
    </div>
  );
}
