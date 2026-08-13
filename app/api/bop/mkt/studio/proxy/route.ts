// app/api/bop/mkt/studio/proxy/route.ts
// Serve private studio storage images via signed URL
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const uid = await callerUid();
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const path = req.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

  const sb = getServerClient();

  // Preset background paths (presets/{preset_code}/...) are readable by any authenticated user
  if (!path.startsWith('presets/')) {
    // Session paths: verify ownership
    const sessionId = path.split('/')[0];
    const { count } = await sb
      .from('bop_studio_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('id', sessionId)
      .eq('created_by', uid);

    if (!count) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data, error } = await sb.storage.from('studio').createSignedUrl(path, 300);
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}
