'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface KPIs {
  openPOs: number;
  latePOs: number;
  lowStockAlerts: number;
  pendingOrders: number;
  totalSuppliers: number;
  activeSuppliers: number;
  pendingReturns: number;
  openInvoices: number;
}

interface PORow {
  id: string;
  po_number: string;
  status: string;
  currency: string;
  supplier_name: string;
  total_cents: number;
  created_at: string;
}

interface StockAlert {
  variant_id: string;
  sku: string;
  product_name: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_point: number;
}

function Stat({ label, value, warn, sub }: { label: string; value: number; warn?: boolean; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5">
      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 tabular-nums ${warn ? 'text-red-500' : ''}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    approved: 'bg-blue-50 text-blue-700',
    sent: 'bg-indigo-50 text-indigo-700',
    partially_received: 'bg-amber-50 text-amber-700',
    received: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-500',
    new: 'bg-blue-50 text-blue-700',
    processing: 'bg-amber-50 text-amber-700',
    shipped: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function ControlTowerPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [pos, setPOs] = useState<PORow[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bop/shop/control-tower')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => {
        setKpis(d.kpis);
        setPOs(d.openPOs || []);
        setAlerts(d.stockAlerts || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6">
      <ScreenHeader />
      <p className="text-sm text-slate-400 mt-8 text-center">Loading control tower…</p>
    </div>
  );

  if (error || !kpis) return (
    <div className="p-6">
      <ScreenHeader />
      <p className="text-sm text-red-500 mt-8 text-center">Failed to load: {error}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <ScreenHeader />
      <h1 className="text-xl font-bold mt-4 mb-6 text-slate-800 dark:text-slate-100">SCM Control Tower</h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Stat label="Open POs" value={kpis.openPOs} />
        <Stat label="Late POs" value={kpis.latePOs} warn={kpis.latePOs > 0} sub="past expected delivery" />
        <Stat label="Low Stock" value={kpis.lowStockAlerts} warn={kpis.lowStockAlerts > 0} sub="below reorder point" />
        <Stat label="Pending Orders" value={kpis.pendingOrders} sub="awaiting fulfilment" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open POs table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Open Purchase Orders</h2>
          </div>
          {pos.length === 0 ? (
            <p className="p-5 text-sm text-slate-400 text-center">No open purchase orders</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700/50">
                    <th className="px-4 py-2 text-left font-semibold">PO #</th>
                    <th className="px-4 py-2 text-left font-semibold">Supplier</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Total</th>
                    <th className="px-4 py-2 text-right font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map(po => (
                    <tr key={po.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-4 py-2.5 font-mono text-xs">{po.po_number}</td>
                      <td className="px-4 py-2.5">{po.supplier_name}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={po.status} /></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {po.currency} {(po.total_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400 text-xs">
                        {new Date(po.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stock alerts */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700/50">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Low Stock Alerts</h2>
          </div>
          {alerts.length === 0 ? (
            <p className="p-5 text-sm text-slate-400 text-center">All stock levels healthy</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-700/50">
                    <th className="px-4 py-2 text-left font-semibold">SKU</th>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-4 py-2 text-right font-semibold">Available</th>
                    <th className="px-4 py-2 text-right font-semibold">Reorder Pt</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.variant_id} className="border-b border-slate-50 dark:border-slate-700/30">
                      <td className="px-4 py-2.5 font-mono text-xs">{a.sku}</td>
                      <td className="px-4 py-2.5">{a.product_name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-red-500 font-semibold">{a.available}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">{a.reorder_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <Stat label="Total Suppliers" value={kpis.totalSuppliers} />
        <Stat label="Active Suppliers" value={kpis.activeSuppliers} />
        <Stat label="Pending Returns" value={kpis.pendingReturns} />
        <Stat label="Open Invoices" value={kpis.openInvoices} />
      </div>
    </div>
  );
}
