'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Document {
  id: string;
  slug: string;
  title: string;
  page_type: string;
  status: string;
  created_at: string;
}

const columns: Column<Document>[] = [
  { key: 'title', header: 'Title', pin: 'left', width: '250px', sortable: true, value: (r) => r.title ?? '' },
  { key: 'slug', header: 'Slug', width: '180px', render: (r) => <span className="font-mono text-xs text-slate-500">{r.slug ?? '—'}</span>, value: (r) => r.slug ?? '' },
  { key: 'type', header: 'Type', width: '120px', sortable: true, value: (r) => r.page_type ?? '' },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'draft'} />, value: (r) => r.status ?? '' },
  { key: 'created', header: 'Created', width: '120px', render: (r) => <span className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</span>, value: (r) => r.created_at ?? '' },
];

export default function SH010Page() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/pages').then(r => r.json()).then(d => {
      setDocs(d.pages ?? []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid columns={columns} rows={docs} rowKey={(r) => r.id} loading={loading} emptyMessage="No documents found" />
    </div>
  );
}
