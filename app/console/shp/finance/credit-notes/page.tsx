'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface CreditNote {
  id: string;
  credit_note_number: string;
  customer_name: string;
  status: string;
  amount: number;
  currency: string;
  issued_at: string;
}

const columns: Column<CreditNote>[] = [
  { key: 'number', header: 'Credit Note #', pin: 'left', width: '150px', render: (r) => <span className="font-mono text-xs">{r.credit_note_number ?? r.id.slice(0, 8)}</span>, value: (r) => r.credit_note_number ?? '' },
  { key: 'customer', header: 'Customer', width: '180px', sortable: true, value: (r) => r.customer_name ?? '' },
  { key: 'amount', header: 'Amount', width: '110px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.currency ?? '€'} {(r.amount ?? 0).toFixed(2)}</span>, value: (r) => r.amount ?? 0 },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'issued'} />, value: (r) => r.status ?? '' },
  { key: 'issued', header: 'Issued', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.issued_at ? new Date(r.issued_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.issued_at ?? '' },
];

export default function SH033Page() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/finance/credit-notes').then(r => r.json()).then(d => {
      setNotes(d.credit_notes ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={notes} rowKey={(r) => r.id} loading={loading} emptyMessage="No credit notes found" />
    </div>
  );
}
