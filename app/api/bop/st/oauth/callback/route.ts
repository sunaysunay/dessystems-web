import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { buildOAuthClient, oauthRedirectUri, invalidateDriveCache, ensureRootFolder, refreshQuota } from '@/lib/st/google-drive';

export const dynamic = 'force-dynamic';

// GET /api/bop/st/oauth/callback?code=...&state=<tenant_key>
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const tenant = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');
  const back = new URL('/console/sys/drive', req.nextUrl.origin);

  if (oauthError || !code || !tenant) {
    back.searchParams.set('error', oauthError ?? 'missing code/state');
    return NextResponse.redirect(back);
  }

  const sb = getServerClient();
  try {
    const oauth2 = buildOAuthClient(oauthRedirectUri(req.nextUrl.origin));
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) throw new Error('No refresh_token returned — re-run with a fresh consent');

    const { error } = await sb.from('st_drive_accounts').update({
      refresh_token: tokens.refresh_token,
      status: 'connected',
      connected_at: new Date().toISOString(),
      last_error: null,
    }).eq('tenant_key', tenant);
    if (error) throw new Error(error.message);

    invalidateDriveCache(tenant);
    await ensureRootFolder(tenant);
    await refreshQuota(tenant);

    back.searchParams.set('connected', tenant);
  } catch (e: any) {
    await sb.from('st_drive_accounts').update({ status: 'error', last_error: String(e?.message ?? e) }).eq('tenant_key', tenant);
    back.searchParams.set('error', String(e?.message ?? e));
  }
  return NextResponse.redirect(back);
}
