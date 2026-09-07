'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portalT } from '@/lib/portal/labels';

type Offer = {
  id: string; offer_no: string | null; title: string; summary: string | null;
  status: string; current_version: number; currency: string;
  valid_until: string | null; updated_at: string; total: number | null;
};
type Doc = {
  id: string; title: string; note: string | null; category: string;
  mime_type: string | null; size_bytes: number | null; version: number;
  is_primary: boolean; updated_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-amber-50 text-amber-700',
  viewed: 'bg-amber-50 text-amber-700',
  changes_requested: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-600',
  withdrawn: 'bg-gray-100 text-gray-500',
};

function fmtMoney(n: number | null, locale: string, currency: string) {
  if (n == null) return '';
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : `${locale}-${locale.toUpperCase()}`, { style: 'currency', currency }).format(n);
}
function fmtDate(d: string | null, locale: string) {
  if (!d) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : `${locale}-${locale.toUpperCase()}`, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
}
function fmtSize(bytes: number | null) {
  if (!bytes) return '';
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function PortalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<{ client: any; offers: Offer[]; documents: Doc[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/me')
      .then(r => { if (r.status === 401) { router.replace('/portal/login'); throw new Error('unauthorized'); } return r.json(); })
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" /></div>;
  }
  if (!data) return null;

  const locale = data.client?.locale || 'en';
  const t = portalT(locale);

  async function logout() {
    await fetch('/api/portal/auth', { method: 'DELETE' });
    router.replace(`/portal/login?l=${locale}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">DES Systems · {t('portalTitle')}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{t('welcome')}, {data.client.contact_name || data.client.name}</h1>
        </div>
        <button onClick={logout} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100">
          {t('logout')}
        </button>
      </div>

      {/* Offers */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{t('offers')}</h2>
        {data.offers.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-400 shadow-sm">{t('noOffers')}</div>
        ) : (
          <div className="space-y-3">
            {data.offers.map(o => (
              <button
                key={o.id}
                onClick={() => router.push(`/portal/offers/${o.id}`)}
                className="block w-full rounded-2xl bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{o.title}</h3>
                    {o.summary && <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{o.summary}</p>}
                    <p className="mt-2 text-xs text-gray-400">
                      {o.offer_no ? `${o.offer_no} · ` : ''}{t('version')} {o.current_version} · {t('updated')} {fmtDate(o.updated_at, locale)}
                      {o.valid_until ? ` · ${t('validUntil')} ${fmtDate(o.valid_until, locale)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {t(`status_${o.status}`)}
                    </span>
                    {o.total != null && <span className="text-sm font-semibold text-gray-900">{fmtMoney(o.total, locale, o.currency)}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{t('documents')}</h2>
        {data.documents.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-400 shadow-sm">{t('noDocuments')}</div>
        ) : (
          <div className="space-y-3">
            {data.documents.map(d => (
              <div key={d.id} className={`flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ${d.is_primary ? 'border-l-4 border-orange-600' : ''}`}>
                <div className="flex h-12 w-10 flex-none items-center justify-center rounded border border-gray-200 bg-gray-50 font-mono text-[10px] text-gray-400">
                  {(d.mime_type || '').includes('pdf') ? 'PDF' : 'DOC'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-gray-900">{d.title}</h3>
                  {d.note && <p className="mt-0.5 text-sm text-gray-500">{d.note}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    v{d.version} · {t('updated')} {fmtDate(d.updated_at, locale)}{d.size_bytes ? ` · ${fmtSize(d.size_bytes)}` : ''}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <a href={`/api/portal/documents/${d.id}`} target="_blank" rel="noreferrer"
                       className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      {t('openDoc')}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-gray-200 pt-5 text-xs text-gray-400">
        <p>{t('confidential')}</p>
        <p className="mt-2">{t('poweredBy')}</p>
      </footer>
    </div>
  );
}
