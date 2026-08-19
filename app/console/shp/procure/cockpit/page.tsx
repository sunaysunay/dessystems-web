'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenBadge';

function StatTile({ label, value, sub, color, href }: { label: string; value: string | number; sub?: string; color?: string; href?: string }) {
  const content = (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 min-w-[140px] hover:shadow-sm transition">
      <div className="text-[11px] text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color ?? 'var(--foreground)' }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function LinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition"
    >
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </Link>
  );
}

export default function SH057Page() {
  const [suppliers, setSuppliers] = useState<any>(null);
  const [pos, setPos] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/bop/shop/procure/suppliers?limit=200').then((r) => r.json()).catch(() => null),
      fetch('/api/bop/shop/procure/po?limit=200').then((r) => r.json()).catch(() => null),
    ]).then(([s, p]) => {
      setSuppliers(s);
      setPos(p);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><ScreenHeader /><p className="text-sm text-slate-400 mt-8 text-center">Loading…</p></div>;

  const supplierList: any[] = suppliers?.data ?? [];
  const activeSuppliers = supplierList.filter((s) => (s.status ?? 'active') === 'active').length;

  const poList: any[] = pos?.data ?? [];
  const openPOs = poList.filter((p) => ['draft', 'open', 'sent', 'partial'].includes(p.status)).length;
  const pendingReceipts = poList.filter((p) => ['sent', 'partial'].includes(p.status)).length;

  // No dedicated stock-alerts endpoint yet — derive a placeholder from suppliers/POs data.
  const stockAlerts = 0;

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      <div className="flex flex-wrap gap-3">
        <StatTile label="ACTIVE SUPPLIERS" value={activeSuppliers} sub={`${supplierList.length} total`} href="/console/shp/procure/suppliers" />
        <StatTile label="OPEN POs" value={openPOs} sub={`${poList.length} total`} color={openPOs > 0 ? '#3b82f6' : undefined} href="/console/shp/procure/po" />
        <StatTile label="PENDING RECEIPTS" value={pendingReceipts} color={pendingReceipts > 0 ? '#f59e0b' : '#10b981'} href="/console/shp/procure/goods-in" />
        <StatTile label="STOCK ALERTS" value={stockAlerts} sub="no live feed yet" color="#94a3b8" href="/console/shp/procure/demand" />
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Procurement Screens</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LinkCard href="/console/shp/procure/suppliers" title="SH050 · Suppliers" description="Manage supplier master data and terms" />
          <LinkCard href="/console/shp/procure/catalog" title="SH051 · Supplier Catalog" description="Products grouped by supplier with cost/margin" />
          <LinkCard href="/console/shp/procure/po" title="SH052 · Purchase Orders" description="Track POs from draft through receipt" />
          <LinkCard href="/console/shp/procure/cycle-count" title="SH053 · Cycle Count" description="Stock counts and variance tracking" />
          <LinkCard href="/console/shp/procure/goods-in" title="SH054 · Goods-In" description="Receipts against open purchase orders" />
          <LinkCard href="/console/shp/procure/demand" title="SH056 · Demand" description="Demand planning and reorder suggestions" />
        </div>
      </div>
    </div>
  );
}
