import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase-server";
import { fetchGA4Report } from "@/lib/ga4-data";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-studio-worker-secret") ||
    new URL(req.url).searchParams.get("secret");
  const expected = process.env.STUDIO_WORKER_SECRET;
  return !!secret && !!expected && secret === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServerClient();
  const tenantParam = new URL(req.url).searchParams.get("tenant_id");

  let tenants: { tenant_id: number; name: string; ga4_property_id: string }[];

  if (tenantParam) {
    const { data } = await sb
      .from("bop_tenants")
      .select("tenant_id, name, ga4_property_id")
      .eq("tenant_id", Number(tenantParam))
      .not("ga4_property_id", "is", null)
      .single();
    tenants = data ? [data] : [];
  } else {
    const { data } = await sb
      .from("bop_tenants")
      .select("tenant_id, name, ga4_property_id")
      .eq("active", true)
      .not("ga4_property_id", "is", null);
    tenants = data ?? [];
  }

  if (!tenants.length) {
    return NextResponse.json({
      ok: true,
      message: "No tenants with ga4_property_id configured",
    });
  }

  const results: any[] = [];

  for (const t of tenants) {
    try {
      const rows = await fetchGA4Report(
        "90daysAgo",
        "today",
        t.ga4_property_id
      );

      if (!rows.length) {
        results.push({ tenant: t.name, tid: t.tenant_id, upserted: 0 });
        continue;
      }

      const { error: delError } = await sb
        .from("ga4_analytics")
        .delete()
        .eq("tenant_id", t.tenant_id);
      if (delError) {
        results.push({
          tenant: t.name,
          tid: t.tenant_id,
          error: delError.message,
        });
        continue;
      }

      const { error } = await sb.from("ga4_analytics").insert(
        rows.map((r) => ({
          tenant_id: t.tenant_id,
          date: r.date,
          sessions: r.sessions,
          users: r.users,
          new_users: r.newUsers,
          pageviews: r.pageviews,
          engaged_sessions: r.engagedSessions,
          bounce_rate: r.bounceRate,
          avg_session_duration: r.avgSessionDuration,
          synced_at: new Date().toISOString(),
        }))
      );

      if (error) {
        results.push({
          tenant: t.name,
          tid: t.tenant_id,
          error: error.message,
        });
      } else {
        results.push({
          tenant: t.name,
          tid: t.tenant_id,
          upserted: rows.length,
          range: { from: rows[0].date, to: rows[rows.length - 1].date },
        });
      }
    } catch (err: any) {
      console.error(`[GA4 Sync] tenant ${t.tenant_id}:`, err.message);
      results.push({
        tenant: t.name,
        tid: t.tenant_id,
        error: err.message,
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
