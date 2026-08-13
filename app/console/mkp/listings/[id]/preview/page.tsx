'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
const money = (v: number | null, c: string) => v === null ? '—' : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: c || 'EUR', maximumFractionDigits: 0 }).format(v);

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500', review: 'bg-amber-100 text-amber-700', approved: 'bg-cyan-100 text-cyan-700',
  active: 'bg-emerald-100 text-emerald-700', reserved: 'bg-indigo-100 text-indigo-700', sold: 'bg-blue-100 text-blue-700', archived: 'bg-slate-200 text-slate-400',
};
const WF_COLOR: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500', media_pending: 'bg-amber-100 text-amber-700', inspection: 'bg-amber-100 text-amber-700',
  pricing: 'bg-amber-100 text-amber-700', ready: 'bg-cyan-100 text-cyan-700', published: 'bg-emerald-100 text-emerald-700',
};

// Fields worth showing per spec table — anything present and non-null renders.
const SPEC_LABELS: Record<string, string> = {
  mileage: 'Mileage (km)', fuel: 'Fuel', transmission: 'Transmission', power_hp: 'Power (hp)', euro_norm: 'Euro norm',
  engine_cc: 'Engine (cc)', cylinders: 'Cylinders', color: 'Color', doors: 'Doors', capacity: 'Seats',
  drive_type: 'Drive type', emission_class: 'Emission class', gross_vehicle_weight: 'GVW (kg)', payload: 'Payload (kg)',
  max_tow_weight: 'Max tow weight (kg)', roof_height: 'Roof height', wheelbase: 'Wheelbase', axles: 'Axles',
  body_type: 'Body type', upholstery: 'Upholstery', beds: 'Beds', country_origin: 'Country of origin', license_plate: 'License plate',
  apk_date: 'APK date',
};

export default function ListingPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [l, setL] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    void fetch(`/api/bop/mkp/bop-listings/${id}`).then(r => r.json()).then(j => {
      setL(j.listing);
      const locales = (j.listing?.content ?? []).map((c: any) => c.locale);
      if (locales.length && !locales.includes('en')) setLocale(locales[0]);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading preview…</div>;
  if (!l) return <div className="p-10 text-center text-slate-400">Listing not found.</div>;

  const content = (l.content ?? []).find((c: any) => c.locale?.slice(0, 2) === locale) ?? l.content?.[0] ?? {};
  const media = (l.media ?? []).filter((m: any) => m.media_type === 'photo');
  const cover = media[activeImg]?.url;
  const brandName = l.bop_brands?.name ?? '';
  const modelName = l.bop_models?.name ?? '';
  const title = content.title || `${brandName} ${modelName}`.trim() || 'Untitled listing';
  const spec = l.spec ?? {};
  const specRows = Object.entries(SPEC_LABELS).filter(([k]) => spec[k] !== null && spec[k] !== '');
  const availableLocales = (l.content ?? []).map((c: any) => c.locale?.slice(0, 2)).filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <button onClick={() => router.back()} className="mb-4 text-sm text-slate-500 hover:text-slate-700">← Back</button>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">{l.ref_no || l.id.slice(0, 8)}</span>
        <span className={`rounded px-2 py-1 text-xs font-medium capitalize ${STATUS_COLOR[l.status] ?? ''}`}>{l.status}</span>
        <span className={`rounded px-2 py-1 text-xs font-medium ${WF_COLOR[l.workflow_status] ?? ''}`}>{cap(l.workflow_status?.replace('_', ' '))}</span>
        {l.is_verified && <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">✓ Verified</span>}
        <span className="ml-auto inline-flex h-7 w-9 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">{l.des_score}</span>
        {availableLocales.length > 1 && (
          <div className="flex gap-1">
            {availableLocales.map((lo: string) => (
              <button key={lo} onClick={() => setLocale(lo)}
                className={`rounded px-2 py-1 text-xs font-medium uppercase ${locale === lo ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{lo}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300">No photo</div>}
          </div>
          {media.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {media.map((m: any, i: number) => (
                <button key={m.id ?? i} onClick={() => setActiveImg(i)} className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded border-2 ${activeImg === i ? 'border-blue-500' : 'border-transparent'}`}>
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">{brandName}{l.year ? ` · ${l.year}` : ''} · {cap(l.category)}</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
          <div className="mt-2 text-3xl font-semibold text-slate-800">{money(l.pricing?.asking_price, l.pricing?.currency)}</div>
          {content.short_desc && <p className="mt-3 text-sm text-slate-600">{content.short_desc}</p>}

          {specRows.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm">
              {specRows.map(([k, label]) => (
                <div key={k} className="flex justify-between border-b border-slate-50 pb-1">
                  <dt className="text-slate-400">{label as string}</dt>
                  <dd className="font-medium text-slate-700">{String(spec[k])}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {content.full_desc && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{content.full_desc}</p>
        </div>
      )}

      {(content.features?.length > 0 || content.highlights?.length > 0) && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Features</h2>
          <div className="flex flex-wrap gap-2">
            {[...(content.highlights ?? []), ...(content.features ?? [])].map((f: string, i: number) => (
              <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{f}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-400">
        Internal preview — reflects live BOP data regardless of publish status. Not the public storefront.
      </div>
    </div>
  );
}
