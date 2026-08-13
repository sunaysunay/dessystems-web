import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';

  let q = sb
    .from('dm_inquiries')
    .select('id, listing_id, question_codes, intent_tags, free_text, contact_name, contact_email, status, locale, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiries: data ?? [] });
}
