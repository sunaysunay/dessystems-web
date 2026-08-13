import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/bop/user/security?uid=<auth-user-id>
export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const uid = new URL(req.url).searchParams.get('uid');
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  const { data, error } = await supabase.auth.admin.getUserById(uid);
  if (error || !data?.user) return NextResponse.json({ error: error?.message ?? 'not found' }, { status: 404 });
  const u = data.user;

  // credential age → simple 90-day advisory expiry (no hard policy in GoTrue)
  const lastChange = u.updated_at ?? u.created_at;
  const ageDays = lastChange ? Math.floor((Date.now() - new Date(lastChange).getTime()) / 86400000) : null;
  const EXPIRY_DAYS = 90;
  const expiresInDays = ageDays !== null ? EXPIRY_DAYS - ageDays : null;

  return NextResponse.json({
    email: u.email,
    provider: (u.app_metadata as any)?.provider ?? 'email',
    role: (u.app_metadata as any)?.role ?? (u.user_metadata as any)?.role ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    created_at: u.created_at ?? null,
    email_confirmed: !!u.email_confirmed_at,
    email_confirmed_at: u.email_confirmed_at ?? null,
    phone: u.phone ?? null,
    mfa: Array.isArray((u as any).factors) && (u as any).factors.length > 0,
    credential_age_days: ageDays,
    credential_expires_in_days: expiresInDays,
    credential_expiry_advisory: EXPIRY_DAYS,
  });
}
