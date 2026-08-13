import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data: krs } = await supabaseAdmin
    .from("op_goal_key_results")
    .select("id")
    .eq("goal_id", id)
    .is("deleted_at", null)

  const krIds = (krs ?? []).map((kr) => kr.id)
  if (!krIds.length)
    return NextResponse.json({ snapshots: [] })

  const { data, error } = await supabaseAdmin
    .from("op_goal_kr_snapshots")
    .select("*")
    .in("kr_id", krIds)
    .order("snapshot_date", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ snapshots: data ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let body: {
    kr_id: string
    current_value: number
    note?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.kr_id || body.current_value == null) {
    return NextResponse.json(
      { error: "kr_id and current_value are required" },
      { status: 400 },
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: kr } = await supabaseAdmin
    .from("op_goal_key_results")
    .select("baseline, target, direction, progress_pct")
    .eq("id", body.kr_id)
    .eq("goal_id", id)
    .single()

  if (!kr)
    return NextResponse.json({ error: "KR not found for this goal" }, { status: 404 })

  const range = Number(kr.target) - Number(kr.baseline)
  let pct = range !== 0 ? ((body.current_value - Number(kr.baseline)) / range) * 100 : 0
  if (kr.direction === "decrease")
    pct = range !== 0 ? ((Number(kr.baseline) - body.current_value) / (Number(kr.baseline) - Number(kr.target))) * 100 : 0
  pct = Math.max(0, Math.min(100, Math.round(pct * 100) / 100))

  const { data, error } = await supabaseAdmin
    .from("op_goal_kr_snapshots")
    .upsert(
      {
        kr_id: body.kr_id,
        snapshot_date: today,
        value: body.current_value,
        progress_pct: pct,
      },
      { onConflict: "kr_id,snapshot_date" },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from("op_goal_key_results")
    .update({ current_value: body.current_value, progress_pct: pct })
    .eq("id", body.kr_id)

  return NextResponse.json({ snapshot: data }, { status: 201 })
}
