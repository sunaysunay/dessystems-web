// ─────────────────────────────────────────────────────────────────────────────
// BOP Object Explorer — Core types
// These const arrays are the single source of truth; DB CHECK constraints mirror them.
// ─────────────────────────────────────────────────────────────────────────────

export const OBJECT_TYPES = [
  'screen',
  'api',
  'component',
  'table',
  'workflow',
  'job',
  'permission',
  'setting',
  'module',
] as const;
export type ObjectType = typeof OBJECT_TYPES[number];

export const DEP_TYPES = [
  'calls',
  'renders',
  'reads',
  'writes',
  'triggers',
  'inherits',
  'uses',
] as const;
export type DepType = typeof DEP_TYPES[number];

export const OBJECT_STATUSES = ['active', 'deprecated', 'stub', 'planned'] as const;
export type ObjectStatus = typeof OBJECT_STATUSES[number];

// object_id format rules (enforced at application layer):
//   screen     → screen:{TC_CODE}              e.g. screen:CR001
//   api        → api:{path}:{METHOD}            e.g. api:crm/leads:GET
//   table      → table:{table_name}             e.g. table:crm_leads
//   component  → component:{ComponentName}      e.g. component:ScreenHeader
//   module     → module:{module_id}             e.g. module:CRM
//   workflow   → workflow:{slug}
//   job        → job:{slug}
//   permission → permission:{role_id}:{screen_id}
//   setting    → setting:{key}

export interface BopObject {
  id?: string;
  object_id: string;
  type: ObjectType;
  module: string;
  name: string;
  route?: string;
  source_path?: string;
  description?: string;
  status: ObjectStatus;
  registered_at?: string;
  updated_at?: string;
}

export interface BopDependency {
  id?: string;
  from_id: string;
  to_id: string;
  dep_type: DepType;
  auto_detected?: boolean;
  label?: string;
  created_at?: string;
}

export function validateObjectId(obj: BopObject): string | null {
  const { type, object_id } = obj;
  if (!object_id) return 'object_id is required';
  const prefix = object_id.split(':')[0];
  if (prefix !== type) return `object_id must start with '${type}:', got '${prefix}:'`;
  return null;
}

export function objectIdFor(type: ObjectType, identifier: string): string {
  return `${type}:${identifier}`;
}
