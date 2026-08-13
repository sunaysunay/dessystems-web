import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { send } from '@/lib/comm/send';
import { resolveLocale } from '@/lib/comm/resolve-locale';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId, category, locale: localeOverride, brandId, toOverride } = await req.json();

  if (!tenantId || !category) {
    return NextResponse.json({ error: 'tenantId and category required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: invoice } = await supabase
    .from('fin_invoices')
    .select('*, mdm_business_partners ( company_name, email, preferred_locale, country )')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const partner = Array.isArray(invoice.mdm_business_partners)
    ? invoice.mdm_business_partners[0]
    : invoice.mdm_business_partners;

  const locale = await resolveLocale({
    override: localeOverride,
    documentLocale: invoice.locale,
    partnerLocale: partner?.preferred_locale,
    partnerCountry: partner?.country,
    tenantId,
    supabase,
  });

  try {
    const result = await send({
      contextType: 'invoice',
      recordId: id,
      tenantId,
      category,
      locale,
      brandId,
      toOverride,
    });

    return NextResponse.json({ success: true, historyId: result.historyId, locale });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
