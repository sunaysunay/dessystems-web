/** PDF generation for multilanguage business documents using headless Chrome. */

import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { SupportedLocale } from '@/lib/comm/resolve-locale';
import { DOC_LABELS, DOC_TYPE_TITLES } from './labels';

const TMP_DIR = '/tmp/des-pdf-render';
const CHROME_BIN = '/usr/bin/google-chrome';

export interface PdfOptions {
  locale: SupportedLocale;
  documentType: string;
  documentNumber: string;
  tenantName: string;
  tenantLogo?: string;
  tenantAddress?: string;
  customerName: string;
  customerAddress?: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  notes?: string;
  currency?: string;
}

export async function renderDocumentPdf(options: PdfOptions): Promise<Buffer> {
  if (!existsSync(TMP_DIR)) {
    mkdirSync(TMP_DIR, { recursive: true });
  }

  const id = randomUUID();
  const htmlPath = join(TMP_DIR, `${id}.html`);
  const pdfPath = join(TMP_DIR, `${id}.pdf`);

  try {
    const html = buildDocumentHtml(options);
    writeFileSync(htmlPath, html, 'utf-8');

    execSync(
      [
        CHROME_BIN,
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-software-rasterizer',
        `--print-to-pdf=${pdfPath}`,
        '--no-pdf-header-footer',
        `file://${htmlPath}`,
      ].join(' '),
      { stdio: 'pipe', timeout: 30_000 },
    );

    return readFileSync(pdfPath);
  } finally {
    try { unlinkSync(htmlPath); } catch {}
    try { unlinkSync(pdfPath); } catch {}
  }
}

function formatNumber(value: number, locale: SupportedLocale): string {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-GB',
    nl: 'nl-NL',
    de: 'de-DE',
    fr: 'fr-FR',
    tr: 'tr-TR',
  };
  return new Intl.NumberFormat(localeMap[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDocumentHtml(options: PdfOptions): string {
  const labels = DOC_LABELS[options.locale];
  const docTitle =
    DOC_TYPE_TITLES[options.documentType]?.[options.locale] ?? options.documentType;
  const currency = options.currency ?? '€';
  const fmt = (v: number) => `${currency} ${formatNumber(v, options.locale)}`;

  const tenantAddressHtml = options.tenantAddress
    ? escapeHtml(options.tenantAddress).replace(/\n/g, '<br>')
    : '';

  const customerAddressHtml = options.customerAddress
    ? escapeHtml(options.customerAddress).replace(/\n/g, '<br>')
    : '';

  const logoHtml = options.tenantLogo
    ? `<img src="${escapeHtml(options.tenantLogo)}" alt="" class="logo" />`
    : '';

  const metaRows: string[] = [];
  metaRows.push(`<tr><td class="meta-label">${escapeHtml(labels.number)}</td><td>${escapeHtml(options.documentNumber)}</td></tr>`);
  metaRows.push(`<tr><td class="meta-label">${escapeHtml(labels.date)}</td><td>${escapeHtml(options.date)}</td></tr>`);
  if (options.dueDate) {
    metaRows.push(`<tr><td class="meta-label">${escapeHtml(labels.dueDate)}</td><td>${escapeHtml(options.dueDate)}</td></tr>`);
  }
  if (options.validUntil) {
    metaRows.push(`<tr><td class="meta-label">${escapeHtml(labels.validUntil)}</td><td>${escapeHtml(options.validUntil)}</td></tr>`);
  }

  const lineItemRows = options.lineItems
    .map(
      (item, i) => `
      <tr>
        <td class="col-num">${i + 1}</td>
        <td class="col-desc">${escapeHtml(item.description)}</td>
        <td class="col-qty">${formatNumber(item.quantity, options.locale)}</td>
        <td class="col-price">${fmt(item.unitPrice)}</td>
        <td class="col-total">${fmt(item.total)}</td>
      </tr>`,
    )
    .join('');

  const notesHtml = options.notes
    ? `<div class="notes"><strong>${escapeHtml(labels.reference)}</strong><p>${escapeHtml(options.notes)}</p></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${options.locale}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)} ${escapeHtml(options.documentNumber)}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm 25mm 18mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding-bottom: 16px;
    border-bottom: 2px solid #2563eb;
  }

  .tenant-info {
    text-align: right;
  }

  .tenant-name {
    font-size: 16pt;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .tenant-address {
    font-size: 9pt;
    color: #64748b;
    line-height: 1.4;
  }

  .logo {
    max-height: 60px;
    max-width: 180px;
    object-fit: contain;
  }

  .parties {
    display: flex;
    justify-content: space-between;
    margin-bottom: 28px;
  }

  .customer-block {
    max-width: 50%;
  }

  .customer-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #94a3b8;
    margin-bottom: 4px;
  }

  .customer-name {
    font-size: 11pt;
    font-weight: 600;
    color: #1e293b;
  }

  .customer-address {
    font-size: 9pt;
    color: #475569;
    margin-top: 2px;
  }

  .meta-table {
    text-align: right;
  }

  .meta-table td {
    padding: 2px 0;
    font-size: 9pt;
  }

  .meta-label {
    color: #64748b;
    padding-right: 12px;
    font-weight: 500;
  }

  .doc-title {
    font-size: 18pt;
    font-weight: 700;
    color: #2563eb;
    margin-bottom: 20px;
  }

  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }

  table.items thead th {
    background: #f1f5f9;
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #475569;
    padding: 8px 10px;
    border-bottom: 1px solid #cbd5e1;
  }

  table.items tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }

  table.items tbody tr:last-child td {
    border-bottom: 2px solid #cbd5e1;
  }

  .col-num {
    width: 6%;
    text-align: center;
  }

  .col-desc {
    width: 44%;
  }

  .col-qty {
    width: 12%;
    text-align: right;
  }

  .col-price {
    width: 19%;
    text-align: right;
  }

  .col-total {
    width: 19%;
    text-align: right;
  }

  .totals {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 30px;
  }

  .totals-table {
    min-width: 260px;
  }

  .totals-table td {
    padding: 4px 0;
    font-size: 10pt;
  }

  .totals-table td:first-child {
    color: #64748b;
    padding-right: 24px;
  }

  .totals-table td:last-child {
    text-align: right;
    font-weight: 500;
  }

  .totals-table .grand-total td {
    padding-top: 8px;
    border-top: 2px solid #1e293b;
    font-size: 12pt;
    font-weight: 700;
    color: #1e293b;
  }

  .notes {
    background: #f8fafc;
    border-left: 3px solid #2563eb;
    padding: 12px 16px;
    margin-bottom: 30px;
    font-size: 9pt;
    color: #475569;
  }

  .notes strong {
    display: block;
    margin-bottom: 4px;
    color: #334155;
  }

  .notes p {
    white-space: pre-wrap;
  }

  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8pt;
    color: #94a3b8;
    padding: 8px 18mm;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>

<div class="header">
  <div>
    ${logoHtml}
  </div>
  <div class="tenant-info">
    <div class="tenant-name">${escapeHtml(options.tenantName)}</div>
    ${tenantAddressHtml ? `<div class="tenant-address">${tenantAddressHtml}</div>` : ''}
  </div>
</div>

<div class="doc-title">${escapeHtml(docTitle)}</div>

<div class="parties">
  <div class="customer-block">
    <div class="customer-label">${escapeHtml(labels.customer)}</div>
    <div class="customer-name">${escapeHtml(options.customerName)}</div>
    ${customerAddressHtml ? `<div class="customer-address">${customerAddressHtml}</div>` : ''}
  </div>
  <div>
    <table class="meta-table">
      ${metaRows.join('\n      ')}
    </table>
  </div>
</div>

<table class="items">
  <thead>
    <tr>
      <th class="col-num">#</th>
      <th class="col-desc">${escapeHtml(labels.description)}</th>
      <th class="col-qty">${escapeHtml(labels.quantity)}</th>
      <th class="col-price">${escapeHtml(labels.unitPrice)}</th>
      <th class="col-total">${escapeHtml(labels.total)}</th>
    </tr>
  </thead>
  <tbody>
    ${lineItemRows}
  </tbody>
</table>

<div class="totals">
  <table class="totals-table">
    <tr>
      <td>${escapeHtml(labels.subtotal)}</td>
      <td>${fmt(options.subtotal)}</td>
    </tr>
    <tr>
      <td>${escapeHtml(labels.vat)} (${formatNumber(options.vatRate, options.locale)}%)</td>
      <td>${fmt(options.vatAmount)}</td>
    </tr>
    <tr class="grand-total">
      <td>${escapeHtml(labels.grandTotal)}</td>
      <td>${fmt(options.grandTotal)}</td>
    </tr>
  </table>
</div>

${notesHtml}

<div class="footer">
  ${escapeHtml(options.tenantName)} &mdash; ${escapeHtml(docTitle)} ${escapeHtml(options.documentNumber)}
</div>

</body>
</html>`;
}
