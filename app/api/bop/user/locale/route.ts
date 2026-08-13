import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { locales } from '@/i18n/config';

export async function PATCH(req: NextRequest) {
  const { language, email } = await req.json();
  if (!locales.includes(language)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const sb = getServerClient();
  const { error } = await sb
    .from('bop_user_profiles')
    .update({ language, updated_at: new Date().toISOString() })
    .eq('email', email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const response = NextResponse.json({ ok: true, language });
  response.cookies.set('bop_locale', language, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}
