// DESPANEL-V2 — permission-based access control (module-scoped).
// Layered on top of lib/rbac.ts which handles generic capabilities.
import type { Role } from './scope-context';

/** Module permission scopes for the Markets module. */
export const MODULES = [
  'markets',
  'markets.corridor',
  'markets.country',
  'markets.pricing',
  'markets.distribution',
  'markets.opportunity',
  'markets.trade',
  'markets.dealer',
] as const;

export type Module = (typeof MODULES)[number];

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'publish' | 'approve';

const ALL_ACTIONS: Action[] = ['view', 'create', 'edit', 'delete', 'publish', 'approve'];
const WRITE_ACTIONS: Action[] = ['view', 'create', 'edit', 'publish'];
const VIEW_ONLY: Action[] = ['view'];

/**
 * Per-module permission map.  Keys are `Module` values; each entry maps
 * `Role → allowed actions`.  Unlisted module/role combos fall back to the
 * top-level `markets` entry so sub-modules inherit unless overridden.
 */
export const MODULE_PERMISSIONS: Record<Module, Record<Role, readonly Action[]>> = {
  'markets':              { super_admin: ALL_ACTIONS, platform_admin: ['view', 'create', 'edit', 'delete', 'publish'], tenant_manager: WRITE_ACTIONS, viewer: VIEW_ONLY },
  'markets.corridor':     { super_admin: ALL_ACTIONS, platform_admin: ['view', 'create', 'edit', 'delete', 'publish'], tenant_manager: WRITE_ACTIONS, viewer: VIEW_ONLY },
  'markets.country':      { super_admin: ALL_ACTIONS, platform_admin: ['view', 'create', 'edit', 'delete', 'publish'], tenant_manager: WRITE_ACTIONS, viewer: VIEW_ONLY },
  'markets.pricing':      { super_admin: ALL_ACTIONS, platform_admin: ['view', 'create', 'edit', 'delete'],            tenant_manager: ['view', 'create', 'edit'],    viewer: VIEW_ONLY },
  'markets.distribution': { super_admin: ALL_ACTIONS, platform_admin: ['view', 'create', 'edit', 'delete', 'publish'], tenant_manager: WRITE_ACTIONS, viewer: VIEW_ONLY },
  'markets.opportunity':  { super_admin: ALL_ACTIONS, platform_admin: ['view', 'create', 'edit', 'delete'],            tenant_manager: ['view', 'create', 'edit'],    viewer: VIEW_ONLY },
  'markets.trade':        { super_admin: ALL_ACTIONS, platform_admin: ['view', 'create', 'edit', 'delete', 'publish', 'approve'], tenant_manager: WRITE_ACTIONS, viewer: VIEW_ONLY },
  'markets.dealer':       { super_admin: ALL_ACTIONS, platform_admin: ['view', 'create', 'edit', 'delete'],            tenant_manager: ['view', 'create', 'edit'],    viewer: VIEW_ONLY },
};

/**
 * Check whether `role` is allowed to perform `action` on `module`.
 * Falls back to the parent module (`markets`) when the exact sub-module
 * has no explicit entry.
 */
export function canAccess(role: Role, module: string, action: Action): boolean {
  const perms = MODULE_PERMISSIONS[module as Module]
    ?? MODULE_PERMISSIONS['markets'];
  return (perms[role] ?? []).includes(action);
}

/** Return the list of actions a role may perform on a module. */
export function getModulePermissions(role: Role, module: string): Action[] {
  const perms = MODULE_PERMISSIONS[module as Module]
    ?? MODULE_PERMISSIONS['markets'];
  return [...(perms[role] ?? [])];
}
