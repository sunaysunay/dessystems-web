import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET — list all listing_tab_templates
export async function GET() {
  const sb = getServerClient();
  const { data, error } = await sb.from('listing_tab_templates').select('*').order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

// POST — create template
export async function POST(req: NextRequest) {
  const sb = getServerClient();
  const body = await req.json();
  const { data, error } = await sb.from('listing_tab_templates').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
