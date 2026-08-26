// RBAC positive allowlist — which roles can access which console modules.
// Used by middleware.ts to gate /console routes. Every role must be listed
// explicitly; omitting a module means access denied for that role.

export type Role = 'super_admin' | 'platform_admin' | 'tenant_manager' | 'viewer';

export const SEG_TO_MODULE: Record<string, string> = {
  sys:  'SYS',
  dev:  'DEV',
  int:  'INT',
  fin:  'FIN',
  sal:  'SAL',
  mkp:  'MKP',
  crm:  'CRM',
  anl:  'ANL',
  ast:  'AST',
  mdm:  'MDM',
  mkt:  'MKT',
  ops:  'OPS',
  ai:   'AIM',
  shp:  'SHP',
  dae:  'DAE',
  wrk:  'WRK',
  pub:  'MKP',
  config: 'SYS',
};

export const ROLE_MODULES: Record<Role, string[]> = {
  super_admin:    ['SYS','DEV','INT','FIN','SAL','MKP','CRM','ANL','AST','MDM','MKT','OPS','AIM','SHP','DAE','WRK'],
  platform_admin: ['SYS','DEV','INT','FIN','SAL','MKP','CRM','ANL','AST','MDM','MKT','OPS','AIM','SHP','DAE','WRK'],
  tenant_manager: ['FIN','SAL','MKP','CRM','ANL','AST','MDM','MKT','OPS','AIM','SHP','WRK'],
  viewer:         ['ANL','AST','MKP','CRM','SAL'],
};

export function canAccessModule(role: Role, moduleCode: string): boolean {
  return ROLE_MODULES[role]?.includes(moduleCode) ?? false;
}

export function resolveModule(pathSegment: string): string | null {
  return SEG_TO_MODULE[pathSegment] ?? null;
}
