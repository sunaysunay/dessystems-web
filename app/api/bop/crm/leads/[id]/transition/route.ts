import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { data, error } = await supabase.rpc('bop_lead_allowed_transitions', { p_lead_id: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transitions: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getServerClient();
  const { to_stage, actor, reason } = await req.json();
  if (!to_stage) return NextResponse.json({ error: 'to_stage required' }, { status: 400 });

  const { data, error } = await supabase.rpc('bop_lead_transition', {
    p_lead_id: id,
    p_to_stage: to_stage,
    p_actor: actor ?? 'user',
    p_reason: reason ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.ok) return NextResponse.json({ error: data?.error ?? 'Transition failed' }, { status: 400 });
  return NextResponse.json(data);
}
