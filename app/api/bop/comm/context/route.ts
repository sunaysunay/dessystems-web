import { NextRequest, NextResponse } from 'next/server';
import { CONTEXT_BINDINGS, type ContextType } from '@/lib/comm/context-bindings';

export const dynamic = 'force-dynamic';

// GET /api/bop/comm/context?contextType=X&recordId=Y&tenantId=Z
// Loader-only, no template/compile involved — powers the composer's
// ContextRail (the bound object card) independent of which template is
// picked. Also returns the binding's allowed categories/smartObjects so the
// client doesn't need its own hardcoded copy of CONTEXT_BINDINGS.
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const contextType = p.get('contextType') as ContextType | null;
  const recordId = p.get('recordId');
  const tenantId = Number(p.get('tenantId') ?? '0');

  if (!contextType || !recordId || !tenantId) {
    return NextResponse.json({ error: 'contextType, recordId and tenantId are required' }, { status: 400 });
  }
  const binding = CONTEXT_BINDINGS[contextType];
  if (!binding) return NextResponse.json({ error: `Unknown contextType "${contextType}"` }, { status: 400 });

  const ctx = await binding.loader(recordId, tenantId);
  if (!ctx) return NextResponse.json({ error: `${contextType} record ${recordId} not found for tenant ${tenantId}` }, { status: 404 });

  return NextResponse.json({
    scope: ctx.scope, recipients: ctx.recipients, links: ctx.links,
    categories: binding.categories, smartObjects: binding.smartObjects, primaryStyle: binding.primaryStyle,
  });
}
