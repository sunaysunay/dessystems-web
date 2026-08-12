import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("op_goal_snapshots")
    .select("*")
    .eq("goal_id", id)
    .order("measured_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ snapshots: data ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let body: {
    kr_id?: string
    current_value: number
    source?: "manual" | "auto"
    note?: string
    measured_at?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.current_value == null) {
    return NextResponse.json({ error: "current_value is required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("op_goal_snapshots")
    .insert({
      goal_id: id,
      kr_id: body.kr_id || null,
      current_value: body.current_value,
      source: body.source || "manual",
      note: body.note?.trim() || null,
      measured_at: body.measured_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.kr_id) {
    await supabaseAdmin
      .from("op_goal_key_results")
      .update({ current_value: body.current_value })
      .eq("id", body.kr_id)
  }

  return NextResponse.json({ snapshot: data }, { status: 201 })
}
