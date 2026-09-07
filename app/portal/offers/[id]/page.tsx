'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { portalT } from '@/lib/portal/labels';

type LineItem = { description: string; quantity: number; unit_price: number; total: number; optional?: boolean; discount?: boolean };
type Version = {
  id: string; version_no: number; change_note: string | null; line_items: LineItem[];
  subtotal: number; vat_rate: number; vat_amount: number; total: number;
  file_url: string | null; created_at: string;
};
type Resp = { id: string; version_no: number; action: string; comment: string | null; signer_name: string | null; created_at: string };
type Offer = {
  id: string; offer_no: string | null; title: string; summary: string | null; status: string;
  current_version: number; currency: string; valid_until: string | null; decided_at: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-amber-50 text-amber-700',
  viewed: 'bg-amber-50 text-amber-700',
  changes_requested: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-600',
  withdrawn: 'bg-gray-100 text-gray-500',
};

export default function PortalOfferPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [responses, setResponses] = useState<Resp[]>([]);
  const [locale, setLocale] = useState('en');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState<'approved' | 'declined' | 'changes_requested' | null>(null);
  const [comment, setComment] = useState('');
  const [signer, setSigner] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/portal/offers/${id}`)
      .then(r => {
        if (r.status === 401) { router.replace('/portal/login'); throw new Error('unauthorized'); }
        if (!r.ok) { setNotFound(true); throw new Error('not_found'); }
        return r.json();
      })
      .then(d => {
        setOffer(d.offer); setVersions(d.versions ?? []); setResponses(d.responses ?? []); setLocale(d.locale || 'en');
        fetch(`/api/portal/offers/${id}/files`)
          .then(r => r.json())
          .then(f => { if (f.ok) setFiles(f.files ?? []); })
          .catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, router]);

  const t = portalT(locale);
  const intl = locale === 'en' ? 'en-GB' : `${locale}-${locale.toUpperCase()}`;
  const fmtMoney = (n: number) => new Intl.NumberFormat(intl, { style: 'currency', currency: offer?.currency || 'EUR' }).format(n ?? 0);
  const fmtDate = (d: string | null) => d ? new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d)) : '';

  async function submit() {
    if (!mode || !offer) return;
    setFormError('');
    if ((mode === 'approved' || mode === 'declined') && !signer.trim()) { setFormError(t('signerRequired')); return; }
    if (mode === 'changes_requested' && !comment.trim()) { setFormError(t('commentRequired')); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/offers/${offer.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, comment: comment || null, signer_name: signer || null }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || 'failed');
      setOffer(o => (o ? { ...o, status: d.status } : o));
      setSubmitted(true);
    } catch {
      setFormError(t('genericError'));
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" /></div>;
  }
  if (notFound || !offer) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">Not found.</div>
      </div>
    );
  }

  const current = versions.find(v => v.version_no === offer.current_version) ?? versions[0];
  const decided = ['approved', 'declined', 'withdrawn'].includes(offer.status);
  const canRespond = !decided && !submitted;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button onClick={() => router.push('/portal')} className="mb-5 text-xs font-medium text-gray-400 hover:text-gray-600">
        ← {t('backToOverview')}
      </button>

      {/* Offer header */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">DES Systems{offer.offer_no ? ` · ${offer.offer_no}` : ''}</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{offer.title}</h1>
              {offer.summary && <p className="mt-2 text-sm text-gray-500">{offer.summary}</p>}
            </div>
            <span className={`flex-none rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[offer.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {t(`status_${offer.status}`)}
            </span>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {t('version')} {offer.current_version}
            {offer.valid_until ? ` · ${t('validUntil')} ${fmtDate(offer.valid_until)}` : ''}
          </p>
        </div>

        {/* Line items of the current version */}
        {current && (
          <div className="px-8 py-6">
            {current.change_note && offer.current_version > 1 && (
              <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <span className="font-semibold">{t('changeNote')}: </span>{current.change_note}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pr-4">{t('description')}</th>
                    <th className="pb-3 pr-4 text-right">{t('quantity')}</th>
                    <th className="pb-3 pr-4 text-right">{t('unitPrice')}</th>
                    <th className="pb-3 text-right">{t('total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(current.line_items ?? []).map((li, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className={`py-3 pr-4 ${li.discount ? 'font-medium text-emerald-700' : 'text-gray-700'}`}>
                        {li.discount && '🏷 '}{li.description}
                        {li.optional && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{t('optionalItem')}</span>}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-600">{li.discount ? '' : li.quantity}</td>
                      <td className="py-3 pr-4 text-right text-gray-600">{li.discount ? '' : fmtMoney(li.unit_price)}</td>
                      <td className={`py-3 text-right font-medium ${li.discount ? 'text-emerald-700' : 'text-gray-900'}`}>{fmtMoney(li.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500"><span>{t('subtotal')}</span><span>{fmtMoney(current.subtotal)}</span></div>
                <div className="flex justify-between text-gray-500"><span>{t('vat')} ({current.vat_rate}%)</span><span>{fmtMoney(current.vat_amount)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900"><span>{t('total')}</span><span>{fmtMoney(current.total)}</span></div>
              </div>
            </div>
            {(current.file_url || files.length > 0) && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t('attachments')}</p>
                <div className="flex flex-wrap gap-2">
                  {files.map(f => (
                    <a key={f.name} href={`/api/portal/offers/${offer.id}/files?name=${encodeURIComponent(f.name)}`} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      📎 {f.name} <span className="text-gray-400">({(f.size / 1048576).toFixed(1)} MB)</span>
                    </a>
                  ))}
                  {current.file_url && (
                    <a href={current.file_url} target="_blank" rel="noreferrer" className="inline-block rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      {t('download')} (PDF)
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response box */}
      {submitted ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mb-2 text-3xl">✅</div>
          <p className="text-sm font-medium text-gray-700">{t('thankYou')}</p>
        </div>
      ) : canRespond && (
        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">{t('respondTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('respondHint')}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setMode('approved')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === 'approved' ? 'bg-emerald-600 text-white' : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
              {t('approve')}
            </button>
            <button onClick={() => setMode('changes_requested')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === 'changes_requested' ? 'bg-blue-600 text-white' : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
              {t('requestChanges')}
            </button>
            <button onClick={() => setMode('declined')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === 'declined' ? 'bg-red-600 text-white' : 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'}`}>
              {t('decline')}
            </button>
          </div>

          {mode && (
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">{t('commentLabel')}</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                  placeholder={t('commentPlaceholder')}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              {(mode === 'approved' || mode === 'declined') && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">{t('signerLabel')}</label>
                  <input type="text" value={signer} onChange={e => setSigner(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  <p className="mt-1 text-xs text-gray-400">{t('signerHint')}</p>
                </div>
              )}
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button onClick={submit} disabled={submitting}
                className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50">
                {submitting ? t('busy') : t('submit')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Previous responses */}
      {responses.length > 0 && (
        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">{t('yourResponses')}</h2>
          <div className="space-y-3">
            {responses.map(r => (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.action] ?? 'bg-gray-100 text-gray-500'}`}>
                    {r.action === 'comment' ? '💬' : ''} {t(`status_${r.action}`) !== `status_${r.action}` ? t(`status_${r.action}`) : r.action}
                  </span>
                  <span className="text-xs text-gray-400">{t('version')} {r.version_no} · {fmtDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-2 text-gray-700">{r.comment}</p>}
                {r.signer_name && <p className="mt-1 text-xs text-gray-400">— {r.signer_name}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version history */}
      {versions.length > 1 && (
        <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">{t('versionHistory')}</h2>
          <div className="space-y-2">
            {versions.map(v => (
              <div key={v.id} className="flex items-center justify-between border-b border-dashed border-gray-100 py-2 text-sm last:border-0">
                <div>
                  <span className={`font-medium ${v.version_no === offer.current_version ? 'text-gray-900' : 'text-gray-500'}`}>
                    {t('version')} {v.version_no}{v.version_no === offer.current_version ? ' ✓' : ''}
                  </span>
                  {v.change_note && <span className="ml-2 text-xs text-gray-400">{v.change_note}</span>}
                </div>
                <div className="text-right text-xs text-gray-400">
                  <span className="mr-3 font-medium text-gray-600">{fmtMoney(v.total)}</span>
                  {fmtDate(v.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-8 border-t border-gray-200 pt-5 text-xs text-gray-400">
        <p>{t('questions')}</p>
        <p className="mt-2">{t('poweredBy')}</p>
      </footer>
    </div>
  );
}
