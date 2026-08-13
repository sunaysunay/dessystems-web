import { NextRequest, NextResponse } from 'next/server';
import { send, UnboundVariablesError } from '@/lib/comm/send';
import type { ContextType } from '@/lib/comm/context-bindings';

export const dynamic = 'force-dynamic';

// POST /api/bop/comm/compose/send
// Body: { contextType, recordId, tenantId, category, locale, brandId?, toOverride? }
// tenantId comes from the request body (not ?tenant=) per plan §3, matching
// the existing bop-listings POST handler's own tenant_id-in-body convention.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const { contextType, recordId, tenantId, category, locale, brandId, toOverride } = body as {
    contextType?: ContextType; recordId?: string; tenantId?: number;
    category?: string; locale?: string; brandId?: string;
    toOverride?: { to: string; name?: string }[];
  };

  if (!contextType || !recordId || !tenantId || !category) {
    return NextResponse.json({ error: 'contextType, recordId, tenantId and category are required' }, { status: 400 });
  }

  try {
    const result = await send({
      contextType, recordId, tenantId, category,
      locale: locale ?? 'en', brandId, toOverride,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnboundVariablesError) {
      return NextResponse.json({ error: err.message, missing: err.missing }, { status: 422 });
    }
    console.error('[api/bop/comm/compose/send]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 });
  }
}
