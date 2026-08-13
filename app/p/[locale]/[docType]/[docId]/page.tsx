import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase-server';
import { verifyAccess, trackView, type DocumentType } from '@/lib/auth/public-access';
import { LOCALE_LABELS, isSupportedLocale, type SupportedLocale } from '@/lib/comm/resolve-locale';
import { DOC_LABELS, DOC_TYPE_TITLES } from '@/lib/documents/labels';

const VALID_DOC_TYPES: DocumentType[] = ['order', 'quotation', 'invoice', 'handover'];

function fmtCurrency(amount: number | null | undefined, locale: string, currency = 'EUR'): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

function fmtDate(date: string | null | undefined, locale: string): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
}

function localeToIntl(locale: SupportedLocale): string {
  const map: Record<SupportedLocale, string> = { en: 'en-GB', nl: 'nl-NL', de: 'de-DE', fr: 'fr-FR', tr: 'tr-TR' };
  return map[locale];
}

async function fetchDocument(docType: DocumentType, docId: string) {
  const supabase = getServerClient();

  if (docType === 'order') {
    const { data } = await supabase
      .from('sal_orders')
      .select('*, mdm_business_partners(id, name, company_name, email)')
      .eq('id', docId)
      .single();
    return data;
  }

  if (docType === 'quotation') {
    const { data } = await supabase
      .from('sal_quotations')
      .select('*, mdm_business_partners(id, name, company_name, email)')
      .eq('id', docId)
      .single();
    return data;
  }

  if (docType === 'invoice') {
    const { data } = await supabase
      .from('fin_invoices')
      .select('*, mdm_business_partners(id, name, company_name, email)')
      .eq('id', docId)
      .single();
    return data;
  }

  if (docType === 'handover') {
    const { data } = await supabase
      .from('sal_orders')
      .select('*, mdm_business_partners(id, name, company_name, email)')
      .eq('id', docId)
      .single();
    return data;
  }

  return null;
}

function getDocNumber(docType: DocumentType, doc: any): string {
  if (docType === 'order' || docType === 'handover') return doc.order_number ?? doc.id?.slice(0, 8) ?? '';
  if (docType === 'quotation') return doc.quote_number ?? doc.id?.slice(0, 8) ?? '';
  if (docType === 'invoice') return doc.invoice_number ?? doc.id?.slice(0, 8) ?? '';
  return doc.id?.slice(0, 8) ?? '';
}

function getDocDate(docType: DocumentType, doc: any): string | null {
  return doc.created_at ?? doc.date ?? null;
}

function getPartner(doc: any): { name: string; company: string } {
  const p = Array.isArray(doc.mdm_business_partners) ? doc.mdm_business_partners[0] : doc.mdm_business_partners;
  if (!p) return { name: '', company: '' };
  return { name: p.name ?? '', company: p.company_name ?? '' };
}

function getLineItems(docType: DocumentType, doc: any): { description: string; quantity: number; unitPrice: number; total: number }[] {
  const items = doc.line_items ?? doc.lines ?? doc.items ?? [];
  if (!Array.isArray(items)) return [];
  return items.map((item: any) => ({
    description: item.description ?? item.name ?? item.title ?? '',
    quantity: item.quantity ?? item.qty ?? 1,
    unitPrice: item.unit_price ?? item.unitPrice ?? item.price ?? 0,
    total: item.total ?? (item.quantity ?? 1) * (item.unit_price ?? item.price ?? 0),
  }));
}

function getTotals(docType: DocumentType, doc: any): { subtotal: number; vat: number; total: number; currency: string } {
  const currency = doc.currency ?? 'EUR';
  if (docType === 'invoice') {
    const amount = Number(doc.amount ?? 0);
    const vatAmount = Number(doc.vat_amount ?? 0);
    return { subtotal: amount, vat: vatAmount, total: amount + vatAmount, currency };
  }
  const subtotal = Number(doc.subtotal ?? doc.amount ?? doc.sale_price ?? doc.total_amount ?? 0);
  const vat = Number(doc.vat_amount ?? doc.vat ?? 0);
  const total = Number(doc.total ?? doc.grand_total ?? subtotal + vat);
  return { subtotal, vat, total, currency };
}

function AccessDeniedPage({ expired, locale }: { expired: boolean; locale: SupportedLocale }) {
  const messages: Record<SupportedLocale, { expired: string; denied: string; contact: string }> = {
    en: { expired: 'This link has expired', denied: 'Access denied', contact: 'Please contact support for assistance.' },
    nl: { expired: 'Deze link is verlopen', denied: 'Toegang geweigerd', contact: 'Neem contact op met support voor hulp.' },
    de: { expired: 'Dieser Link ist abgelaufen', denied: 'Zugriff verweigert', contact: 'Bitte kontaktieren Sie den Support.' },
    fr: { expired: 'Ce lien a expiré', denied: 'Accès refusé', contact: 'Veuillez contacter le support.' },
    tr: { expired: 'Bu bağlantının süresi doldu', denied: 'Erişim reddedildi', contact: 'Destek ile iletişime geçin.' },
  };
  const msg = messages[locale];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          {expired ? msg.expired : msg.denied}
        </h1>
        <p className="mb-8 text-sm text-gray-500">{msg.contact}</p>
        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400">Powered by DES Systems</p>
        </div>
      </div>
    </div>
  );
}

export default async function PublicDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; docType: string; docId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale: rawLocale, docType: rawDocType, docId } = await params;
  const { token } = await searchParams;

  if (!isSupportedLocale(rawLocale)) notFound();
  const locale = rawLocale as SupportedLocale;
  const intlLocale = localeToIntl(locale);

  if (!VALID_DOC_TYPES.includes(rawDocType as DocumentType)) notFound();
  const docType = rawDocType as DocumentType;

  const access = await verifyAccess({ documentType: docType, documentId: docId, token });

  if (!access.valid) {
    return <AccessDeniedPage expired={access.expired} locale={locale} />;
  }

  if (access.accessId) {
    await trackView(access.accessId);
  }

  const doc = await fetchDocument(docType, docId);
  if (!doc) notFound();

  const labels = DOC_LABELS[locale];
  const docTitle = DOC_TYPE_TITLES[docType]?.[locale] ?? docType;
  const docNumber = getDocNumber(docType, doc);
  const docDate = fmtDate(getDocDate(docType, doc), intlLocale);
  const partner = getPartner(doc);
  const customerDisplay = partner.company || partner.name || '-';

  if (docType === 'handover') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">DES Systems</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">{docTitle}</h1>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{labels.number}: <span className="font-medium text-gray-900">{docNumber}</span></p>
                <p>{labels.date}: {docDate}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-8 py-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{labels.customer}</p>
              <p className="text-sm font-medium text-gray-900">{customerDisplay}</p>
            </div>

            {(doc.vehicle_make || doc.vehicle_model || doc.vin || doc.license_plate) && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {locale === 'nl' ? 'Voertuiggegevens' : locale === 'de' ? 'Fahrzeugdaten' : locale === 'fr' ? 'Données du véhicule' : locale === 'tr' ? 'Araç Bilgileri' : 'Vehicle Details'}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {doc.vehicle_make && <div><span className="text-gray-500">Make:</span> <span className="font-medium text-gray-900">{doc.vehicle_make}</span></div>}
                  {doc.vehicle_model && <div><span className="text-gray-500">Model:</span> <span className="font-medium text-gray-900">{doc.vehicle_model}</span></div>}
                  {doc.vin && <div><span className="text-gray-500">VIN:</span> <span className="font-mono text-gray-900">{doc.vin}</span></div>}
                  {doc.license_plate && <div><span className="text-gray-500">{locale === 'nl' ? 'Kenteken' : 'Plate'}:</span> <span className="font-mono text-gray-900">{doc.license_plate}</span></div>}
                  {doc.mileage_km != null && <div><span className="text-gray-500">{locale === 'nl' ? 'Km-stand' : 'Mileage'}:</span> <span className="font-medium text-gray-900">{Number(doc.mileage_km).toLocaleString(intlLocale)} km</span></div>}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{labels.signature}</p>
              {doc.signed_by ? (
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">{labels.signedBy}:</span> <span className="font-medium text-gray-900">{doc.signed_by}</span></p>
                  {doc.signed_at && <p><span className="text-gray-500">{labels.signedAt}:</span> <span className="font-medium text-gray-900">{fmtDate(doc.signed_at, intlLocale)}</span></p>}
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {locale === 'nl' ? 'Ondertekend' : locale === 'de' ? 'Unterzeichnet' : locale === 'fr' ? 'Signé' : locale === 'tr' ? 'İmzalandı' : 'Signed'}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  {locale === 'nl' ? 'Nog niet ondertekend' : locale === 'de' ? 'Noch nicht unterzeichnet' : locale === 'fr' ? 'Pas encore signé' : locale === 'tr' ? 'Henüz imzalanmadı' : 'Not yet signed'}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 px-8 py-4">
            <p className="text-center text-xs text-gray-400">Powered by DES Systems</p>
          </div>
        </div>
      </div>
    );
  }

  const lineItems = getLineItems(docType, doc);
  const totals = getTotals(docType, doc);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">DES Systems</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{docTitle}</h1>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{labels.number}: <span className="font-medium text-gray-900">{docNumber}</span></p>
              <p>{labels.date}: {docDate}</p>
              {docType === 'invoice' && doc.due_date && (
                <p>{labels.dueDate}: {fmtDate(doc.due_date, intlLocale)}</p>
              )}
              {docType === 'quotation' && doc.valid_until && (
                <p>{labels.validUntil}: {fmtDate(doc.valid_until, intlLocale)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 px-8 py-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{labels.customer}</p>
            <p className="text-sm font-medium text-gray-900">{customerDisplay}</p>
          </div>

          {doc.reference && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{labels.reference}</p>
              <p className="text-sm text-gray-700">{doc.reference}</p>
            </div>
          )}

          {lineItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pr-4">{labels.description}</th>
                    <th className="pb-3 pr-4 text-right">{labels.quantity}</th>
                    <th className="pb-3 pr-4 text-right">{labels.unitPrice}</th>
                    <th className="pb-3 text-right">{labels.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-3 pr-4 text-gray-700">{item.description}</td>
                      <td className="py-3 pr-4 text-right text-gray-600">{item.quantity}</td>
                      <td className="py-3 pr-4 text-right text-gray-600">{fmtCurrency(item.unitPrice, intlLocale, totals.currency)}</td>
                      <td className="py-3 text-right font-medium text-gray-900">{fmtCurrency(item.total, intlLocale, totals.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>{labels.subtotal}</span>
                <span>{fmtCurrency(totals.subtotal, intlLocale, totals.currency)}</span>
              </div>
              {totals.vat > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{labels.vat}</span>
                  <span>{fmtCurrency(totals.vat, intlLocale, totals.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>{labels.grandTotal}</span>
                <span>{fmtCurrency(totals.total, intlLocale, totals.currency)}</span>
              </div>
            </div>
          </div>

          {docType === 'invoice' && doc.payment_terms && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{labels.paymentTerms}</p>
              <p className="text-gray-700">{doc.payment_terms}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-8 py-4">
          <p className="text-center text-xs text-gray-400">Powered by DES Systems</p>
        </div>
      </div>
    </div>
  );
}
