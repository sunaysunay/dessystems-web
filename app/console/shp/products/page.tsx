'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';
import Link from 'next/link';

interface ProductName {
  nl?: string;
  en?: string;
  de?: string;
}

interface Brand {
  id?: string;
  name?: string;
}

interface Product {
  id: string;
  slug: string;
  name: ProductName | string | null;
  brand: Brand | null;
  status: string;
  created_at: string;
}

function displayName(p: Product): string {
  if (p.name && typeof p.name === 'object') {
    return p.name.nl || p.name.en || p.name.de || p.slug;
  }
  if (typeof p.name === 'string' && p.name) return p.name;
  return p.slug;
}

const columns: Column<Product>[] = [
  {
    key: 'name', header: 'Product', pin: 'left', width: '260px', sortable: true,
    render: (r) => (
      <Link href={`/console/shp/products/${r.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
        <div className="text-sm font-medium">{displayName(r)}</div>
        <div className="text-[11px] text-slate-400 font-mono">{r.slug}</div>
      </Link>
    ),
    value: (r) => displayName(r),
  },
  {
    key: 'brand', header: 'Brand', width: '160px', sortable: true,
    render: (r) => <span className="text-sm">{r.brand?.name ?? '—'}</span>,
    value: (r) => r.brand?.name ?? '',
  },
  {
    key: 'status', header: 'Status', width: '100px', sortable: true,
    render: (r) => <StatusBadge status={r.status ?? 'draft'} />,
    value: (r) => r.status ?? '',
  },
  {
    key: 'created_at', header: 'Created', width: '140px', sortable: true,
    render: (r) => (
      <span className="text-xs text-slate-500">
        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </span>
    ),
    value: (r) => r.created_at ?? '',
  },
];

export default function SH001Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const page = Number(searchParams.get('page') ?? '1') || 1;

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (statusFilter) qs.set('status', statusFilter);
    qs.set('page', String(page));

    fetch(`/api/bop/shop/catalog/products?${qs}`)
      .then(r => r.json())
      .then(d => {
        setProducts(d.products ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  const setPage = (next: number) => {
    const qs = new URLSearchParams(searchParams.toString());
    if (next <= 1) {
      qs.delete('page');
    } else {
      qs.set('page', String(next));
    }
    router.push(`/console/shp/products${qs.toString() ? `?${qs}` : ''}`);
  };

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm w-64"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        {total > 0 && (
          <span className="text-xs text-slate-400 ml-auto">{total} product{total === 1 ? '' : 's'}</span>
        )}
      </div>

      <DataGrid
        columns={columns}
        rows={products}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No products found"
      />

      {total > products.length && (
        <div className="flex items-center justify-end gap-1 text-xs text-slate-500 dark:text-slate-400">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="px-2 py-1">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            className="rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
