import { NextRequest, NextResponse } from 'next/server';
import { listAccounts, refreshQuota } from '@/lib/st/google-drive';

export const dynamic = 'force-dynamic';

// GET /api/bop/st/accounts — all tenant Drive accounts (tokens stripped)
// ?refresh=campers re-measures that tenant's quota first
export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get('refresh');
  if (refresh) {
    try { await refreshQuota(refresh); } catch { /* surfaced via status/last_error */ }
  }
  const accounts = await listAccounts();
  return NextResponse.json({
    accounts: accounts.map(({ refresh_token, ...a }) => ({ ...a, has_token: !!refresh_token })),
  });
}
