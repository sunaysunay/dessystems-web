'use client';
// SH103 — CI001 Products: DataGrid of raw per-variant metrics (scores in R3).
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { RangePicker, PlaneBadge } from '@/components/CockpitKit';
import DataGrid from '@/components/DataGrid';
import { useAnalytics, fmtEur, fmtNum, fmtPct, DegradedBanner, ForbiddenNote } from '@/components/ci/analytics';

export default function SH103Page() {
  const [range, setRange] = useState(30);
  const { data: d, forbidden, error } = useAnalytics('products', range);

  if (forbidden) return <div className="p-6"><ScreenHeader title="Products" /><ForbiddenNote /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Product Performance" description="Raw per-variant metrics over the range — sortable on every metric; scores arrive in R3" />
        <RangePicker value={range} onChange={setRange} />
      </div>
      <DegradedBanner degraded={d?.degraded} reason={d?.degraded_reason} />
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}
      {d && <p className="mt-2 text-[11px] text-slate-400">{fmtNum(d.variant_count)} variants · money is Plane <PlaneBadge plane="A" />, views/carts Plane <PlaneBadge plane="B" /></p>}

      {d?.products && (
        <div className="mt-3">
          <DataGrid
            rows={d.products}
            rowKey={(r: any) => r.variant_id}
            defaultSort={{ key: 'net_sales_cents', dir: 'desc' }}
            columns={[
              { key: 'sku', header: 'SKU', sortable: true, value: (r: any) => r.sku ?? '', render: (r: any) => <span className="font-mono text-[11px]">{r.sku ?? r.variant_id.slice(0, 8)}</span> },
              { key: 'name', header: 'Product', render: (r: any) => <span className="text-[12px]">{typeof r.name === 'object' ? (r.name?.en ?? r.name?.nl ?? '—') : (r.name ?? '—')}</span> },
              { key: 'units_sold', header: 'Units', sortable: true, align: 'right', value: (r: any) => r.units_sold, render: (r: any) => fmtNum(r.units_sold) },
              { key: 'net_sales_cents', header: 'Net sales', sortable: true, align: 'right', value: (r: any) => r.net_sales_cents, render: (r: any) => fmtEur(r.net_sales_cents) },
              { key: 'contribution_cents', header: 'Contribution', sortable: true, align: 'right', value: (r: any) => r.contribution_cents, render: (r: any) => fmtEur(r.contribution_cents) },
              { key: 'contribution_margin_pct', header: 'Margin', sortable: true, align: 'right', value: (r: any) => r.contribution_margin_pct, render: (r: any) => fmtPct(r.contribution_margin_pct) },
              { key: 'page_views', header: 'Views', sortable: true, align: 'right', value: (r: any) => r.page_views, render: (r: any) => fmtNum(r.page_views) },
              { key: 'cart_adds', header: 'Carts', sortable: true, align: 'right', value: (r: any) => r.cart_adds, render: (r: any) => fmtNum(r.cart_adds) },
              { key: 'cvr_view_to_order_pct', header: 'CVR', sortable: true, align: 'right', value: (r: any) => r.cvr_view_to_order_pct, render: (r: any) => fmtPct(r.cvr_view_to_order_pct) },
              { key: 'return_rate_pct', header: 'Returns', sortable: true, align: 'right', value: (r: any) => r.return_rate_pct, render: (r: any) => fmtPct(r.return_rate_pct) },
            ] as any}
          />
        </div>
      )}
    </div>
  );
}
