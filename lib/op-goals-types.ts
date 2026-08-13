export type EntityScope =
  | "des_mobil"
  | "des_campers"
  | "des_shop"
  | "des_systems"
  | "des_group"

export type PeriodType = "monthly" | "quarterly" | "semi_annual" | "annual" | "custom"
export type GoalStatus = "active" | "achieved" | "semi_achieved" | "paused" | "closed"
export type GoalHealth = "on_track" | "at_risk" | "off_track" | "no_data"
export type GoalPriority = "critical" | "high" | "medium" | "low"
export type GoalType = "committed" | "aspirational"
export type Visibility = "public" | "entity" | "private"
export type CheckinFrequency = "daily" | "weekly" | "biweekly" | "monthly"
export type MetricType = "count" | "sum" | "avg" | "ratio" | "manual"
export type Direction = "increase" | "decrease"

export interface KeyResult {
  id: string
  tenant_id: number
  kr_number: string
  goal_id: string
  title: string
  description: string | null
  metric_type: MetricType
  direction: Direction
  baseline: number
  target: number
  current_value: number
  unit_label: string
  weight: number
  progress_pct: number
  pace_delta: number
  metric_source: string | null
  metric_code: string | null
  data_source: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface GoalSnapshot {
  id: string
  kr_id: string
  snapshot_date: string
  value: number
  progress_pct: number
  // Legacy fields from op_goal_snapshots (used by orphaned [locale] pages, removed in P6)
  current_value?: number
  note?: string | null
  measured_at?: string
  source?: string
  goal_id?: string
}

export interface GoalCheckin {
  id: string
  goal_id: string
  author_id: string | null
  confidence: number
  note: string | null
  blockers: string | null
  created_at: string
}

export interface Goal {
  id: string
  tenant_id: number
  goal_number: string
  parent_goal_id: string | null
  level: number
  title: string
  description: string | null
  vision_text: string | null
  entity: EntityScope | null
  period_type: PeriodType
  period_start: string | null
  period_end: string | null
  status: GoalStatus
  health: GoalHealth
  health_override: string | null
  progress_pct: number
  owner_id: string | null
  budget: number | null
  priority: GoalPriority
  goal_type: GoalType
  visibility: Visibility
  tags: string[]
  contributor_ids: string[]
  strategic_pillar: string | null
  checkin_frequency: CheckinFrequency
  next_review_at: string | null
  last_review_at: string | null
  closed_at: string | null
  closed_by: string | null
  closing_note: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  key_results?: KeyResult[]
  children?: Goal[]
  checkins?: GoalCheckin[]
}

export interface GoalCreateInput {
  tenant_id?: number
  title: string
  description?: string
  vision_text?: string
  entity?: EntityScope
  parent_goal_id?: string
  level?: number
  period_type?: PeriodType
  period_start?: string
  period_end?: string
  owner_id?: string
  budget?: number
  priority?: GoalPriority
  goal_type?: GoalType
  visibility?: Visibility
  tags?: string[]
  contributor_ids?: string[]
  strategic_pillar?: string
  checkin_frequency?: CheckinFrequency
  key_results?: KeyResultCreateInput[]
}

export interface KeyResultCreateInput {
  title: string
  description?: string
  metric_type?: MetricType
  direction?: Direction
  baseline?: number
  target: number
  unit_label?: string
  weight?: number
  metric_code?: string
  metric_source?: string
  data_source?: string
}

export const ENTITY_LABELS: Record<EntityScope, string> = {
  des_mobil: "DES Mobil",
  des_campers: "DES Campers",
  des_shop: "DES Shop",
  des_systems: "DES Systems",
  des_group: "DES Group",
}

export const ENTITY_COLORS: Record<EntityScope, string> = {
  des_mobil: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  des_campers: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  des_shop: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  des_systems: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  des_group: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
}

export const PERIOD_LABELS: Record<PeriodType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  custom: "Custom",
}

export const STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  achieved: "Achieved",
  semi_achieved: "Semi-Achieved",
  paused: "Paused",
  closed: "Closed",
}

export const HEALTH_LABELS: Record<GoalHealth, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
  no_data: "No Data",
}

export const PRIORITY_LABELS: Record<GoalPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

export const PRIORITY_COLORS: Record<GoalPriority, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

export const HEALTH_COLORS: Record<GoalHealth, string> = {
  on_track: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  off_track: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  no_data: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
}

export const HEALTH_DOT_COLORS: Record<GoalHealth, string> = {
  on_track: "bg-emerald-500",
  at_risk: "bg-amber-500",
  off_track: "bg-red-500",
  no_data: "bg-slate-400",
}

export const STATUS_COLORS: Record<GoalStatus, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  achieved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  semi_achieved: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paused: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  closed: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
}

export const LEVEL_LABELS: Record<number, string> = {
  0: "Goal",
  1: "Objective",
  2: "Key Result",
}

export const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
}

export const METRIC_TYPE_LABELS: Record<MetricType, string> = {
  count: "Count",
  sum: "Sum",
  avg: "Average",
  ratio: "Ratio",
  manual: "Manual",
}

export function computePeriodEnd(type: PeriodType, start: string): string {
  const d = new Date(start)
  switch (type) {
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      break
    case "quarterly":
      d.setMonth(d.getMonth() + 3)
      break
    case "semi_annual":
      d.setMonth(d.getMonth() + 6)
      break
    case "annual":
      d.setFullYear(d.getFullYear() + 1)
      break
    case "custom":
      return ""
  }
  d.setDate(d.getDate() - 1)
  return d.toISOString().split("T")[0]
}
