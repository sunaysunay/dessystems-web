'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Brand {
  id: string;
  slug: string;
  name: string;
  is_producer?: boolean;
  product_count?: number;
}

const columns: Column<Brand>[] = [
  {
    key: 'name', header: 'Name', pin: 'left', width: '220px', sortable: true,
    render: (r) => (
      <div>
        <div className="text-sm font-medium">{r.name}</div>
        <div className="text-[11px] text-slate-400 font-mono">{r.slug}</div>
      </div>
    ),
    value: (r) => r.name ?? '',
  },
  {
    key: 'slug', header: 'Slug', width: '160px', sortable: true,
    render: (r) => <span className="font-mono text-xs text-slate-500">{r.slug}</span>,
    value: (r) => r.slug ?? '',
  },
  {
    key: 'status', header: 'Status', width: '110px', sortable: true,
    render: (r) => <StatusBadge status={r.is_producer ? 'active' : 'draft'} label={r.is_producer ? 'Producer' : 'Reseller'} />,
    value: (r) => (r.is_producer ? 'Producer' : 'Reseller'),
  },
  {
    key: 'product_count', header: 'Products', width: '100px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.product_count ?? '—'}</span>,
    value: (r) => r.product_count ?? 0,
  },
];

export default function SH007Page() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/bop/shop/catalog/brands')
      .then(r => r.json())
      .then(d => setBrands(d.brands ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = brands.filter((b) => {
    if (statusFilter === 'producer' && !b.is_producer) return false;
    if (statusFilter === 'reseller' && b.is_producer) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.name?.toLowerCase().includes(q) && !b.slug?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search brands…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm w-64"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          <option value="producer">Producer</option>
          <option value="reseller">Reseller</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} brand{filtered.length === 1 ? '' : 's'}</span>
      </div>

      <DataGrid columns={columns} rows={filtered} rowKey={(r) => r.id} loading={loading} emptyMessage="No brands found" />
    </div>
  );
}
