import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const lead_id = searchParams.get('lead_id') ?? '';
  const partner_id = searchParams.get('partner_id') ?? '';
  const type = searchParams.get('type') ?? '';
  let q = supabase.from('crm_activities').select('*, crm_leads(id,title,stage)').order('created_at', { ascending: false }).limit(300);
  if (lead_id) q = q.eq('lead_id', lead_id);
  if (partner_id) q = q.eq('partner_id', partner_id);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();
  const row: Record<string, any> = {
    type: body.type ?? 'note',
    body: body.body ?? null,
    subject: body.subject ?? null,
    lead_id: body.lead_id || null,
    partner_id: body.partner_id || null,
    actor_email: body.actor_email ?? null,
    scheduled_at: body.scheduled_at ?? null,
    done: body.done ?? false,
  };
  const { data, error } = await supabase.from('crm_activities').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activity: data });
}
