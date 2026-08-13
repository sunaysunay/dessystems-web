// app/api/bop/mkt/brand/route.ts — MK004 brand-profile CRUD (bop_mkt_brand_profiles)
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { callerUid } from '@/lib/api-guard';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  const { data, error } = await sb.from('bop_mkt_brand_profiles').select('*').order('tenant_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brand_profiles: data });
}

// PATCH { tenant_id, entity?, tone?, voice_notes?, banned_phrases?, locale_defaults? }
export async function PATCH(req: NextRequest) {
  if (!await callerUid()) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const sb = getServerClient();
  const b = await req.json();
  if (!b.tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  const row: any = { tenant_id: Number(b.tenant_id), updated_at: new Date().toISOString() };
  for (const k of ['entity', 'tone', 'voice_notes']) if (k in b) row[k] = b[k];
  if ('banned_phrases' in b) row.banned_phrases = Array.isArray(b.banned_phrases) ? b.banned_phrases : String(b.banned_phrases || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if ('locale_defaults' in b) row.locale_defaults = Array.isArray(b.locale_defaults) ? b.locale_defaults : String(b.locale_defaults || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const { data, error } = await sb.from('bop_mkt_brand_profiles').upsert(row, { onConflict: 'tenant_id' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brand_profile: data });
}
