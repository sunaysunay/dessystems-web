'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  status: string;
  total_amount: number;
  currency: string;
  issued_at: string;
  due_at: string;
}

const columns: Column<Invoice>[] = [
  { key: 'number', header: 'Invoice #', pin: 'left', width: '140px', render: (r) => <span className="font-mono text-xs">{r.invoice_number ?? r.id.slice(0, 8)}</span>, value: (r) => r.invoice_number ?? '' },
  { key: 'customer', header: 'Customer', width: '180px', sortable: true, value: (r) => r.customer_name ?? '' },
  { key: 'total', header: 'Total', width: '110px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.total_amount ?? 0).toFixed(2)}</span>, value: (r) => r.total_amount ?? 0 },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'issued'} />, value: (r) => r.status ?? '' },
  { key: 'issued', header: 'Issued', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.issued_at ? new Date(r.issued_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.issued_at ?? '' },
  { key: 'due', header: 'Due', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.due_at ? new Date(r.due_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.due_at ?? '' },
];

export default function SH032Page() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/finance/invoices').then(r => r.json()).then(d => {
      setInvoices(d.invoices ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={invoices} rowKey={(r) => r.id} loading={loading} emptyMessage="No invoices found" />
    </div>
  );
}
