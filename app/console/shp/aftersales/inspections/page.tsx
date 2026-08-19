'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Inspection {
  id: string;
  return_id: string;
  sku: string;
  condition: string;
  status: string;
  inspector: string;
  created_at: string;
}

const columns: Column<Inspection>[] = [
  { key: 'id', header: 'Inspection #', pin: 'left', width: '130px', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span>, value: (r) => r.id },
  { key: 'return', header: 'Return', width: '120px', render: (r) => <span className="font-mono text-xs">{r.return_id?.slice(0, 8) ?? '—'}</span>, value: (r) => r.return_id ?? '' },
  { key: 'sku', header: 'SKU', width: '120px', render: (r) => <span className="font-mono text-xs">{r.sku ?? '—'}</span>, value: (r) => r.sku ?? '' },
  { key: 'condition', header: 'Condition', width: '120px', sortable: true, value: (r) => r.condition ?? '' },
  { key: 'inspector', header: 'Inspector', width: '140px', value: (r) => r.inspector ?? '—' },
  { key: 'status', header: 'Status', width: '110px', render: (r) => <StatusBadge status={r.status ?? 'pending'} />, value: (r) => r.status ?? '' },
  { key: 'date', header: 'Inspected', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.created_at ?? '' },
];

export default function SH085Page() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/returns/inspect').then(r => r.json()).then(d => {
      setInspections(d.inspections ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={inspections} rowKey={(r) => r.id} loading={loading} emptyMessage="No return inspections found" />
    </div>
  );
}
