import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('sal_warranty_claims')
    .select('*')
    .eq('warranty_id', id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ claims: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const body = await req.json();
  const { data, error } = await supabase
    .from('sal_warranty_claims')
    .insert({ ...body, warranty_id: id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('sal_warranties')
    .update({ claim_count: (body.claim_count ?? 0) + 1, last_claim_at: new Date().toISOString(), status: 'claimed', updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ claim: data });
}
