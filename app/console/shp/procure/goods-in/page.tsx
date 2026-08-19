'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Receipt {
  id: string;
  po_id: string;
  po?: { po_number?: string; supplier?: { name?: string } } | null;
  po_number?: string;
  supplier_name?: string;
  received_at: string;
  status?: string;
  discrepancy_note?: string;
  lines?: { length: number; qty_received?: number }[];
  item_count?: number;
}

const columns: Column<Receipt>[] = [
  { key: 'id', header: 'Receipt ID', sortable: true, width: '150px', pin: 'left', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>, value: (r) => r.id },
  {
    key: 'po_ref', header: 'PO Ref', width: '140px', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.po?.po_number ?? r.po_number ?? r.po_id ?? '—'}</span>,
    value: (r) => r.po?.po_number ?? r.po_number ?? r.po_id ?? '',
  },
  {
    key: 'supplier', header: 'Supplier', width: '180px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{r.po?.supplier?.name ?? r.supplier_name ?? '—'}</span>,
    value: (r) => r.po?.supplier?.name ?? r.supplier_name ?? '',
  },
  {
    key: 'date', header: 'Date', width: '120px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{r.received_at ? new Date(r.received_at).toLocaleDateString('en-GB') : '—'}</span>,
    value: (r) => r.received_at ?? '',
  },
  {
    key: 'status', header: 'Status', width: '110px',
    render: (r) => <StatusBadge status={r.status ?? (r.discrepancy_note ? 'warning' : 'done')} />,
    value: (r) => r.status ?? '',
  },
  {
    key: 'items', header: 'Items Received', width: '120px', align: 'right',
    render: (r) => <span className="font-mono text-xs">{r.item_count ?? r.lines?.length ?? '—'}</span>,
    value: (r) => r.item_count ?? r.lines?.length ?? 0,
  },
];

export default function SH054Page() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/procure/receive?limit=100')
      .then((r) => r.json())
      .then((d) => setReceipts(d.data ?? []))
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={receipts} rowKey={(r) => r.id} loading={loading} emptyMessage="No goods-in receipts found" />
    </div>
  );
}
