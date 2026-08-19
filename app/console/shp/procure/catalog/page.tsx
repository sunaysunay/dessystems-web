'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface Product {
  id: string;
  title: string;
  slug: string;
  status: string;
  brand?: { id: string; name: string; slug: string } | null;
  supplier?: { id: string; name: string } | null;
  supplier_name?: string;
  cost_price?: number | null;
  price?: number | null;
  retail_price?: number | null;
}

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return `€${Number(n).toFixed(2)}`;
}

function margin(cost: number | null | undefined, retail: number | null | undefined) {
  if (cost == null || retail == null || retail === 0) return null;
  return ((retail - cost) / retail) * 100;
}

const columns: Column<Product>[] = [
  { key: 'title', header: 'Product', sortable: true, width: '240px', pin: 'left', value: (r) => r.title ?? '' },
  {
    key: 'supplier', header: 'Supplier', width: '180px', sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{r.supplier?.name ?? r.supplier_name ?? r.brand?.name ?? '—'}</span>,
    value: (r) => r.supplier?.name ?? r.supplier_name ?? r.brand?.name ?? '',
  },
  {
    key: 'cost', header: 'Cost Price', width: '110px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{money(r.cost_price)}</span>,
    value: (r) => r.cost_price ?? 0,
  },
  {
    key: 'retail', header: 'Retail Price', width: '110px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{money(r.retail_price ?? r.price)}</span>,
    value: (r) => r.retail_price ?? r.price ?? 0,
  },
  {
    key: 'margin', header: 'Margin', width: '90px', align: 'right', sortable: true,
    render: (r) => {
      const m = margin(r.cost_price, r.retail_price ?? r.price);
      if (m == null) return <span className="text-xs text-slate-400">—</span>;
      return <span className={`font-mono text-xs font-semibold ${m < 15 ? 'text-red-500' : m < 30 ? 'text-amber-500' : 'text-emerald-600'}`}>{m.toFixed(1)}%</span>;
    },
    value: (r) => margin(r.cost_price, r.retail_price ?? r.price) ?? 0,
  },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status ?? 'draft'} />, value: (r) => r.status ?? '' },
];

export default function SH051Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierFilter, setSupplierFilter] = useState('');

  useEffect(() => {
    fetch('/api/bop/shop/catalog/products?page_size=100')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const suppliers = Array.from(
    new Set(products.map((p) => p.supplier?.name ?? p.supplier_name ?? p.brand?.name).filter(Boolean) as string[])
  ).sort();

  const filtered = supplierFilter
    ? products.filter((p) => (p.supplier?.name ?? p.supplier_name ?? p.brand?.name) === supplierFilter)
    : products;

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <DataGrid
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="No products found"
        toolbar={
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-1"
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        }
      />
    </div>
  );
}
