import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { GoalCreateInput } from "@/lib/op-goals-types"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get("entity")
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const parentId = searchParams.get("parent_id")
  const flat = searchParams.get("flat") === "true"

  let query = supabaseAdmin
    .from("op_goals")
    .select("*, key_results:op_goal_key_results(*)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (entity) query = query.eq("entity", entity)
  if (status) query = query.eq("status", status)
  if (priority) query = query.eq("priority", priority)

  if (flat) {
    if (parentId) query = query.eq("parent_goal_id", parentId)
  } else {
    query = query.is("parent_goal_id", null)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!flat) {
    const { data: children, error: childErr } = await supabaseAdmin
      .from("op_goals")
      .select("*, key_results:op_goal_key_results(*)")
      .is("deleted_at", null)
      .not("parent_goal_id", "is", null)
      .order("level", { ascending: true })
      .order("created_at", { ascending: false })

    if (!childErr && children) {
      const childMap = new Map<string, typeof children>()
      for (const c of children) {
        const pid = c.parent_goal_id as string
        if (!childMap.has(pid)) childMap.set(pid, [])
        childMap.get(pid)!.push(c)
      }
      const attachChildren = (goals: typeof data) => {
        for (const g of goals ?? []) {
          const kids = childMap.get(g.id) ?? []
          attachChildren(kids)
          ;(g as Record<string, unknown>).children = kids
        }
      }
      attachChildren(data)
    }
  }

  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  let body: GoalCreateInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const keyResults = body.key_results ?? []

  const { data: goal, error } = await supabaseAdmin
    .from("op_goals")
    .insert({
      title: body.title.trim(),
      description: body.description?.trim() || null,
      vision_text: body.vision_text?.trim() || null,
      entity: body.entity || null,
      parent_goal_id: body.parent_goal_id || null,
      level: body.level ?? 0,
      period_type: body.period_type || "quarterly",
      period_start: body.period_start || null,
      period_end: body.period_end || null,
      owner_id: body.owner_id || null,
      budget: body.budget ?? null,
      priority: body.priority || "medium",
      goal_type: body.goal_type || "committed",
      visibility: body.visibility || "public",
      tags: body.tags ?? [],
      contributor_ids: body.contributor_ids ?? [],
      strategic_pillar: body.strategic_pillar?.trim() || null,
      checkin_frequency: body.checkin_frequency || "weekly",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (keyResults.length > 0) {
    const krRows = keyResults.map((kr) => ({
      goal_id: goal.id,
      title: kr.title.trim(),
      description: kr.description?.trim() || null,
      metric_type: kr.metric_type || "manual",
      direction: kr.direction || "increase",
      baseline: kr.baseline ?? 0,
      target: kr.target,
      unit_label: kr.unit_label || "%",
      weight: kr.weight ?? 1,
    }))

    const { error: krError } = await supabaseAdmin
      .from("op_goal_key_results")
      .insert(krRows)

    if (krError) {
      return NextResponse.json(
        { goal, warning: `Goal created but KR insert failed: ${krError.message}` },
        { status: 207 },
      )
    }
  }

  const { data: full } = await supabaseAdmin
    .from("op_goals")
    .select("*, key_results:op_goal_key_results(*)")
    .eq("id", goal.id)
    .single()

  return NextResponse.json({ goal: full ?? goal }, { status: 201 })
}
