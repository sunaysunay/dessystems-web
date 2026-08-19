'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Supplier {
  id: string;
  name: string;
  contact_email: string;
  country: string;
  status: string;
  lead_time_days: number;
  created_at: string;
}

const columns: Column<Supplier>[] = [
  { key: 'name', header: 'Supplier', sortable: true, width: '200px', pin: 'left', value: (r) => r.name ?? '' },
  { key: 'email', header: 'Contact', width: '200px', render: (r) => <span className="text-xs text-slate-500">{r.contact_email ?? '—'}</span>, value: (r) => r.contact_email ?? '' },
  { key: 'country', header: 'Country', width: '100px', sortable: true, value: (r) => r.country ?? '' },
  { key: 'lead_time', header: 'Lead Time', width: '100px', align: 'right', render: (r) => <span className="font-mono text-xs">{r.lead_time_days ?? '—'} days</span>, value: (r) => r.lead_time_days ?? 0 },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'active'} />, value: (r) => r.status ?? '' },
  { key: 'created', header: 'Added', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.created_at ?? '' },
];

export default function SH050Page() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/procure/suppliers').then(r => r.json()).then(d => {
      setSuppliers(d.data ?? d.suppliers ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={suppliers} rowKey={(r) => r.id} loading={loading} emptyMessage="No suppliers found" />
    </div>
  );
}
