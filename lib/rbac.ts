// DESPANEL-V2 — role-based access (Phase 2/5). Centralised so guards stay consistent.
import type { Role } from './scope-context';

export const CAPABILITIES = {
  super_admin:     ['view', 'create', 'edit', 'publish', 'delete', 'migrate_tenant', 'manage_users', 'view_audit', 'view_systems'],
  platform_admin:  ['view', 'create', 'edit', 'publish', 'delete', 'view_audit'],
  tenant_manager:  ['view', 'create', 'edit', 'publish'],
  viewer:          ['view'],
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES][number];

export function can(role: Role, cap: Capability): boolean {
  return (CAPABILITIES[role] as readonly string[]).includes(cap);
}
