import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { computeMetric } from "@/lib/ops/compute-metric"
import type { GoalCreateInput } from "@/lib/op-goals-types"

function calcProgress(val: number, baseline: number, target: number, direction: string): number {
  const range = target - baseline
  let pct = range !== 0 ? ((val - baseline) / range) * 100 : 0
  if (direction === "decrease")
    pct = range !== 0 ? ((baseline - val) / (baseline - target)) * 100 : 0
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100))
}

async function recomputeGoal(goalId: string) {
  const { data: krs } = await supabaseAdmin
    .from("op_goal_key_results")
    .select("progress_pct, weight")
    .eq("goal_id", goalId)
    .is("deleted_at", null)

  if (!krs?.length) return

  const totalW = krs.reduce((s, k) => s + Number(k.weight ?? 1), 0)
  const pct =
    totalW > 0
      ? Math.round(
          (krs.reduce(
            (s, k) => s + Number(k.progress_pct ?? 0) * Number(k.weight ?? 1),
            0,
          ) /
            totalW) *
            100,
        ) / 100
      : 0

  const { data: goal } = await supabaseAdmin
    .from("op_goals")
    .select("health, parent_goal_id, period_start, period_end")
    .eq("id", goalId)
    .single()

  const now = Date.now()
  const ps = goal?.period_start ? new Date(goal.period_start).getTime() : now
  const pe = goal?.period_end ? new Date(goal.period_end).getTime() : now
  const elapsed = pe > ps ? ((now - ps) / (pe - ps)) * 100 : 50
  const paceDelta = pct - elapsed
  const health =
    paceDelta >= -5 ? "on_track" : paceDelta >= -20 ? "at_risk" : "off_track"

  await supabaseAdmin
    .from("op_goals")
    .update({ progress_pct: Math.max(0, Math.min(100, pct)), health })
    .eq("id", goalId)

  if (goal?.parent_goal_id) await recomputeGoal(goal.parent_goal_id)
}

// ── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const view = searchParams.get("view")
  const tenantId = searchParams.get("tenant_id")
  const singleId = searchParams.get("id")
  const entity = searchParams.get("entity")
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const parentId = searchParams.get("parent_id")
  const flat = searchParams.get("flat") === "true"

  // ── Metrics catalog ──
  if (view === "metrics-catalog") {
    const { data, error } = await supabaseAdmin
      .from("op_goal_metrics_catalog")
      .select("*")
      .order("code")
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ metrics: data ?? [] })
  }

  // ── Goals list for parent selector ──
  if (view === "parent-options") {
    let q = supabaseAdmin
      .from("op_goals")
      .select("id, goal_number, title, level, entity")
      .is("deleted_at", null)
      .in("status", ["active", "paused"])
      .order("goal_number")
    if (tenantId) q = q.eq("tenant_id", tenantId)
    const { data } = await q
    return NextResponse.json({ goals: data ?? [] })
  }

  // ── Single goal detail ──
  if (singleId) {
    const { data: goal, error } = await supabaseAdmin
      .from("op_goals")
      .select("*, key_results:op_goal_key_results(*)")
      .eq("id", singleId)
      .is("deleted_at", null)
      .single()
    if (error || !goal)
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })

    const { data: checkins } = await supabaseAdmin
      .from("op_goal_checkins")
      .select("*")
      .eq("goal_id", singleId)
      .order("created_at", { ascending: false })

    const { data: children } = await supabaseAdmin
      .from("op_goals")
      .select("*, key_results:op_goal_key_results(*)")
      .eq("parent_goal_id", singleId)
      .is("deleted_at", null)
      .order("level")
      .order("created_at", { ascending: false })

    const krIds = (goal.key_results ?? []).map((kr: { id: string }) => kr.id)

    const { data: snapshots } = krIds.length
      ? await supabaseAdmin
          .from("op_goal_kr_snapshots")
          .select("*")
          .in("kr_id", krIds)
          .order("snapshot_date", { ascending: true })
      : { data: [] }

    const { data: linkedTasks } = krIds.length
      ? await supabaseAdmin
          .from("op_tasks")
          .select("id, task_number, title, status, goal_kr_id")
          .in("goal_kr_id", krIds)
      : { data: [] }

    return NextResponse.json({
      goal,
      key_results: goal.key_results ?? [],
      checkins: checkins ?? [],
      children: children ?? [],
      snapshots: snapshots ?? [],
      linked_tasks: linkedTasks ?? [],
    })
  }

  // ── Dashboard summary ──
  if (view === "dashboard-summary") {
    let summaryQuery = supabaseAdmin
      .from("op_goals")
      .select("status, health, health_override, progress_pct")
      .is("deleted_at", null)
      .eq("level", 0)
    if (tenantId) summaryQuery = summaryQuery.eq("tenant_id", tenantId)

    const { data: goals } = await summaryQuery
    const all = goals ?? []
    const active = all.filter((g) => g.status === "active")
    const healthOf = (g: {
      health_override: string | null
      health: string
    }) => g.health_override ?? g.health
    return NextResponse.json({
      summary: {
        active: active.length,
        on_track: active.filter((g) => healthOf(g) === "on_track").length,
        at_risk: active.filter((g) => healthOf(g) === "at_risk").length,
        off_track: active.filter((g) => healthOf(g) === "off_track").length,
        no_data: active.filter((g) => healthOf(g) === "no_data").length,
        achieved: all.filter((g) => g.status === "achieved").length,
        avg_progress:
          active.length > 0
            ? Math.round(
                active.reduce(
                  (s, g) => s + Number(g.progress_pct ?? 0),
                  0,
                ) / active.length,
              )
            : 0,
      },
    })
  }

  // ── Cycles for a goal ──
  if (view === "cycles") {
    const goalId = searchParams.get("goal_id")
    if (!goalId)
      return NextResponse.json({ error: "goal_id required" }, { status: 400 })

    const { data: cycles } = await supabaseAdmin
      .from("op_goal_cycles")
      .select("*")
      .eq("goal_id", goalId)
      .order("cycle_number", { ascending: false })

    return NextResponse.json({ cycles: cycles ?? [] })
  }

  // ── Open cycle for a goal (latest open) ──
  if (view === "open-cycle") {
    const goalId = searchParams.get("goal_id")
    if (!goalId)
      return NextResponse.json({ error: "goal_id required" }, { status: 400 })

    const { data: cycle } = await supabaseAdmin
      .from("op_goal_cycles")
      .select("*")
      .eq("goal_id", goalId)
      .eq("status", "open")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ cycle: cycle ?? null })
  }

  // ── Bottleneck detection ──
  if (view === "bottleneck") {
    const goalId = searchParams.get("goal_id")
    if (!goalId)
      return NextResponse.json({ error: "goal_id required" }, { status: 400 })

    const { data: goal } = await supabaseAdmin
      .from("op_goals")
      .select("period_start, period_end, progress_pct")
      .eq("id", goalId)
      .single()

    if (!goal)
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })

    const { data: krs } = await supabaseAdmin
      .from("op_goal_key_results")
      .select("id, kr_number, title, progress_pct, weight, current_value, baseline, target, direction, unit_label")
      .eq("goal_id", goalId)
      .is("deleted_at", null)

    if (!krs?.length)
      return NextResponse.json({ bottleneck: null, krs: [] })

    const now = Date.now()
    const ps = goal.period_start ? new Date(goal.period_start).getTime() : now
    const pe = goal.period_end ? new Date(goal.period_end).getTime() : now
    const expectedPct = pe > ps ? Math.max(0, Math.min(100, ((now - ps) / (pe - ps)) * 100)) : 50

    let worst: (typeof krs)[0] | null = null
    let worstGap = Infinity
    const krDetails = krs.map(kr => {
      const progress = Number(kr.progress_pct ?? 0)
      const weight = Number(kr.weight ?? 1)
      const gap = progress - expectedPct
      const weightedGap = gap * weight
      if (weightedGap < worstGap) {
        worstGap = weightedGap
        worst = kr
      }
      return { ...kr, expected_pct: Math.round(expectedPct * 100) / 100, gap: Math.round(gap * 100) / 100 }
    })

    return NextResponse.json({
      bottleneck: worst,
      expected_pct: Math.round(expectedPct * 100) / 100,
      krs: krDetails,
    })
  }

  // ── Budget-actuals view ──
  if (view === "budget-actuals") {
    const goalId = searchParams.get("goal_id")
    if (!goalId)
      return NextResponse.json(
        { error: "goal_id required" },
        { status: 400 },
      )

    const { data: goal } = await supabaseAdmin
      .from("op_goals")
      .select("budget, entity, period_start, period_end")
      .eq("id", goalId)
      .single()

    if (!goal)
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })

    const budget = Number(goal.budget ?? 0)
    let apQuery = supabaseAdmin
      .from("fin_invoices")
      .select("gross")
      .eq("direction", "ap")
      .neq("status", "cancelled")
    let arQuery = supabaseAdmin
      .from("fin_invoices")
      .select("gross")
      .eq("direction", "ar")
      .neq("status", "cancelled")

    if (goal.entity) {
      apQuery = apQuery.eq("entity", goal.entity)
      arQuery = arQuery.eq("entity", goal.entity)
    }
    if (goal.period_start) {
      apQuery = apQuery.gte("invoice_date", goal.period_start)
      arQuery = arQuery.gte("invoice_date", goal.period_start)
    }
    if (goal.period_end) {
      apQuery = apQuery.lte("invoice_date", goal.period_end)
      arQuery = arQuery.lte("invoice_date", goal.period_end)
    }

    const [{ data: apData }, { data: arData }] = await Promise.all([
      apQuery,
      arQuery,
    ])

    const actualAp = (apData ?? []).reduce(
      (s, r) => s + Number(r.gross ?? 0),
      0,
    )
    const actualAr = (arData ?? []).reduce(
      (s, r) => s + Number(r.gross ?? 0),
      0,
    )
    const netSpend = actualAp
    const variance = budget - netSpend
    const variancePct = budget > 0 ? Math.round((variance / budget) * 100) : 0

    // T6.2: Monthly breakdown from boekhouding
    let monthlyApQ = supabaseAdmin
      .from("fin_invoices")
      .select("invoice_date, gross")
      .eq("direction", "ap")
      .neq("status", "cancelled")
    let monthlyArQ = supabaseAdmin
      .from("fin_invoices")
      .select("invoice_date, gross")
      .eq("direction", "ar")
      .neq("status", "cancelled")
    if (goal.entity) { monthlyApQ = monthlyApQ.eq("entity", goal.entity); monthlyArQ = monthlyArQ.eq("entity", goal.entity) }
    if (goal.period_start) { monthlyApQ = monthlyApQ.gte("invoice_date", goal.period_start); monthlyArQ = monthlyArQ.gte("invoice_date", goal.period_start) }
    if (goal.period_end) { monthlyApQ = monthlyApQ.lte("invoice_date", goal.period_end); monthlyArQ = monthlyArQ.lte("invoice_date", goal.period_end) }
    const [{ data: mAp }, { data: mAr }] = await Promise.all([monthlyApQ, monthlyArQ])
    const monthMap: Record<string, { ap: number; ar: number }> = {}
    for (const inv of mAp ?? []) {
      const m = (inv.invoice_date ?? '').slice(0, 7)
      if (!m) continue
      monthMap[m] ??= { ap: 0, ar: 0 }
      monthMap[m].ap += Number(inv.gross ?? 0)
    }
    for (const inv of mAr ?? []) {
      const m = (inv.invoice_date ?? '').slice(0, 7)
      if (!m) continue
      monthMap[m] ??= { ap: 0, ar: 0 }
      monthMap[m].ar += Number(inv.gross ?? 0)
    }
    const monthly = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ap: Math.round(v.ap * 100) / 100, ar: Math.round(v.ar * 100) / 100 }))

    return NextResponse.json({
      budget: {
        budget,
        actual_ap: Math.round(actualAp * 100) / 100,
        actual_ar: Math.round(actualAr * 100) / 100,
        net_spend: Math.round(netSpend * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variance_pct: variancePct,
      },
      monthly,
    })
  }

  // ── T6.1: Historical ledger — closed goals with final scores ──
  if (view === "historical-ledger") {
    let q = supabaseAdmin
      .from("op_goals")
      .select("id, goal_number, title, entity, period_type, period_start, period_end, status, progress_pct, health, budget, closed_at, closing_note, key_results:op_goal_key_results(id, title, baseline, target, current_value, progress_pct, unit_label, direction)")
      .in("status", ["achieved", "semi_achieved", "closed", "cancelled"])
      .is("deleted_at", null)
      .order("period_end", { ascending: false })
    if (tenantId) q = q.eq("tenant_id", tenantId)
    if (entity) q = q.eq("entity", entity)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ goals: data ?? [] })
  }

  // ── T6.3: Forecast projection for a goal's KRs ──
  if (view === "forecast") {
    const goalId = searchParams.get("goal_id")
    if (!goalId) return NextResponse.json({ error: "goal_id required" }, { status: 400 })

    const { data: goal } = await supabaseAdmin
      .from("op_goals")
      .select("period_start, period_end")
      .eq("id", goalId)
      .single()
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 })

    const { data: krs } = await supabaseAdmin
      .from("op_goal_key_results")
      .select("id, title, baseline, target, current_value, progress_pct, direction, unit_label")
      .eq("goal_id", goalId)
      .is("deleted_at", null)

    if (!krs?.length) return NextResponse.json({ forecasts: [] })

    const krIds = krs.map(k => k.id)
    const { data: snaps } = await supabaseAdmin
      .from("op_goal_kr_snapshots")
      .select("kr_id, snapshot_date, value, progress_pct")
      .in("kr_id", krIds)
      .order("snapshot_date", { ascending: true })

    const now = new Date()
    const periodEnd = goal.period_end ? new Date(goal.period_end) : null
    const periodStart = goal.period_start ? new Date(goal.period_start) : null
    const daysRemaining = periodEnd ? Math.max(0, (periodEnd.getTime() - now.getTime()) / 86400000) : 30

    const forecasts = krs.map(kr => {
      const krSnaps = (snaps ?? []).filter(s => s.kr_id === kr.id)
      if (krSnaps.length < 2) {
        return { kr_id: kr.id, title: kr.title, trend: 'insufficient_data' as const, projected_value: null, projected_pct: null, will_hit_target: null, days_remaining: Math.round(daysRemaining) }
      }
      const recent = krSnaps.slice(-7)
      const firstSnap = recent[0]
      const lastSnap = recent[recent.length - 1]
      const daySpan = Math.max(1, (new Date(lastSnap.snapshot_date).getTime() - new Date(firstSnap.snapshot_date).getTime()) / 86400000)
      const dailyRate = (Number(lastSnap.value) - Number(firstSnap.value)) / daySpan

      const projectedValue = Number(kr.current_value) + dailyRate * daysRemaining
      const range = Number(kr.target) - Number(kr.baseline)
      let projectedPct = range !== 0 ? ((projectedValue - Number(kr.baseline)) / range) * 100 : 0
      if (kr.direction === 'decrease') {
        projectedPct = range !== 0 ? ((Number(kr.baseline) - projectedValue) / (Number(kr.baseline) - Number(kr.target))) * 100 : 0
      }
      projectedPct = Math.round(Math.max(0, Math.min(150, projectedPct)) * 100) / 100

      const willHit = kr.direction === 'decrease'
        ? projectedValue <= Number(kr.target)
        : projectedValue >= Number(kr.target)

      const trend = dailyRate > 0.01 ? 'up' : dailyRate < -0.01 ? 'down' : 'flat'
      return {
        kr_id: kr.id, title: kr.title, trend,
        daily_rate: Math.round(dailyRate * 100) / 100,
        projected_value: Math.round(projectedValue * 100) / 100,
        projected_pct: projectedPct,
        will_hit_target: willHit,
        days_remaining: Math.round(daysRemaining),
        unit_label: kr.unit_label,
        current_value: Number(kr.current_value),
        target: Number(kr.target),
      }
    })
    return NextResponse.json({ forecasts })
  }

  // ── T6.4: Entity scorecard summary ──
  if (view === "entity-scorecard") {
    const targetEntity = searchParams.get("entity")
    if (!targetEntity) return NextResponse.json({ error: "entity required" }, { status: 400 })

    let q = supabaseAdmin
      .from("op_goals")
      .select("id, status, progress_pct, health, budget, key_results:op_goal_key_results(id, title, progress_pct, current_value, target, unit_label, baseline)")
      .eq("entity", targetEntity)
      .is("deleted_at", null)
    if (tenantId) q = q.eq("tenant_id", tenantId)
    const { data: goals, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const rows = goals ?? []
    const active = rows.filter(g => g.status === 'active')
    const closed = rows.filter(g => ['achieved', 'semi_achieved', 'closed'].includes(g.status))
    const healthCounts = { on_track: 0, at_risk: 0, off_track: 0 }
    active.forEach(g => { if (g.health && g.health in healthCounts) (healthCounts as Record<string,number>)[g.health]++ })
    const avgProgress = active.length > 0 ? Math.round(active.reduce((s, g) => s + Number(g.progress_pct ?? 0), 0) / active.length) : 0
    const allKrs = rows.flatMap(g => (g.key_results ?? []) as any[])
    const totalBudget = rows.reduce((s, g) => s + Number(g.budget ?? 0), 0)

    return NextResponse.json({
      entity: targetEntity,
      active_goals: active.length,
      closed_goals: closed.length,
      avg_progress: avgProgress,
      health: healthCounts,
      total_budget: Math.round(totalBudget * 100) / 100,
      key_results: allKrs.map((kr: any) => ({
        id: kr.id, title: kr.title, progress_pct: Number(kr.progress_pct ?? 0),
        current_value: Number(kr.current_value ?? 0), target: Number(kr.target ?? 0), unit_label: kr.unit_label,
      })),
    })
  }

  // ── Tree / flat listing ──
  let query = supabaseAdmin
    .from("op_goals")
    .select("*, key_results:op_goal_key_results(*)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (tenantId) query = query.eq("tenant_id", tenantId)
  if (entity) query = query.eq("entity", entity)
  if (status) query = query.eq("status", status)
  if (priority) query = query.eq("priority", priority)

  if (flat) {
    if (parentId) query = query.eq("parent_goal_id", parentId)
  } else {
    query = query.is("parent_goal_id", null)
  }

  const { data, error } = await query
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  if (!flat) {
    let childQuery = supabaseAdmin
      .from("op_goals")
      .select("*, key_results:op_goal_key_results(*)")
      .is("deleted_at", null)
      .not("parent_goal_id", "is", null)
      .order("level", { ascending: true })
      .order("created_at", { ascending: false })
    if (tenantId) childQuery = childQuery.eq("tenant_id", tenantId)

    const { data: children, error: childErr } = await childQuery

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

  const allGoals = [...(data ?? [])]
  const collectAll = (gs: any[]): any[] => gs.flatMap(g => [g, ...collectAll(g.children ?? [])])
  const every = collectAll(allGoals)
  const allKrIds = every.flatMap((g: any) => (g.key_results ?? []).map((kr: any) => kr.id)).filter(Boolean)

  if (allKrIds.length > 0) {
    const { data: taskLinks } = await supabaseAdmin
      .from("op_tasks")
      .select("goal_kr_id")
      .in("goal_kr_id", allKrIds)
      .is("deleted_at", null)
    const krWithTasks = new Set((taskLinks ?? []).map(t => t.goal_kr_id))
    for (const g of every) {
      const gKrIds = (g.key_results ?? []).map((kr: any) => kr.id)
      const count = gKrIds.filter((id: string) => krWithTasks.has(id)).length
      ;(g as Record<string, unknown>).linked_task_count = count
    }
  }

  return NextResponse.json({ goals: data ?? [] })
}

// ── POST — action dispatch + create ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const action = body.action as string | undefined

  // ── update_kr_value ──
  if (action === "update_kr_value") {
    const krId = body.kr_id as string
    const currentValue = body.current_value as number
    if (!krId || currentValue == null)
      return NextResponse.json(
        { error: "kr_id and current_value required" },
        { status: 400 },
      )

    const { data: kr } = await supabaseAdmin
      .from("op_goal_key_results")
      .select("baseline, target, direction, goal_id")
      .eq("id", krId)
      .single()
    if (!kr)
      return NextResponse.json({ error: "KR not found" }, { status: 404 })

    const progressPct = calcProgress(
      currentValue,
      Number(kr.baseline),
      Number(kr.target),
      kr.direction,
    )
    const paceDelta = progressPct - 50

    await supabaseAdmin
      .from("op_goal_key_results")
      .update({
        current_value: currentValue,
        progress_pct: progressPct,
        pace_delta: paceDelta,
      })
      .eq("id", krId)

    // Snapshot today
    const today = new Date().toISOString().slice(0, 10)
    await supabaseAdmin.from("op_goal_kr_snapshots").upsert(
      {
        kr_id: krId,
        snapshot_date: today,
        value: currentValue,
        progress_pct: progressPct,
      },
      { onConflict: "kr_id,snapshot_date" },
    )

    await recomputeGoal(kr.goal_id)

    return NextResponse.json({ ok: true, progress_pct: progressPct })
  }

  // ── checkin ──
  if (action === "checkin") {
    const goalId = body.goal_id as string
    const confidence = body.confidence as number
    if (!goalId || confidence == null)
      return NextResponse.json(
        { error: "goal_id and confidence required" },
        { status: 400 },
      )

    const { data: checkin, error } = await supabaseAdmin
      .from("op_goal_checkins")
      .insert({
        goal_id: goalId,
        author_id: (body.author_id as string) || null,
        confidence: Math.min(5, Math.max(1, confidence)),
        note: (body.note as string)?.trim() || null,
        blockers: (body.blockers as string)?.trim() || null,
      })
      .select()
      .single()

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ checkin }, { status: 201 })
  }

  // ── compute_kr ──
  if (action === "compute_kr") {
    const krId = body.kr_id as string
    if (!krId)
      return NextResponse.json(
        { error: "kr_id required" },
        { status: 400 },
      )

    const { data: kr } = await supabaseAdmin
      .from("op_goal_key_results")
      .select("*, goal:op_goals(entity, period_start, period_end)")
      .eq("id", krId)
      .single()
    if (!kr)
      return NextResponse.json({ error: "KR not found" }, { status: 404 })

    if (!kr.metric_code)
      return NextResponse.json(
        { error: "KR has no metric_code (manual only)" },
        { status: 400 },
      )

    const { data: cat } = await supabaseAdmin
      .from("op_goal_metrics_catalog")
      .select("query_key")
      .eq("code", kr.metric_code)
      .single()
    if (!cat)
      return NextResponse.json(
        { error: `Unknown metric_code: ${kr.metric_code}` },
        { status: 400 },
      )

    const goal = kr.goal as { entity?: string; period_start?: string; period_end?: string } | null
    const ps = goal?.period_start ?? new Date(new Date().getFullYear(), 0, 1).toISOString()
    const pe = goal?.period_end ?? new Date().toISOString()

    const result = await computeMetric(
      supabaseAdmin,
      cat.query_key,
      ps,
      pe,
      goal?.entity ?? undefined,
    )

    const progressPct = calcProgress(
      result.value,
      Number(kr.baseline),
      Number(kr.target),
      kr.direction,
    )

    await supabaseAdmin
      .from("op_goal_key_results")
      .update({
        current_value: result.value,
        progress_pct: progressPct,
      })
      .eq("id", krId)

    const today = new Date().toISOString().slice(0, 10)
    await supabaseAdmin.from("op_goal_kr_snapshots").upsert(
      {
        kr_id: krId,
        snapshot_date: today,
        value: result.value,
        progress_pct: progressPct,
      },
      { onConflict: "kr_id,snapshot_date" },
    )

    await recomputeGoal(kr.goal_id)

    return NextResponse.json({
      ok: true,
      value: result.value,
      progress_pct: progressPct,
      metric: result,
    })
  }

  // ── update_goal ──
  if (action === "update_goal") {
    const goalId = body.goal_id as string
    if (!goalId)
      return NextResponse.json({ error: "goal_id required" }, { status: 400 })

    const allowed = [
      "title", "description", "vision_text", "entity", "period_type",
      "period_start", "period_end", "priority", "goal_type", "budget",
      "checkin_frequency", "status", "parent_goal_id", "owner_id",
      "health_override", "strategic_pillar", "tags",
    ]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    const { error } = await supabaseAdmin
      .from("op_goals")
      .update(updates)
      .eq("id", goalId)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    if (updates.status === "paused" || updates.status === "cancelled") {
      await supabaseAdmin
        .from("op_goals")
        .update({ next_review_at: null })
        .eq("id", goalId)
    }

    return NextResponse.json({ ok: true })
  }

  // ── update_kr ──
  if (action === "update_kr") {
    const krId = body.kr_id as string
    if (!krId)
      return NextResponse.json({ error: "kr_id required" }, { status: 400 })

    const allowed = [
      "title", "description", "metric_type", "direction", "baseline",
      "target", "unit_label", "weight", "metric_code", "metric_source", "data_source",
    ]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    const { error } = await supabaseAdmin
      .from("op_goal_key_results")
      .update(updates)
      .eq("id", krId)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    if (updates.baseline !== undefined || updates.target !== undefined) {
      const { data: kr } = await supabaseAdmin
        .from("op_goal_key_results")
        .select("current_value, baseline, target, direction, goal_id")
        .eq("id", krId)
        .single()
      if (kr) {
        const pct = calcProgress(Number(kr.current_value), Number(kr.baseline), Number(kr.target), kr.direction)
        await supabaseAdmin.from("op_goal_key_results").update({ progress_pct: pct }).eq("id", krId)
        await recomputeGoal(kr.goal_id)
      }
    }

    return NextResponse.json({ ok: true })
  }

  // ── delete_kr ──
  if (action === "delete_kr") {
    const krId = body.kr_id as string
    if (!krId)
      return NextResponse.json({ error: "kr_id required" }, { status: 400 })

    const { data: kr } = await supabaseAdmin
      .from("op_goal_key_results")
      .select("goal_id")
      .eq("id", krId)
      .single()

    const { error } = await supabaseAdmin
      .from("op_goal_key_results")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", krId)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    if (kr) await recomputeGoal(kr.goal_id)

    return NextResponse.json({ ok: true })
  }

  // ── add_kr (to existing goal) ──
  if (action === "add_kr") {
    const goalId = body.goal_id as string
    if (!goalId)
      return NextResponse.json({ error: "goal_id required" }, { status: 400 })

    const { data: goal } = await supabaseAdmin
      .from("op_goals")
      .select("tenant_id")
      .eq("id", goalId)
      .single()

    if (!goal)
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })

    const { data: kr, error } = await supabaseAdmin
      .from("op_goal_key_results")
      .insert({
        goal_id: goalId,
        tenant_id: goal.tenant_id,
        title: (body.title as string)?.trim() || "New Key Result",
        metric_type: (body.metric_type as string) || "manual",
        direction: (body.direction as string) || "increase",
        baseline: body.baseline ?? 0,
        target: body.target ?? 100,
        unit_label: (body.unit_label as string) || "%",
        weight: body.weight ?? 1,
        metric_code: (body.metric_code as string)?.trim() || null,
      })
      .select()
      .single()

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ kr }, { status: 201 })
  }

  // ── update_cycle (DIAGNOSE / DECIDE / LEARN steps) ──
  if (action === "update_cycle") {
    const cycleId = body.cycle_id as string
    if (!cycleId)
      return NextResponse.json({ error: "cycle_id required" }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (body.look_summary !== undefined) updates.look_summary = (body.look_summary as string)?.trim() || null
    if (body.root_cause !== undefined) updates.root_cause = (body.root_cause as string)?.trim() || null
    if (body.decision !== undefined) updates.decision = body.decision as string
    if (body.decision_note !== undefined) updates.decision_note = (body.decision_note as string)?.trim() || null
    if (body.learning !== undefined) updates.learning = (body.learning as string)?.trim() || null

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    const { error } = await supabaseAdmin
      .from("op_goal_cycles")
      .update(updates)
      .eq("id", cycleId)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  // ── close_cycle ──
  if (action === "close_cycle") {
    const cycleId = body.cycle_id as string
    const goalId = body.goal_id as string
    if (!cycleId || !goalId)
      return NextResponse.json({ error: "cycle_id and goal_id required" }, { status: 400 })

    const { error } = await supabaseAdmin
      .from("op_goal_cycles")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", cycleId)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    // Advance next_review_at
    const { data: goal } = await supabaseAdmin
      .from("op_goals")
      .select("checkin_frequency")
      .eq("id", goalId)
      .single()

    const CADENCE_DAYS: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }
    const days = CADENCE_DAYS[goal?.checkin_frequency ?? "weekly"] ?? 7
    await supabaseAdmin
      .from("op_goals")
      .update({
        next_review_at: new Date(Date.now() + days * 86400000).toISOString(),
        last_review_at: new Date().toISOString(),
      })
      .eq("id", goalId)

    return NextResponse.json({ ok: true })
  }

  // ── close_out ──
  if (action === "close_out") {
    const goalId = body.goal_id as string
    const achieved = body.achieved as boolean
    if (!goalId)
      return NextResponse.json(
        { error: "goal_id required" },
        { status: 400 },
      )

    const newStatus = achieved ? "achieved" : "semi_achieved"
    const closedAt = new Date().toISOString()
    const closingNote = (body.closing_note as string)?.trim() || null

    const { data: goalData } = await supabaseAdmin
      .from("op_goals")
      .select("tenant_id, title, goal_number, entity, period_type, period_start, period_end, level, progress_pct, health, budget, vision_text")
      .eq("id", goalId)
      .single()

    const { error } = await supabaseAdmin
      .from("op_goals")
      .update({
        status: newStatus,
        closed_at: closedAt,
        closed_by: (body.closed_by as string) || null,
        closing_note: closingNote,
      })
      .eq("id", goalId)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 })

    // T6.1: Create period ledger entry
    if (goalData) {
      const { data: krs } = await supabaseAdmin
        .from("op_goal_key_results")
        .select("id, kr_number, title, baseline, target, current_value, progress_pct, unit_label, direction, weight")
        .eq("goal_id", goalId)
        .is("deleted_at", null)
      const { data: checkins } = await supabaseAdmin
        .from("op_goal_checkins")
        .select("id")
        .eq("goal_id", goalId)

      await supabaseAdmin.from("op_goal_period_ledger").insert({
        tenant_id: goalData.tenant_id,
        goal_id: goalId,
        period_type: goalData.period_type ?? 'custom',
        period_start: goalData.period_start ?? closedAt.slice(0, 10),
        period_end: goalData.period_end ?? closedAt.slice(0, 10),
        entity: goalData.entity,
        closed_at: closedAt,
        closed_by: (body.closed_by as string) || null,
        final_status: newStatus,
        final_health: goalData.health ?? 'no_data',
        final_progress_pct: Number(goalData.progress_pct ?? 0),
        budget: goalData.budget,
        vision_text: goalData.vision_text,
        goal_title: goalData.title,
        goal_number: goalData.goal_number,
        level: goalData.level ?? 0,
        kr_snapshot: (krs ?? []).map(k => ({
          id: k.id, kr_number: k.kr_number, title: k.title,
          baseline: k.baseline, target: k.target, current_value: k.current_value,
          progress_pct: k.progress_pct, unit_label: k.unit_label, direction: k.direction, weight: k.weight,
        })),
        checkin_count: checkins?.length ?? 0,
        notes: closingNote,
      })
    }

    return NextResponse.json({ ok: true, status: newStatus })
  }

  // ── trigger_cycle — manually open a review cycle for a goal ──
  if (action === "trigger_cycle") {
    const goalId = body.goal_id as string
    if (!goalId)
      return NextResponse.json({ error: "goal_id required" }, { status: 400 })

    const { data: goal } = await supabaseAdmin
      .from("op_goals")
      .select("id, tenant_id, entity, period_start, period_end, progress_pct, health, checkin_frequency")
      .eq("id", goalId)
      .single()

    if (!goal)
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })

    // Check for an already-open cycle
    const { data: openCycle } = await supabaseAdmin
      .from("op_goal_cycles")
      .select("id, cycle_number")
      .eq("goal_id", goalId)
      .eq("status", "open")
      .limit(1)
      .single()

    if (openCycle)
      return NextResponse.json(
        { error: `Cycle #${openCycle.cycle_number} is already open`, cycle_id: openCycle.id },
        { status: 409 },
      )

    // Compute expected progress from period
    const now = Date.now()
    const ps = goal.period_start ? new Date(goal.period_start).getTime() : now
    const pe = goal.period_end ? new Date(goal.period_end).getTime() : now
    const expectedPct = pe > ps ? Math.max(0, Math.min(100, Math.round(((now - ps) / (pe - ps)) * 10000) / 100)) : 50
    const actualPct = Number(goal.progress_pct ?? 0)
    const gapPct = Math.round((actualPct - expectedPct) * 100) / 100

    // Find bottleneck KR
    const { data: krs } = await supabaseAdmin
      .from("op_goal_key_results")
      .select("id, progress_pct, weight, title, kr_number")
      .eq("goal_id", goalId)
      .is("deleted_at", null)

    let bottleneckId: string | null = null
    if (krs?.length) {
      let worstGap = Infinity
      for (const kr of krs) {
        const progress = Number(kr.progress_pct ?? 0)
        const weight = Number(kr.weight ?? 1)
        const weightedGap = (progress - expectedPct) * weight
        if (weightedGap < worstGap) {
          worstGap = weightedGap
          bottleneckId = kr.id
        }
      }
    }

    // Next cycle number
    const { data: lastCycle } = await supabaseAdmin
      .from("op_goal_cycles")
      .select("cycle_number")
      .eq("goal_id", goalId)
      .order("cycle_number", { ascending: false })
      .limit(1)
      .single()

    const cycleNumber = (lastCycle?.cycle_number ?? 0) + 1

    const { data: newCycle, error: insertErr } = await supabaseAdmin
      .from("op_goal_cycles")
      .insert({
        tenant_id: goal.tenant_id,
        goal_id: goalId,
        cycle_number: cycleNumber,
        expected_progress: expectedPct,
        actual_progress: actualPct,
        gap_pct: gapPct,
        health_at_review: goal.health,
        bottleneck_kr_id: bottleneckId,
      })
      .select()
      .single()

    if (insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // Advance next_review_at
    const CADENCE_DAYS: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }
    const days = CADENCE_DAYS[goal.checkin_frequency ?? "weekly"] ?? 7
    await supabaseAdmin
      .from("op_goals")
      .update({
        next_review_at: new Date(Date.now() + days * 86400000).toISOString(),
        last_review_at: new Date().toISOString(),
      })
      .eq("id", goalId)

    return NextResponse.json({ ok: true, cycle: newCycle, cycle_number: cycleNumber })
  }

  // ── Default: create goal ──
  const createBody = body as unknown as GoalCreateInput
  if (!createBody.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const keyResults = createBody.key_results ?? []

  const { data: goal, error } = await supabaseAdmin
    .from("op_goals")
    .insert({
      ...(createBody.tenant_id ? { tenant_id: createBody.tenant_id } : {}),
      title: createBody.title.trim(),
      description: createBody.description?.trim() || null,
      vision_text: createBody.vision_text?.trim() || null,
      entity: createBody.entity || null,
      parent_goal_id: createBody.parent_goal_id || null,
      level: createBody.level ?? 0,
      period_type: createBody.period_type || "quarterly",
      period_start: createBody.period_start || null,
      period_end: createBody.period_end || null,
      owner_id: createBody.owner_id || null,
      budget: createBody.budget ?? null,
      priority: createBody.priority || "medium",
      goal_type: createBody.goal_type || "committed",
      visibility: createBody.visibility || "public",
      tags: createBody.tags ?? [],
      contributor_ids: createBody.contributor_ids ?? [],
      strategic_pillar: createBody.strategic_pillar?.trim() || null,
      checkin_frequency: createBody.checkin_frequency || "weekly",
    })
    .select()
    .single()

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  if (keyResults.length > 0) {
    const krRows = keyResults.map((kr) => ({
      goal_id: goal.id,
      tenant_id: goal.tenant_id,
      title: kr.title.trim(),
      description: kr.description?.trim() || null,
      metric_type: kr.metric_type || "manual",
      direction: kr.direction || "increase",
      baseline: kr.baseline ?? 0,
      target: kr.target,
      unit_label: kr.unit_label || "%",
      weight: kr.weight ?? 1,
      metric_code: kr.metric_code?.trim() || null,
      metric_source: kr.metric_source?.trim() || null,
      data_source: kr.data_source?.trim() || null,
    }))

    const { error: krError } = await supabaseAdmin
      .from("op_goal_key_results")
      .insert(krRows)

    if (krError) {
      return NextResponse.json(
        {
          goal,
          warning: `Goal created but KR insert failed: ${krError.message}`,
        },
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
