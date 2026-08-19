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

function localized(val: any): string {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.en ?? val.nl ?? val.de ?? Object.values(val)[0] as string ?? '—';
}

export default function SH002Page() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bop/shop/catalog/products?search=${id}`).then(r => r.json()).then(d => {
      const match = d.products?.find((p: any) => p.id === id);
      setProduct(match ?? d.products?.[0] ?? null);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6"><ScreenHeader /><p className="text-sm text-slate-400 mt-8 text-center">Loading…</p></div>;
  if (!product) return <div className="p-6"><ScreenHeader /><p className="text-sm text-red-400 mt-8 text-center">Product not found</p></div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <ScreenHeader />

      <div className="flex items-center gap-3">
        <Link href="/console/shp/products" className="text-xs text-blue-500 hover:underline">← Products</Link>
        <h2 className="text-lg font-bold">{localized(product.name) || product.slug}</h2>
        <StatusBadge status={product.status ?? 'draft'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5">
        <Field label="Slug" value={product.slug} />
        <Field label="Brand" value={product.brand?.name ?? '—'} />
        <Field label="Subtitle" value={localized(product.subtitle)} />
        <Field label="Status" value={product.status} />
        <Field label="Tax Class" value={product.tax_class_id} />
        <Field label="Published" value={product.is_published ? 'Yes' : 'No'} />
        <Field label="Created" value={product.created_at ? new Date(product.created_at).toLocaleDateString() : '—'} />
        <Field label="Updated" value={product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '—'} />
      </div>

      {product.description_html && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5">
          <div className="text-xs font-bold text-slate-500 mb-2">DESCRIPTION</div>
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: localized(product.description_html) }} />
        </div>
      )}

      <p className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">Product ID: {product.id}</p>
    </div>
  );
}
