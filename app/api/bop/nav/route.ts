import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("bop_screens")
    .select("screen_id, route, title, nav_group, nav_subgroup, nav_order, nav_visible")
    .eq("nav_visible", true)
    .not("nav_group", "is", null)
    .order("nav_group")
    .order("nav_subgroup", { nullsFirst: true })
    .order("nav_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build grouped structure: { [group]: { [subgroup|"__root__"]: Screen[] } }
  const tree: Record<string, Record<string, typeof data>> = {};
  for (const row of data ?? []) {
    const g = row.nav_group!;
    const s = row.nav_subgroup ?? "__root__";
    if (!tree[g]) tree[g] = {};
    if (!tree[g][s]) tree[g][s] = [];
    tree[g][s].push(row);
  }

  return NextResponse.json({ tree }, { headers: { "Cache-Control": "no-store" } });
}
