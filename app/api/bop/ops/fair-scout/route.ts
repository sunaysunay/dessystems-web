import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const TABLE = 'op_fair_observations';

async function ensureTable(supabase: ReturnType<typeof getServerClient>) {
  const { error } = await supabase.from(TABLE).select('id').limit(1);
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    try {
      await supabase.rpc('exec_ddl', {
        ddl: `
          CREATE TABLE IF NOT EXISTS ${TABLE} (
            id uuid PRIMARY KEY,
            tenant_id integer NOT NULL DEFAULT 400,
            event_code text NOT NULL,
            day_no integer NOT NULL,
            captured_at timestamptz NOT NULL,
            hall text,
            stand text,
            company_name text,
            title text NOT NULL,
            note text,
            categories text[] DEFAULT ARRAY[]::text[],
            reasons text[] DEFAULT ARRAY[]::text[],
            fits text[] DEFAULT ARRAY[]::text[],
            next_actions text[] DEFAULT ARRAY[]::text[],
            interest integer NOT NULL DEFAULT 3,
            business integer NOT NULL DEFAULT 3,
            high_value boolean DEFAULT false,
            follow_up boolean DEFAULT false,
            investigate text,
            price_retail text,
            price_buy text,
            contact_name text,
            website text,
            status text DEFAULT 'captured',
            photo_count integer DEFAULT 0,
            thumbnails jsonb DEFAULT '[]'::jsonb,
            synced_at timestamptz NOT NULL DEFAULT now(),
            synced_by text,
            created_at timestamptz DEFAULT now()
          );
        `
      });
    } catch {}
  }
}

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const eventCode = searchParams.get('event_code') ?? '';
  const tenantId = searchParams.get('tenant_id') ?? '400';

  let query = supabase.from(TABLE).select('*').eq('tenant_id', Number(tenantId));
  if (eventCode) query = query.eq('event_code', eventCode);
  query = query.order('captured_at', { ascending: false });

  const { data, error } = await query;
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return NextResponse.json({ observations: [], error: 'table_not_ready' });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ observations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action } = body;

  if (action === 'bootstrap') {
    await ensureTable(supabase);
    return NextResponse.json({ ok: true });
  }

  if (action === 'sync') {
    const { observations, thumbnails_map } = body;
    if (!Array.isArray(observations) || observations.length === 0) {
      return NextResponse.json({ error: 'No observations to sync' }, { status: 400 });
    }

    const rows = observations.map((obs: any) => ({
      id: obs.id,
      tenant_id: 400,
      event_code: obs.eventCode,
      day_no: obs.dayNo,
      captured_at: obs.capturedAt,
      hall: obs.hall || null,
      stand: obs.stand || null,
      company_name: obs.companyName || null,
      title: obs.title,
      note: obs.note || null,
      categories: obs.categories || [],
      reasons: obs.reasons || [],
      fits: obs.fits || [],
      next_actions: obs.nextActions || [],
      interest: obs.interest,
      business: obs.business,
      high_value: obs.highValue || false,
      follow_up: obs.followUp || false,
      investigate: obs.investigate || null,
      price_retail: obs.priceRetail || null,
      price_buy: obs.priceBuy || null,
      contact_name: obs.contactName || null,
      website: obs.website || null,
      status: obs.status || 'captured',
      photo_count: obs.photoCount || 0,
      thumbnails: (thumbnails_map?.[obs.id] || []),
      synced_by: body.synced_by || null,
    }));

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'id' })
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      synced: data?.length ?? 0,
      ids: (data ?? []).map((r: any) => r.id),
      synced_at: new Date().toISOString(),
    });
  }

  if (action === 'delete') {
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs to delete' }, { status: 400 });
    }

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: ids.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
