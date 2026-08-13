import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
const TABLE = 'activity_log2_delete_parameters';

export async function GET() {
  const sb = getServerClient();
  const { data, error } = await sb.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  const { label, ipv4, ipv6, city } = body;
  if (!ipv4 && !ipv6 && !city) {
    return NextResponse.json({ ok: false, error: 'At least one of ipv4, ipv6 or city is required' }, { status: 400 });
  }
  const { data, error } = await sb.from(TABLE).insert({
    label: label?.trim() || null,
    ipv4: ipv4?.trim() || null,
    ipv6: ipv6?.trim() || null,
    city: city?.trim() || null,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  const sb = getServerClient();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
