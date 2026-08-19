'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface StockCount {
  id: string;
  name?: string;
  location?: string;
  status: string;
  created_at: string;
  lines?: { length: number; variance?: number }[];
  line_count?: number;
  variance_count?: number;
}

const columns: Column<StockCount>[] = [
  { key: 'id', header: 'Count ID', sortable: true, width: '160px', pin: 'left', render: (r) => <span className="font-mono text-xs">{r.name ?? r.id.slice(0, 8)}</span>, value: (r) => r.name ?? r.id },
  {
    key: 'date', header: 'Date', width: '120px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>,
    value: (r) => r.created_at ?? '',
  },
  { key: 'status', header: 'Status', width: '110px', render: (r) => <StatusBadge status={r.status ?? 'draft'} />, value: (r) => r.status ?? '' },
  {
    key: 'items', header: 'Items Counted', width: '120px', align: 'right',
    render: (r) => <span className="font-mono text-xs">{r.line_count ?? r.lines?.length ?? '—'}</span>,
    value: (r) => r.line_count ?? r.lines?.length ?? 0,
  },
  {
    key: 'variances', header: 'Variances', width: '100px', align: 'right',
    render: (r) => {
      const v = r.variance_count ?? r.lines?.filter((l) => (l.variance ?? 0) !== 0).length ?? 0;
      return <span className={`font-mono text-xs font-semibold ${v > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>{v}</span>;
    },
    value: (r) => r.variance_count ?? r.lines?.filter((l) => (l.variance ?? 0) !== 0).length ?? 0,
  },
];

export default function SH053Page() {
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/procure/stock-count?limit=100')
      .then((r) => r.json())
      .then((d) => setCounts(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={counts} rowKey={(r) => r.id} loading={loading} emptyMessage="No cycle counts found" />
    </div>
  );
}
