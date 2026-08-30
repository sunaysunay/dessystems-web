export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

interface Recommendation {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  count: number;
  action_url: string;
}

export async function GET(_req: NextRequest) {
  const supabase = getServerClient();
  const recommendations: Recommendation[] = [];
  const now = new Date();

  // 1. Technicians with no planning slots in next 7 days
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: techs } = await supabase
    .from('wrk_technicians')
    .select('id, display_name')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true);

  if (techs && techs.length > 0) {
    const { data: futureSlots } = await supabase
      .from('wrk_planning_slots')
      .select('technician_id')
      .eq('tenant_id', TENANT_ID)
      .gte('start_at', now.toISOString())
      .lte('start_at', weekEnd.toISOString());

    const scheduledIds = new Set((futureSlots ?? []).map((s: Record<string, unknown>) => s.technician_id));
    const unscheduled = techs.filter((t: Record<string, unknown>) => !scheduledIds.has(t.id));

    if (unscheduled.length > 0) {
      recommendations.push({
        type: 'empty_planning',
        severity: 'warning',
        title: 'Lege planning',
        description: `${unscheduled.length} monteur(s) hebben geen planning voor de komende 7 dagen: ${unscheduled.map((t: Record<string, unknown>) => t.display_name).join(', ')}`,
        count: unscheduled.length,
        action_url: '/console/wrk/planning',
      });
    }
  }

  // 2. APK reminders expiring in < 14 days with status=pending
  const twoWeeks = new Date(now);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const { data: urgentApk } = await supabase
    .from('wrk_apk_reminders')
    .select('id, license_plate, apk_expiry_date')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'pending')
    .gte('apk_expiry_date', now.toISOString().slice(0, 10))
    .lte('apk_expiry_date', twoWeeks.toISOString().slice(0, 10));

  if (urgentApk && urgentApk.length > 0) {
    recommendations.push({
      type: 'urgent_apk',
      severity: 'critical',
      title: 'Urgente APK',
      description: `${urgentApk.length} voertuig(en) met APK die binnen 14 dagen verloopt en nog niet ingepland.`,
      count: urgentApk.length,
      action_url: '/console/wrk/apk-reminders',
    });
  }

  // 3. WOs older than 7 days still in draft
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: forgottenWo } = await supabase
    .from('wrk_orders')
    .select('id, wo_number')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'draft')
    .lte('created_at', sevenDaysAgo.toISOString());

  if (forgottenWo && forgottenWo.length > 0) {
    recommendations.push({
      type: 'forgotten_orders',
      severity: 'warning',
      title: 'Vergeten werkorders',
      description: `${forgottenWo.length} werkorder(s) staan al meer dan 7 dagen in concept-status.`,
      count: forgottenWo.length,
      action_url: '/console/wrk/orders',
    });
  }

  // 4. WOs with actual_hours > estimated_hours * 1.2 (overruns)
  const { data: overruns } = await supabase
    .from('wrk_orders')
    .select('id, wo_number, estimated_hours, actual_hours')
    .eq('tenant_id', TENANT_ID)
    .not('estimated_hours', 'is', null)
    .not('actual_hours', 'is', null)
    .gt('actual_hours', 0);

  if (overruns) {
    const overrunWos = overruns.filter((wo: Record<string, unknown>) => {
      const est = Number(wo.estimated_hours) || 0;
      const act = Number(wo.actual_hours) || 0;
      return est > 0 && act > est * 1.2;
    });

    if (overrunWos.length > 0) {
      recommendations.push({
        type: 'overrun',
        severity: 'warning',
        title: 'Overschrijding',
        description: `${overrunWos.length} werkorder(s) hebben meer dan 20% uren overschreden t.o.v. de schatting.`,
        count: overrunWos.length,
        action_url: '/console/wrk/orders',
      });
    }
  }

  // 5. Technicians with efficiency < 80% this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: efficiencyData } = await supabase
    .from('wrk_efficiency_metrics')
    .select('technician_id, standard_hours, present_hours, technician:wrk_technicians(display_name)')
    .eq('tenant_id', TENANT_ID)
    .gte('date', monthStart.toISOString().slice(0, 10))
    .lte('date', now.toISOString().slice(0, 10));

  if (efficiencyData && efficiencyData.length > 0) {
    const techEffMap = new Map<string, { name: string; standard: number; present: number }>();
    for (const row of efficiencyData) {
      const tid = row.technician_id as string;
      const existing = techEffMap.get(tid);
      const tech = row.technician as Record<string, unknown> | null;
      const name = (tech?.display_name as string) ?? 'Onbekend';
      if (existing) {
        existing.standard += Number(row.standard_hours) || 0;
        existing.present += Number(row.present_hours) || 0;
      } else {
        techEffMap.set(tid, {
          name,
          standard: Number(row.standard_hours) || 0,
          present: Number(row.present_hours) || 0,
        });
      }
    }

    const lowEfficiency = Array.from(techEffMap.values()).filter(
      (t) => t.present > 0 && (t.standard / t.present) * 100 < 80,
    );

    if (lowEfficiency.length > 0) {
      recommendations.push({
        type: 'low_efficiency',
        severity: 'info',
        title: 'Lage efficiëntie',
        description: `${lowEfficiency.length} monteur(s) met efficiëntie onder 80% deze maand: ${lowEfficiency.map((t) => t.name).join(', ')}`,
        count: lowEfficiency.length,
        action_url: '/console/wrk/efficiency',
      });
    }
  }

  // Sort: critical first, then warning, then info
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return NextResponse.json({
    recommendations,
    total: recommendations.length,
    generated_at: new Date().toISOString(),
  });
}
