import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data: sys } = await supabase.from('int_systems').select('*').eq('id', id).single();
  if (!sys) return NextResponse.json({ error: 'not found' }, { status: 404 });
  let ok = false;
  let ms = 0;
  const t0 = Date.now();
  try {
    const testUrl = sys.health_url ?? (sys.base_url ? sys.base_url + '/ping' : null);
    if (testUrl) {
      const r = await fetch(testUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
      ok = r.ok;
    } else {
      ok = true;
    }
    ms = Date.now() - t0;
  } catch {
    ms = Date.now() - t0;
  }
  await supabase.from('int_systems').update({
    status:            ok ? 'active' : 'degraded',
    last_health_check: new Date().toISOString(),
    last_error:        ok ? null : 'Health check failed',
    error_count:       ok ? 0 : (sys.error_count ?? 0) + 1,
    updated_at:        new Date().toISOString(),
  }).eq('id', id);
  return NextResponse.json({ ok, ms });
}
