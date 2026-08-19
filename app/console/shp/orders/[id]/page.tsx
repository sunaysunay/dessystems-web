'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { StatusBadge } from '@/components/DataGrid';
import Link from 'next/link';

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 font-semibold mb-0.5">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

export default function SH004Page() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bop/shop/orders/${id}`).then(r => r.json()).then(d => setOrder(d.order)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6"><ScreenHeader /><p className="text-sm text-slate-400 mt-8 text-center">Loading…</p></div>;
  if (!order) return <div className="p-6"><ScreenHeader /><p className="text-sm text-red-400 mt-8 text-center">Order not found</p></div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <ScreenHeader />

      <div className="flex items-center gap-3">
        <Link href="/console/shp/orders" className="text-xs text-blue-500 hover:underline">← Orders</Link>
        <h2 className="text-lg font-bold">{order.internal_id ?? order.id.slice(0, 8)}</h2>
        <StatusBadge status={order.status ?? 'draft'} />
        <StatusBadge status={order.fulfilment_status ?? 'pending'} label={`Fulfilment: ${order.fulfilment_status ?? 'pending'}`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5">
        <Field label="Customer" value={order.customer_name} />
        <Field label="Email" value={order.customer_email} />
        <Field label="Phone" value={order.customer_phone} />
        <Field label="Currency" value={order.currency} />
        <Field label="Subtotal" value={order.subtotal != null ? Number(order.subtotal).toFixed(2) : null} />
        <Field label="Tax" value={order.tax_amount != null ? Number(order.tax_amount).toFixed(2) : null} />
        <Field label="Shipping" value={order.shipping_amount != null ? Number(order.shipping_amount).toFixed(2) : null} />
        <Field label="Total" value={order.total_amount != null ? `${order.currency ?? '€'} ${Number(order.total_amount).toFixed(2)}` : null} />
      </div>

      {(order.shipping_address || order.billing_address) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.shipping_address && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
              <div className="text-xs font-bold text-slate-500 mb-2">SHIPPING ADDRESS</div>
              <pre className="text-sm whitespace-pre-wrap">{typeof order.shipping_address === 'string' ? order.shipping_address : JSON.stringify(order.shipping_address, null, 2)}</pre>
            </div>
          )}
          {order.billing_address && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
              <div className="text-xs font-bold text-slate-500 mb-2">BILLING ADDRESS</div>
              <pre className="text-sm whitespace-pre-wrap">{typeof order.billing_address === 'string' ? order.billing_address : JSON.stringify(order.billing_address, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {order.tracking_code && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
          <div className="text-xs font-bold text-slate-500 mb-2">TRACKING</div>
          <div className="text-sm font-mono">{order.tracking_code}</div>
          {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Track shipment</a>}
        </div>
      )}

      {order.notes && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
          <div className="text-xs font-bold text-slate-500 mb-2">NOTES</div>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      <p className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
        Created: {order.created_at ? new Date(order.created_at).toLocaleString() : '—'} | Updated: {order.updated_at ? new Date(order.updated_at).toLocaleString() : '—'}
      </p>
    </div>
  );
}
