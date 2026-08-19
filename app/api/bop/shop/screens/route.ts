import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// SH000 launchpad: all SHP screens with status, grouped client-side by nav_subgroup
export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("bop_screens")
    .select("screen_id, route, title, description, icon, status, nav_subgroup, nav_order, nav_visible")
    .eq("module", "SHP")
    .neq("screen_id", "SH000")
    .order("nav_subgroup", { nullsFirst: true })
    .order("nav_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ screens: data }, { headers: { "Cache-Control": "no-store" } });
}
