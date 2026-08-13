import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const registrationType = sp.get('registration_type');
  const status = sp.get('status');
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)));
  const offset = Math.max(0, Number(sp.get('offset') ?? 0));

  const supabase = getServerClient();
  let query = supabase.from('shop_compliance_registrations').select('*', { count: 'exact' });

  if (registrationType) query = query.eq('registration_type', registrationType);
  if (status) query = query.eq('status', status);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: registrations, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ registrations, total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    registration_type,
    registration_number,
    authority,
    status,
    valid_from,
    valid_until,
    renewal_alert_days,
    notes,
  } = body;

  if (!registration_type || !registration_number) {
    return NextResponse.json(
      { error: 'registration_type and registration_number are required' },
      { status: 400 },
    );
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_compliance_registrations')
    .insert({
      registration_type,
      registration_number,
      authority: authority ?? null,
      status: status ?? 'active',
      valid_from: valid_from ?? null,
      valid_until: valid_until ?? null,
      renewal_alert_days: renewal_alert_days ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registration: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed = ['status', 'registration_number', 'valid_from', 'valid_until', 'renewal_alert_days', 'notes', 'documents'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key];
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from('shop_compliance_registrations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registration: data });
}
