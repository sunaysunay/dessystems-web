import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { send, UnboundVariablesError } from '@/lib/comm/send';
import { resolveLocale } from '@/lib/comm/resolve-locale';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const { tenantId, category, locale, brandId, toOverride } = body as {
    tenantId?: number;
    category?: string;
    locale?: string;
    brandId?: string;
    toOverride?: { to: string; name?: string }[];
  };

  if (!tenantId || !category) {
    return NextResponse.json({ error: 'tenantId and category are required' }, { status: 400 });
  }

  const supabase = getServerClient();

  const { data: lead } = await supabase
    .from('crm_leads')
    .select('id, locale, partner_id, mdm_business_partners ( preferred_locale, country )')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const partner = Array.isArray(lead.mdm_business_partners)
    ? lead.mdm_business_partners[0] ?? null
    : lead.mdm_business_partners ?? null;

  const resolvedLocale = await resolveLocale({
    override: locale,
    leadLocale: lead.locale,
    partnerLocale: (partner as any)?.preferred_locale,
    partnerCountry: (partner as any)?.country,
    tenantId,
  });

  try {
    const result = await send({
      contextType: 'crm_lead',
      recordId: id,
      tenantId,
      category,
      locale: resolvedLocale,
      brandId,
      toOverride,
    });

    await supabase.from('crm_events').insert({
      tenant_id: tenantId,
      lead_id: id,
      event_type: 'email.sent',
      meta: { historyId: result.historyId, category, locale: resolvedLocale },
    });

    return NextResponse.json({ success: true, historyId: result.historyId });
  } catch (err) {
    if (err instanceof UnboundVariablesError) {
      return NextResponse.json({ error: err.message, missing: err.missing }, { status: 422 });
    }
    console.error('[api/bop/crm/leads/send]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 });
  }
}
