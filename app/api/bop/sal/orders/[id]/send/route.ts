import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { send } from '@/lib/comm/send';
import { resolveLocale } from '@/lib/comm/resolve-locale';
import { renderDocumentPdf } from '@/lib/documents/pdf-renderer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId, category, locale: localeOverride, brandId, toOverride, attachPdf } = await req.json();

  if (!tenantId || !category) {
    return NextResponse.json({ error: 'tenantId and category required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: order } = await supabase
    .from('sal_orders')
    .select('*, mdm_business_partners ( company_name, email, preferred_locale, country )')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const partner = Array.isArray(order.mdm_business_partners)
    ? order.mdm_business_partners[0]
    : order.mdm_business_partners;

  const locale = await resolveLocale({
    override: localeOverride,
    documentLocale: order.locale,
    partnerLocale: partner?.preferred_locale,
    partnerCountry: partner?.country,
    tenantId,
    supabase,
  });

  try {
    const result = await send({
      contextType: 'order',
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
