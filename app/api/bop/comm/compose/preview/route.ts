import { NextRequest, NextResponse } from 'next/server';
import { CONTEXT_BINDINGS, type ContextType } from '@/lib/comm/context-bindings';
import { resolveVariables, resolveTemplateFields } from '@/lib/comm/resolver';
import { getCompiledTemplate } from '@/lib/comm/compile';

export const dynamic = 'force-dynamic';

// POST /api/bop/comm/compose/preview — full 3-stage render, no send. Safe to
// call any time; never touches SMTP or bop_comm_history.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  const { contextType, recordId, tenantId, category, locale, brandId } = body as {
    contextType?: ContextType; recordId?: string; tenantId?: number; category?: string; locale?: string; brandId?: string;
  };
  if (!contextType || !recordId || !tenantId || !category) {
    return NextResponse.json({ error: 'contextType, recordId, tenantId and category are required' }, { status: 400 });
  }

  try {
    const binding = CONTEXT_BINDINGS[contextType];
    const ctx = await binding.loader(recordId, tenantId);
    if (!ctx) return NextResponse.json({ error: `${contextType} record ${recordId} not found for tenant ${tenantId}` }, { status: 404 });

    const compiled = await getCompiledTemplate(tenantId, category, locale ?? 'en', brandId ?? 'default');
    const t = compiled.templateRow;
    const slotFilled = compiled.html.replace('<!-- {{SLOT.Content}} -->', '');
    const ctaUrl = t.cta_url_pattern
      ? Object.entries(ctx.scope).reduce((u, [ns, kv]) =>
          Object.entries(kv).reduce((uu, [k, v]) => uu.split(`{{${ns}.${k}}}`).join(v), u), t.cta_url_pattern)
      : '';
    const { fields, missing: fieldMissing } = resolveTemplateFields(t, ctx.scope);
    const { html, missing: htmlMissing } = resolveVariables(slotFilled, ctx.scope, { ...fields, 'Cta.Url': ctaUrl });
    const missing = [...new Set([...fieldMissing, ...htmlMissing])];

    return NextResponse.json({ html, subject: fields['Email.Subject'], missing, scope: ctx.scope, recipients: ctx.recipients });
  } catch (err) {
    console.error('[api/bop/comm/compose/preview]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Preview failed' }, { status: 500 });
  }
}
