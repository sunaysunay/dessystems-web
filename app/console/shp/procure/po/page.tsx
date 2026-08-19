'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  currency?: string;
  subtotal?: number;
  tax_total?: number;
  total?: number;
  grand_total?: number;
  created_at: string;
  supplier?: { id: string; name: string; supplier_code: string } | null;
  lines?: { length: number }[];
  line_count?: number;
}

function money(n: number | null | undefined, currency = 'EUR') {
  if (n == null) return '—';
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${Number(n).toFixed(2)}`;
}

const columns: Column<PurchaseOrder>[] = [
  { key: 'po_number', header: 'PO Number', sortable: true, width: '140px', pin: 'left', value: (r) => r.po_number ?? '' },
  {
    key: 'supplier', header: 'Supplier', width: '180px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{r.supplier?.name ?? '—'}</span>,
    value: (r) => r.supplier?.name ?? '',
  },
  { key: 'status', header: 'Status', width: '110px', render: (r) => <StatusBadge status={r.status ?? 'draft'} />, value: (r) => r.status ?? '' },
  {
    key: 'total', header: 'Total', width: '110px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{money(r.total ?? r.grand_total ?? r.subtotal, r.currency)}</span>,
    value: (r) => r.total ?? r.grand_total ?? r.subtotal ?? 0,
  },
  {
    key: 'date', header: 'Date', width: '120px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>,
    value: (r) => r.created_at ?? '',
  },
  {
    key: 'items', header: 'Items', width: '80px', align: 'right',
    render: (r) => <span className="font-mono text-xs">{r.line_count ?? r.lines?.length ?? '—'}</span>,
    value: (r) => r.line_count ?? r.lines?.length ?? 0,
  },
];

export default function SH052Page() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/procure/po?limit=100')
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={orders} rowKey={(r) => r.id} loading={loading} emptyMessage="No purchase orders found" />
    </div>
  );
}
