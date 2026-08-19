'use client';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import DataGrid, { StatusBadge, type Column } from '@/components/DataGrid';

interface DemandRow {
  id: string;
  product: string;
  current_stock: number;
  forecast_demand: number;
  reorder_qty: number;
  status: 'ok' | 'low' | 'reorder' | 'critical';
}

// Placeholder demand-planning data — no live forecasting API yet.
const PLACEHOLDER_DATA: DemandRow[] = [
  { id: '1', product: 'Aroma Diffuser 250ml', current_stock: 42, forecast_demand: 60, reorder_qty: 30, status: 'low' },
  { id: '2', product: 'Ceramic Vase — Ivory', current_stock: 8, forecast_demand: 25, reorder_qty: 40, status: 'critical' },
  { id: '3', product: 'Linen Table Runner', current_stock: 120, forecast_demand: 45, reorder_qty: 0, status: 'ok' },
  { id: '4', product: 'Soy Candle — Cedarwood', current_stock: 15, forecast_demand: 50, reorder_qty: 60, status: 'reorder' },
  { id: '5', product: 'Rattan Storage Basket', current_stock: 30, forecast_demand: 20, reorder_qty: 0, status: 'ok' },
  { id: '6', product: 'Wall Mirror — Round 40cm', current_stock: 5, forecast_demand: 18, reorder_qty: 25, status: 'critical' },
];

const columns: Column<DemandRow>[] = [
  { key: 'product', header: 'Product', sortable: true, width: '220px', pin: 'left', value: (r) => r.product },
  {
    key: 'current_stock', header: 'Current Stock', width: '120px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.current_stock}</span>,
    value: (r) => r.current_stock,
  },
  {
    key: 'forecast', header: 'Forecast Demand', width: '140px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs">{r.forecast_demand}</span>,
    value: (r) => r.forecast_demand,
  },
  {
    key: 'reorder', header: 'Reorder Qty', width: '110px', align: 'right', sortable: true,
    render: (r) => <span className="font-mono text-xs font-semibold">{r.reorder_qty > 0 ? r.reorder_qty : '—'}</span>,
    value: (r) => r.reorder_qty,
  },
  { key: 'status', header: 'Status', width: '100px', render: (r) => <StatusBadge status={r.status} />, value: (r) => r.status },
];

export default function SH056Page() {
  const [rows] = useState<DemandRow[]>(PLACEHOLDER_DATA);

  return (
    <div className="p-6 space-y-4">
      <ScreenHeader />
      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2">
        Demand forecasting API is not yet available — this screen shows placeholder data for layout preview.
      </p>
      <DataGrid columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No demand data available" />
    </div>
  );
}
