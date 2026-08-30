export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function GET(req: NextRequest) {
  const supabase = getServerClient();
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // ── Summary view ──────────────────────────────────────────────────────
  if (view === 'summary') {
    let query = supabase
      .from('wrk_efficiency_metrics')
      .select('*, technician:wrk_technicians(id, display_name, grade)')
      .eq('tenant_id', TENANT_ID)
      .order('date', { ascending: true });

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Aggregate in JS
    let totalStandard = 0;
    let totalPresent = 0;
    const techMap = new Map<string, {
      display_name: string;
      grade: string;
      standard_hours: number;
      present_hours: number;
    }>();

    for (const row of data ?? []) {
      const sh = Number(row.standard_hours) || 0;
      const ph = Number(row.present_hours) || 0;
      totalStandard += sh;
      totalPresent += ph;

      const tid = row.technician_id;
      const existing = techMap.get(tid);
      if (existing) {
        existing.standard_hours += sh;
        existing.present_hours += ph;
      } else {
        const tech = row.technician as any;
        techMap.set(tid, {
          display_name: tech?.display_name ?? 'Unknown',
          grade: tech?.grade ?? '-',
          standard_hours: sh,
          present_hours: ph,
        });
      }
    }

    const by_technician = Array.from(techMap.entries()).map(([, v]) => ({
      ...v,
      efficiency_pct: v.present_hours > 0
        ? Math.round((v.standard_hours / v.present_hours) * 1000) / 10
        : 0,
    }));

    return NextResponse.json({
      avg_efficiency: totalPresent > 0
        ? Math.round((totalStandard / totalPresent) * 1000) / 10
        : 0,
      total_standard_hours: Math.round(totalStandard * 10) / 10,
      total_present_hours: Math.round(totalPresent * 10) / 10,
      by_technician,
    });
  }

  // ── Daily view ────────────────────────────────────────────────────────
  if (view === 'daily') {
    const technicianId = searchParams.get('technician_id');
    let query = supabase
      .from('wrk_efficiency_metrics')
      .select('date, standard_hours, present_hours, efficiency_pct')
      .eq('tenant_id', TENANT_ID)
      .order('date', { ascending: true });

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);
    if (technicianId) query = query.eq('technician_id', technicianId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Group by date
    const dateMap = new Map<string, { standard_hours: number; present_hours: number }>();
    for (const row of data ?? []) {
      const d = row.date;
      const existing = dateMap.get(d);
      const sh = Number(row.standard_hours) || 0;
      const ph = Number(row.present_hours) || 0;
      if (existing) {
        existing.standard_hours += sh;
        existing.present_hours += ph;
      } else {
        dateMap.set(d, { standard_hours: sh, present_hours: ph });
      }
    }

    const result = Array.from(dateMap.entries()).map(([date, v]) => ({
      date,
      standard_hours: Math.round(v.standard_hours * 10) / 10,
      present_hours: Math.round(v.present_hours * 10) / 10,
      efficiency_pct: v.present_hours > 0
        ? Math.round((v.standard_hours / v.present_hours) * 1000) / 10
        : 0,
    }));

    return NextResponse.json({ data: result });
  }

  // ── Revenue view ──────────────────────────────────────────────────────
  if (view === 'revenue') {
    let query = supabase
      .from('wrk_efficiency_metrics')
      .select('revenue_group, standard_hours, present_hours')
      .eq('tenant_id', TENANT_ID);

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const groupMap = new Map<string, { standard_hours: number; present_hours: number }>();
    for (const row of data ?? []) {
      const rg = row.revenue_group ?? 'Unassigned';
      const sh = Number(row.standard_hours) || 0;
      const ph = Number(row.present_hours) || 0;
      const existing = groupMap.get(rg);
      if (existing) {
        existing.standard_hours += sh;
        existing.present_hours += ph;
      } else {
        groupMap.set(rg, { standard_hours: sh, present_hours: ph });
      }
    }

    const result = Array.from(groupMap.entries()).map(([revenue_group, v]) => ({
      revenue_group,
      total_standard_hours: Math.round(v.standard_hours * 10) / 10,
      total_present_hours: Math.round(v.present_hours * 10) / 10,
      avg_efficiency: v.present_hours > 0
        ? Math.round((v.standard_hours / v.present_hours) * 1000) / 10
        : 0,
    }));

    return NextResponse.json({ data: result });
  }

  // ── Default: paginated list ───────────────────────────────────────────
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Math.min(Number(searchParams.get('limit') ?? '25'), 100);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('wrk_efficiency_metrics')
    .select('*, technician:wrk_technicians(id, display_name, grade)', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const body = await req.json();

  // ── Batch insert ──────────────────────────────────────────────────────
  if (body.action === 'batch' && Array.isArray(body.items)) {
    const rows = body.items.map((item: any) => ({
      tenant_id: TENANT_ID,
      date: item.date,
      technician_id: item.technician_id,
      standard_hours: Number(item.standard_hours) || 0,
      present_hours: Number(item.present_hours) || 0,
      revenue_group: item.revenue_group ?? null,
    }));

    const { data, error } = await supabase
      .from('wrk_efficiency_metrics')
      .insert(rows)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count: data?.length ?? 0 });
  }

  // ── Single insert ─────────────────────────────────────────────────────
  const { date, technician_id, standard_hours, present_hours, revenue_group } = body;

  if (!date || !technician_id) {
    return NextResponse.json(
      { error: 'date and technician_id are required' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('wrk_efficiency_metrics')
    .insert({
      tenant_id: TENANT_ID,
      date,
      technician_id,
      standard_hours: Number(standard_hours) || 0,
      present_hours: Number(present_hours) || 0,
      revenue_group: revenue_group ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
