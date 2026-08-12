import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("op_goals")
    .select("*, key_results:op_goal_key_results(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .single()

  if (error || !data)
    return NextResponse.json({ error: "Goal not found" }, { status: 404 })

  const { data: checkins } = await supabaseAdmin
    .from("op_goal_checkins")
    .select("*")
    .eq("goal_id", id)
    .order("created_at", { ascending: false })

  const { data: children } = await supabaseAdmin
    .from("op_goals")
    .select("*, key_results:op_goal_key_results(*)")
    .eq("parent_goal_id", id)
    .is("deleted_at", null)
    .order("level")
    .order("created_at", { ascending: false })

  const goal = { ...data, checkins: checkins ?? [], children: children ?? [] }

  return NextResponse.json({ goal })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const allowedFields = [
    "title", "description", "vision_text", "entity",
    "parent_goal_id", "level", "period_type", "period_start", "period_end",
    "status", "health", "health_override", "progress_pct",
    "owner_id", "budget", "priority", "goal_type", "visibility",
    "tags", "contributor_ids", "strategic_pillar", "checkin_frequency",
    "closed_at", "closed_by", "closing_note",
  ]

  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("op_goals")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*, key_results:op_goal_key_results(*)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Goal not found" }, { status: 404 })

  return NextResponse.json({ goal: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { error } = await supabaseAdmin
    .from("op_goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
}
