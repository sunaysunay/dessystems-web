import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase-server";

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

  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  if (!CF_API_TOKEN) {
    return NextResponse.json(
      { error: "CLOUDFLARE_API_TOKEN env var not set" },
      { status: 500 }
    );
  }

  const sb = getServerClient();
  const url = new URL(req.url);
  const tenantParam = url.searchParams.get("tenant_id");
  const days = parseInt(url.searchParams.get("days") || "30", 10);

  let tenants: { tenant_id: number; name: string; cloudflare_zone_id: string }[];

  if (tenantParam) {
    const { data } = await sb
      .from("bop_tenants")
      .select("tenant_id, name, cloudflare_zone_id")
      .eq("tenant_id", Number(tenantParam))
      .not("cloudflare_zone_id", "is", null)
      .single();
    tenants = data ? [data] : [];
  } else {
    const { data } = await sb
      .from("bop_tenants")
      .select("tenant_id, name, cloudflare_zone_id")
      .eq("active", true)
      .not("cloudflare_zone_id", "is", null);
    tenants = data ?? [];
  }

  if (!tenants.length) {
    return NextResponse.json({
      ok: true,
      message: "No tenants with cloudflare_zone_id configured",
    });
  }

  const dateLte = new Date();
  dateLte.setDate(dateLte.getDate() - 1);
  const dateGte = new Date();
  dateGte.setDate(dateLte.getDate() - days);
  const dateLteStr = dateLte.toISOString().split("T")[0];
  const dateGteStr = dateGte.toISOString().split("T")[0];

  const query = `
    query ($zoneTag: String!, $dateGte: Date!, $dateLte: Date!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1dGroups(
            limit: 100
            filter: { date_geq: $dateGte, date_leq: $dateLte }
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            sum { requests pageViews threats bytes cachedBytes cachedRequests }
            uniq { uniques }
          }
        }
      }
    }
  `;

  const results: any[] = [];

  for (const t of tenants) {
    try {
      const cfRes = await fetch(
        "https://api.cloudflare.com/client/v4/graphql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CF_API_TOKEN}`,
          },
          body: JSON.stringify({
            query,
            variables: {
              zoneTag: t.cloudflare_zone_id,
              dateGte: dateGteStr,
              dateLte: dateLteStr,
            },
          }),
        }
      );

      if (!cfRes.ok) {
        results.push({
          tenant: t.name,
          tid: t.tenant_id,
          error: `CF API ${cfRes.status}`,
        });
        continue;
      }

      const cfData = await cfRes.json();
      if (cfData.errors?.length) {
        results.push({
          tenant: t.name,
          tid: t.tenant_id,
          error: cfData.errors[0].message,
        });
        continue;
      }

      const groups =
        cfData?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

      if (!groups.length) {
        results.push({ tenant: t.name, tid: t.tenant_id, upserted: 0 });
        continue;
      }

      const rows = groups.map((g: any) => ({
        tenant_id: t.tenant_id,
        date: g.dimensions.date,
        requests: g.sum.requests || 0,
        page_views: g.sum.pageViews || 0,
        uniques: g.uniq.uniques || 0,
        threats: g.sum.threats || 0,
        bytes: g.sum.bytes || 0,
        cached_bytes: g.sum.cachedBytes || 0,
        cached_requests: g.sum.cachedRequests || 0,
        bot_requests: 0,
        bot_page_views: 0,
        bot_uniques: 0,
        human_requests: g.sum.requests || 0,
        human_page_views: g.sum.pageViews || 0,
        human_uniques: g.uniq.uniques || 0,
        fetched_at: new Date().toISOString(),
      }));

      const { error } = await sb
        .from("cloudflare_analytics")
        .upsert(rows, { onConflict: "tenant_id,date" });

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
          range: { gte: dateGteStr, lte: dateLteStr },
        });
      }
    } catch (err: any) {
      console.error(`[CF Sync] tenant ${t.tenant_id}:`, err.message);
      results.push({
        tenant: t.name,
        tid: t.tenant_id,
        error: err.message,
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
