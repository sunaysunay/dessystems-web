export interface OpGoal {
  id: string;
  tenant_id: string;
  goal_number: string;
  parent_goal_id: string | null;
  level: number;
  title: string;
  description: string | null;
  vision_text: string | null;
  entity: string | null;
  period_type: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  health: string;
  health_override: string | null;
  progress_pct: number;
  owner_id: string | null;
  budget: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  children?: OpGoal[];
  key_results?: OpKeyResult[];
}

export interface OpKeyResult {
  id: string;
  tenant_id: string;
  goal_id: string;
  kr_number: string;
  title: string;
  description: string | null;
  metric_type: string;
  direction: string;
  baseline: number;
  target: number;
  current_value: number;
  unit_label: string;
  weight: number;
  metric_source: string | null;
  progress_pct: number;
  pace_delta: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpCheckin {
  id: string;
  goal_id: string;
  author_id: string | null;
  confidence: number;
  note: string | null;
  blockers: string | null;
  created_at: string;
}

export const GOAL_STATUS_COLOR: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  achieved: 'bg-emerald-100 text-emerald-700',
  semi_achieved: 'bg-amber-100 text-amber-700',
  paused: 'bg-slate-200 text-slate-500',
  closed: 'bg-slate-200 text-slate-500',
};

export const GOAL_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  achieved: 'Achieved',
  semi_achieved: 'Semi-Achieved',
  paused: 'Paused',
  closed: 'Closed',
};

export const HEALTH_COLOR: Record<string, string> = {
  on_track: 'bg-emerald-500',
  at_risk: 'bg-amber-500',
  off_track: 'bg-red-500',
};

export const HEALTH_LABEL: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
};

export const ENTITY_LABEL: Record<string, string> = {
  des_mobil: 'DES Mobil',
  des_campers: 'DES Campers',
  des_shop: 'DES Shop',
  des_systems: 'DES Systems',
  des_group: 'DES Group',
};

export const ENTITY_COLOR: Record<string, string> = {
  des_mobil: 'bg-blue-100 text-blue-700',
  des_campers: 'bg-teal-100 text-teal-700',
  des_shop: 'bg-purple-100 text-purple-700',
  des_systems: 'bg-orange-100 text-orange-700',
  des_group: 'bg-slate-100 text-slate-700',
};

export const LEVEL_LABEL: Record<number, string> = {
  0: 'Goal',
  1: 'Objective',
  2: 'Key Result',
};

export const CONFIDENCE_LABEL: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Very High',
};

export const METRIC_TYPE_LABEL: Record<string, string> = {
  count: 'Count',
  sum: 'Sum',
  avg: 'Average',
  ratio: 'Ratio',
  manual: 'Manual',
};
