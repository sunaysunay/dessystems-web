// Re-export everything from the canonical types file
// This file is kept for backwards compatibility — all types live in lib/op-goals-types.ts
export {
  type Goal as OpGoal,
  type KeyResult as OpKeyResult,
  type GoalCheckin as OpCheckin,
  ENTITY_LABELS as ENTITY_LABEL,
  ENTITY_COLORS as ENTITY_COLOR,
  STATUS_LABELS as GOAL_STATUS_LABEL,
  STATUS_COLORS as GOAL_STATUS_COLOR,
  HEALTH_LABELS as HEALTH_LABEL,
  HEALTH_DOT_COLORS as HEALTH_COLOR,
  LEVEL_LABELS as LEVEL_LABEL,
  CONFIDENCE_LABELS as CONFIDENCE_LABEL,
  METRIC_TYPE_LABELS as METRIC_TYPE_LABEL,
} from "@/lib/op-goals-types"
