import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// NL Quarterly BTW Aangifte export
// Generates a structured XML file compatible with Dutch Belastingdienst filing
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const periodId = sp.get('period_id');
  const format = sp.get('format') ?? 'xml';

  if (!periodId) return NextResponse.json({ error: 'period_id required' }, { status: 400 });

  const supabase = getServerClient();

  const { data: period, error: pErr } = await supabase
    .from('shop_vat_periods')
    .select('*')
    .eq('id', periodId)
    .single();
  if (pErr || !period) return NextResponse.json({ error: pErr?.message ?? 'period not found' }, { status: 404 });

  const { data: txns } = await supabase
    .from('shop_vat_transactions')
    .select('*')
    .gte('transaction_date', period.period_start)
    .lte('transaction_date', period.period_end)
    .order('transaction_date');

  const rows = txns ?? [];

  // Aggregate by rubric (Dutch BTW aangifte rubrieken)
  const agg: Record<string, { omzet: number; btw: number }> = {};
  for (const tx of rows) {
    const regime = tx.btw_regime ?? 'normaal';
    const rubric = regimeToRubric(regime);
    if (!agg[rubric]) agg[rubric] = { omzet: 0, btw: 0 };
    agg[rubric].omzet += Number(tx.taxable_amount_cents ?? 0);
    agg[rubric].btw += Number(tx.vat_amount_cents ?? 0);
  }

  // Total output VAT (verschuldigde BTW)
  const totalOutput = Object.values(agg).reduce((s, v) => s + v.btw, 0);
  // Input VAT (voorbelasting) — from period record
  const totalInput = Number(period.total_input_vat_cents ?? 0);
  const netVat = totalOutput - totalInput;

  if (format === 'json') {
    return NextResponse.json({
      period: { label: period.period_label, start: period.period_start, end: period.period_end },
      rubrieken: Object.entries(agg).map(([rubric, v]) => ({
        rubric, omzet_cents: v.omzet, btw_cents: v.btw,
      })),
      totals: { output_vat_cents: totalOutput, input_vat_cents: totalInput, net_vat_cents: netVat },
      transactions_count: rows.length,
    });
  }

  // XML format — NL Belastingdienst Aangifte OB structure
  const rubriekXml = Object.entries(agg).map(([rubric, v]) =>
    `    <Rubriek code="${rubric}">
      <Omzet>${(v.omzet / 100).toFixed(2)}</Omzet>
      <BtwBedrag>${(v.btw / 100).toFixed(2)}</BtwBedrag>
    </Rubriek>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AangifteOmzetbelasting>
  <Aangiftejaar>${new Date(period.period_start).getFullYear()}</Aangiftejaar>
  <AangiftePeriode>${period.period_label}</AangiftePeriode>
  <DatumVan>${period.period_start}</DatumVan>
  <DatumTot>${period.period_end}</DatumTot>
  <Rubrieken>
${rubriekXml}
  </Rubrieken>
  <Voorbelasting>${(totalInput / 100).toFixed(2)}</Voorbelasting>
  <TotaalVerschuldigdeBTW>${(totalOutput / 100).toFixed(2)}</TotaalVerschuldigdeBTW>
  <TeBetalenOfTeOntvangen>${(netVat / 100).toFixed(2)}</TeBetalenOfTeOntvangen>
  <AantalTransacties>${rows.length}</AantalTransacties>
</AangifteOmzetbelasting>`;

  const filename = `aangifte-ob-${period.period_label.replace(/\s+/g, '-').toLowerCase()}.xml`;
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function regimeToRubric(regime: string): string {
  const map: Record<string, string> = {
    normaal: '1a',       // Leveringen/diensten belast met hoog tarief
    laag: '1b',          // Leveringen/diensten belast met laag tarief
    overig: '1c',        // Leveringen/diensten belast met overige tarieven
    verlegd: '2a',       // Verleggingsregelingen
    intracommunautair: '3a', // Intracommunautaire leveringen
    export: '3b',        // Export buiten EU
    marge: '1e',         // Margeregeling
    vrijgesteld: '1d',   // Vrijgestelde leveringen/diensten
    oss: '3c',           // OSS — One Stop Shop
  };
  return map[regime] ?? '1a';
}
