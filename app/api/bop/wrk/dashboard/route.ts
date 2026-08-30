export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function GET(_req: NextRequest) {
  const supabase = getServerClient();

  const now = new Date().toISOString();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30);

  try {
    // 1. All WOs (non-deleted) for status counts
    const { data: allWos, error: woErr } = await supabase
      .from('wrk_orders')
      .select('id, wo_number, type, status, estimated_completion, created_at, technician_id, wrk_technicians ( display_name )')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (woErr) throw woErr;
    const wos = allWos ?? [];

    // Status counts
    const statusCounts: Record<string, number> = {};
    for (const wo of wos) {
      statusCounts[wo.status] = (statusCounts[wo.status] ?? 0) + 1;
    }

    const inProgressCount = statusCounts['in_progress'] ?? 0;

    // Overdue WOs
    const overdueWos = wos
      .filter(wo =>
        !['completed', 'invoiced', 'cancelled'].includes(wo.status) &&
        wo.estimated_completion &&
        new Date(wo.estimated_completion) < new Date(now)
      )
      .map(wo => ({
        id: wo.id,
        wo_number: wo.wo_number,
        status: wo.status,
        estimated_completion: wo.estimated_completion,
        days_overdue: Math.floor((Date.now() - new Date(wo.estimated_completion).getTime()) / 86400000),
      }));

    // Completed this week
    const completedThisWeek = wos.filter(wo =>
      wo.status === 'completed' &&
      new Date(wo.created_at) >= weekAgo
    ).length;

    // Recent 5
    const recentWos = wos.slice(0, 5).map(wo => ({
      id: wo.id,
      wo_number: wo.wo_number,
      type: wo.type,
      status: wo.status,
      technician_name: (wo as any).wrk_technicians?.display_name ?? null,
      created_at: wo.created_at,
    }));

    // 2. Today's planning slots
    const { data: slots } = await supabase
      .from('wrk_planning_slots')
      .select('id, hours')
      .eq('tenant_id', TENANT_ID)
      .gte('slot_date', todayStart.toISOString())
      .lte('slot_date', todayEnd.toISOString());

    const todaySlots = slots ?? [];
    const todaySlotCount = todaySlots.length;
    const todayPlannedHours = todaySlots.reduce((s: number, sl: any) => s + (sl.hours ?? 0), 0);

    // 3. APK reminders due within 30 days
    const { count: apkCount } = await supabase
      .from('wrk_apk_reminders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'pending')
      .lte('due_date', in30Days.toISOString());

    // 4. Pending approvals
    const { count: approvalCount } = await supabase
      .from('wrk_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'pending');

    // 5. Average efficiency this month
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const { data: effRows } = await supabase
      .from('wrk_efficiency_metrics')
      .select('efficiency_pct')
      .eq('tenant_id', TENANT_ID)
      .gte('metric_date', monthStart.toISOString());

    const efficiencyRows = effRows ?? [];
    const avgEfficiency = efficiencyRows.length > 0
      ? Math.round(efficiencyRows.reduce((s: number, r: any) => s + (r.efficiency_pct ?? 0), 0) / efficiencyRows.length)
      : null;

    return NextResponse.json({
      status_counts: statusCounts,
      in_progress: inProgressCount,
      today_slots: todaySlotCount,
      today_planned_hours: todayPlannedHours,
      overdue_wos: overdueWos,
      completed_this_week: completedThisWeek,
      apk_due_30d: apkCount ?? 0,
      pending_approvals: approvalCount ?? 0,
      avg_efficiency: avgEfficiency,
      recent_wos: recentWos,
    });
  } catch (err: any) {
    console.error('WRK dashboard error:', err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
