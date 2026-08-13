import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function buildInvoiceHtml(invoice: Record<string, any>, lines: Record<string, any>[]) {
  const rows = lines.map(l =>
    `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">${l.description ?? l.variant_id ?? '—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${l.qty ?? 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">&euro; ${formatCents(l.subtotal_cents ?? 0)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${((l.tax_rate ?? 0) * 100).toFixed(0)}%</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">&euro; ${formatCents(l.total_cents ?? 0)}</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; font-size: 13px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .company { font-size: 11px; color: #64748b; line-height: 1.6; }
  .invoice-title { font-size: 28px; font-weight: 700; color: #0f172a; }
  .meta { font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.8; }
  .billing { margin-bottom: 30px; padding: 16px; background: #f8fafc; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; }
  .totals { float: right; width: 260px; }
  .totals tr td { padding: 4px 8px; font-size: 12px; }
  .totals tr:last-child td { font-weight: 700; font-size: 14px; border-top: 2px solid #0f172a; padding-top: 8px; }
  .footer { margin-top: 60px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .btw-tag { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
</style></head><body>
<div class="header">
  <div>
    <div class="invoice-title">FACTUUR</div>
    <div class="meta">
      <strong>Nr:</strong> ${invoice.invoice_number ?? '—'}<br>
      <strong>Datum:</strong> ${invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString('nl-NL') : new Date(invoice.created_at).toLocaleDateString('nl-NL')}<br>
      ${invoice.due_date ? `<strong>Vervaldatum:</strong> ${new Date(invoice.due_date).toLocaleDateString('nl-NL')}<br>` : ''}
      ${invoice.btw_regime ? `<strong>BTW regime:</strong> <span class="btw-tag">${invoice.btw_regime}</span>` : ''}
    </div>
  </div>
  <div class="company">
    DES Group B.V.<br>
    KVK: 12345678<br>
    BTW: NL123456789B01<br>
    IBAN: NL00 ABNA 0000 0000 00
  </div>
</div>

<div class="billing">
  <strong>Factuuradres:</strong><br>
  ${invoice.billing_name ?? '—'}<br>
  ${(invoice.billing_address ?? '').replace(/\n/g, '<br>')}
</div>

<table>
  <thead><tr>
    <th>Omschrijving</th><th style="text-align:center;">Aantal</th><th style="text-align:right;">Subtotaal</th><th style="text-align:right;">BTW</th><th style="text-align:right;">Totaal</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>

<table class="totals">
  <tr><td>Subtotaal</td><td style="text-align:right;">&euro; ${formatCents(invoice.subtotal_cents ?? 0)}</td></tr>
  <tr><td>BTW</td><td style="text-align:right;">&euro; ${formatCents(invoice.tax_cents ?? 0)}</td></tr>
  <tr><td>Totaal</td><td style="text-align:right;">&euro; ${formatCents(invoice.total_cents ?? 0)}</td></tr>
</table>

${invoice.notes ? `<p style="clear:both;margin-top:40px;font-size:11px;color:#64748b;">${invoice.notes}</p>` : '<div style="clear:both;"></div>'}

<div class="footer">
  DES Group B.V. &middot; Factuur ${invoice.invoice_number ?? ''} &middot; Gegenereerd op ${new Date().toLocaleDateString('nl-NL')}
</div>
</body></html>`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const invoiceId = sp.get('id');
  if (!invoiceId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = getServerClient();
  const { data: invoice, error } = await supabase.from('shop_invoices').select('*').eq('id', invoiceId).single();
  if (error || !invoice) return NextResponse.json({ error: error?.message ?? 'not found' }, { status: 404 });

  const { data: lines } = await supabase.from('shop_invoice_lines').select('*').eq('invoice_id', invoiceId).order('created_at');

  const html = buildInvoiceHtml(invoice, lines ?? []);

  const format = sp.get('format');
  if (format === 'html') {
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pptr: any;
  try {
    const mod = 'puppeteer';
    pptr = await import(/* webpackIgnore: true */ mod);
  } catch {
    return NextResponse.json({
      error: 'Puppeteer not installed. Use format=html for preview, or install puppeteer for PDF.',
      html_preview: true,
    }, { status: 501 });
  }

  const browser = await pptr.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' } });
  await browser.close();

  const filename = `factuur-${invoice.invoice_number ?? invoice.id}.pdf`;
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
