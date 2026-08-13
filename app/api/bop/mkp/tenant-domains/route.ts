import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Narrow, safe read of bop_tenants — ONLY the public-facing domain fields.
// (`/api/bop/sys/tenant-config` returns select('*') including SMTP/DNS/OAuth
// secrets and has no role guard — do not widen that exposure by reusing it here.)
export async function GET() {
  const supabase = getServerClient();
  const { data } = await supabase.from('bop_tenants').select('tenant_id, domain, dev_domain');
  return NextResponse.json({ tenants: data ?? [] });
}
