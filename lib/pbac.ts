// DESPANEL-V2 — permission-based access control (module-scoped).
// Layered on top of lib/rbac.ts which handles generic capabilities.
import type { Role } from './scope-context';

/** Module permission scopes. */
export const MODULES = [
  'markets',
  'markets.corridor',
  'markets.country',
  'markets.pricing',
  'markets.distribution',
  'markets.opportunity',
  'markets.trade',
  'markets.dealer',
  // CI001 Commerce Intelligence (DESSHOP-CI) — one scope per analytics screen.
  'analytics',
  'analytics.overview',
  'analytics.funnel',
  'analytics.sales',
  'analytics.product',
  'analytics.customer',
  'analytics.traffic',
  'analytics.checkout',
  'analytics.inventory',
  'analytics.discovery',
  'analytics.attention',
  'analytics.scoring',
  'analytics.dsr',
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
  // CI001 analytics: read-only dashboards; attention items can be actioned
  // (edit) by managers; DSR export/erase is admin-only.
  'analytics':            { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.overview':   { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.funnel':     { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.sales':      { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.product':    { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.customer':   { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.traffic':    { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.checkout':   { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.inventory':  { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.discovery':  { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.scoring':    { super_admin: ALL_ACTIONS, platform_admin: VIEW_ONLY, tenant_manager: VIEW_ONLY, viewer: VIEW_ONLY },
  'analytics.attention':  { super_admin: ALL_ACTIONS, platform_admin: ['view', 'edit'], tenant_manager: ['view', 'edit'], viewer: VIEW_ONLY },
  'analytics.dsr':        { super_admin: ALL_ACTIONS, platform_admin: ['view', 'approve'], tenant_manager: [], viewer: [] },
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
