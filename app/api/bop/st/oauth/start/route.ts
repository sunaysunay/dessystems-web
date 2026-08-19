import { NextRequest, NextResponse } from 'next/server';
import { buildOAuthClient, oauthRedirectUri, DRIVE_SCOPE, getAccount } from '@/lib/st/google-drive';

export const dynamic = 'force-dynamic';

// GET /api/bop/st/oauth/start?tenant=campers — redirect admin to Google consent
export async function GET(req: NextRequest) {
  const tenant = req.nextUrl.searchParams.get('tenant');
  if (!tenant) return NextResponse.json({ error: 'tenant required' }, { status: 400 });
  const account = await getAccount(tenant);
  if (!account) return NextResponse.json({ error: `unknown tenant: ${tenant}` }, { status: 404 });

  const oauth2 = buildOAuthClient(oauthRedirectUri(req.nextUrl.origin));
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',           // force refresh_token issuance every time
    scope: [DRIVE_SCOPE],
    state: tenant,
  });
  return NextResponse.redirect(url);
}
