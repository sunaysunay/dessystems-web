'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Registration {
  id: string;
  name: string;
  type: string;
  country: string;
  registration_number: string;
  status: string;
  valid_until: string;
  created_at: string;
}

const columns: Column<Registration>[] = [
  { key: 'name', header: 'Registration', pin: 'left', width: '200px', sortable: true, value: (r) => r.name ?? '' },
  { key: 'type', header: 'Type', width: '120px', sortable: true, value: (r) => r.type ?? '' },
  { key: 'country', header: 'Country', width: '80px', sortable: true, value: (r) => r.country ?? '' },
  { key: 'number', header: 'Reg. Number', width: '150px', render: (r) => <span className="font-mono text-xs">{r.registration_number ?? '—'}</span>, value: (r) => r.registration_number ?? '' },
  { key: 'valid', header: 'Valid Until', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.valid_until ? new Date(r.valid_until).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.valid_until ?? '' },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'active'} />, value: (r) => r.status ?? '' },
];

export default function SH060Page() {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/compliance/registrations').then(r => r.json()).then(d => {
      setRegs(d.registrations ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={regs} rowKey={(r) => r.id} loading={loading} emptyMessage="No registrations found" />
    </div>
  );
}
