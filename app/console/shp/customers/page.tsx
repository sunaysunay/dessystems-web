'use client';
import { useState, useEffect, useMemo } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { type Column } from '@/components/DataGrid';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface Customer {
  customer_email: string;
  customer_name: string;
  order_count: number;
  total_spent: number;
  last_order_at: string;
}

const columns: Column<Customer>[] = [
  {
    key: 'customer_name', header: 'Name', pin: 'left', width: '220px', sortable: true,
    render: (r) => (
      <div>
        <div className="text-sm font-medium">{r.customer_name || '—'}</div>
        <div className="text-[11px] text-slate-400">{r.customer_email}</div>
      </div>
    ),
    value: (r) => r.customer_name ?? '',
  },
  {
    key: 'order_count', header: 'Orders', width: '90px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.order_count}</span>,
    value: (r) => r.order_count,
  },
  {
    key: 'total_spent', header: 'Total Spent', width: '120px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">€ {r.total_spent.toFixed(2)}</span>,
    value: (r) => r.total_spent,
  },
  {
    key: 'last_order_at', header: 'Last Order', width: '140px', sortable: true,
    render: (r) => (
      <span className="text-xs text-slate-500">
        {r.last_order_at ? new Date(r.last_order_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </span>
    ),
    value: (r) => r.last_order_at ?? '',
  },
];

export default function SH006Page() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/bop/shop/orders?limit=100')
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  const customers = useMemo<Customer[]>(() => {
    const byEmail = new Map<string, Customer>();
    for (const o of orders) {
      const email = o.customer_email;
      if (!email) continue;
      const existing = byEmail.get(email);
      if (existing) {
        existing.order_count += 1;
        existing.total_spent += o.total_amount ?? 0;
        if (!existing.last_order_at || (o.created_at && o.created_at > existing.last_order_at)) {
          existing.last_order_at = o.created_at;
        }
      } else {
        byEmail.set(email, {
          customer_email: email,
          customer_name: o.customer_name,
          order_count: 1,
          total_spent: o.total_amount ?? 0,
          last_order_at: o.created_at,
        });
      }
    }
    return Array.from(byEmail.values()).sort((a, b) => b.order_count - a.order_count);
  }, [orders]);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.customer_name?.toLowerCase().includes(q) || c.customer_email?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        Customer list derived from order history (grouped by email). A dedicated customers table is not yet available.
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm w-64"
        />
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} customer{filtered.length === 1 ? '' : 's'}</span>
      </div>

      <DataGrid columns={columns} rows={filtered} rowKey={(r) => r.customer_email} loading={loading} emptyMessage="No customers found" />
    </div>
  );
}
