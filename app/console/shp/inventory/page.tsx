'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface StockItem {
  id: string;
  sku: string;
  product_name: string;
  qty: number;
  reorder_point: number;
}

const columns: Column<StockItem>[] = [
  {
    key: 'sku', header: 'SKU', pin: 'left', width: '140px', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.sku}</span>,
    value: (r) => r.sku ?? '',
  },
  {
    key: 'product_name', header: 'Product Name', width: '260px', sortable: true,
    render: (r) => <span className="text-sm font-medium">{r.product_name ?? '—'}</span>,
    value: (r) => r.product_name ?? '',
  },
  {
    key: 'qty', header: 'Qty', width: '90px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.qty ?? 0}</span>,
    value: (r) => r.qty ?? 0,
  },
  {
    key: 'reorder_point', header: 'Reorder Point', width: '120px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.reorder_point ?? 0}</span>,
    value: (r) => r.reorder_point ?? 0,
  },
  {
    key: 'status', header: 'Status', width: '110px', sortable: true,
    render: (r) => {
      const low = (r.qty ?? 0) < (r.reorder_point ?? 0);
      return <StatusBadge status={low ? 'warning' : 'active'} label={low ? 'Low stock' : 'OK'} />;
    },
    value: (r) => ((r.qty ?? 0) < (r.reorder_point ?? 0) ? 'Low stock' : 'OK'),
  },
];

export default function SH005Page() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/bop/shop/monitoring')
      .then(r => r.json())
      .then(d => {
        setItems(Array.isArray(d.critical_low_stock) ? d.critical_low_stock : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) => {
    const low = (i.qty ?? 0) < (i.reorder_point ?? 0);
    if (statusFilter === 'low' && !low) return false;
    if (statusFilter === 'ok' && low) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.sku?.toLowerCase().includes(q) && !i.product_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />

      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
        Showing stock items flagged as critically low by the monitoring feed. Full inventory ledger and reconciliation live under Stock Reconciliation.
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by SKU or product name…"
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
          <option value="low">Low stock</option>
          <option value="ok">OK</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} item{filtered.length === 1 ? '' : 's'}</span>
      </div>

      <DataGrid columns={columns} rows={filtered} rowKey={(r) => r.id ?? r.sku} loading={loading} emptyMessage="No critical low-stock items found" />
    </div>
  );
}
