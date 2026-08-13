import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_TRANSITIONS: Record<string, string[]> = {
  new:       ['seen', 'closed'],
  seen:      ['replied', 'closed'],
  replied:   ['closed'],
  closed:    [],
  converted: [],
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data, error } = await sb
    .from('dm_inquiries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ inquiry: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const body = await req.json();
  const newStatus: string = body.status;

  const { data: current } = await sb
    .from('dm_inquiries')
    .select('status, crm_lead_id')
    .eq('id', id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (current.status === 'converted') {
    return NextResponse.json(
      { error: 'Inquiry is locked — it has been promoted to a CRM lead.' },
      { status: 422 }
    );
  }

  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: 'Invalid transition ' + current.status + ' -> ' + newStatus },
      { status: 422 }
    );
  }

  const { error } = await sb
    .from('dm_inquiries')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
