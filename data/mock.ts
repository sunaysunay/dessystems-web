// DESPANEL-V2 — mock data mirroring REAL schema values (channels + categories from Supabase).
// Used only when .env.local has no Supabase keys. Replaced by lib/queries.ts in live mode.
export type Listing = {
  category: string; subcategory: string; brand: string; model: string;
  itemId: string; trans: string; status: 'Published' | 'Draft' | 'Unpublished';
  price: string; date: string; tenant: string;
  channels: Record<string, 'ok' | 'pending' | 'error'>;
};

// Real categories: Camper, Caravan, Trailer, vans, VehicleParts
// Real channels:   2dehands, kleinanzeigen, marktplaats
export const LISTINGS: Listing[] = [
  { category: 'Caravan', subcategory: '—', brand: 'Mercedes-Benz', model: 'Sprinter 316 CDI', itemId: '001', trans: 'Sale', status: 'Published', price: '€32,500', date: '24/06/2026', tenant: '200',
    channels: { '2dehands': 'ok', 'kleinanzeigen': 'ok', 'marktplaats': 'pending' } },
  { category: 'Camper', subcategory: '—', brand: 'Hymer', model: 'B-Class MasterLine', itemId: '002', trans: 'Rental', status: 'Published', price: '€120/day', date: '24/06/2026', tenant: '200',
    channels: { '2dehands': 'ok', 'kleinanzeigen': 'error', 'marktplaats': 'ok' } },
  { category: 'Trailer', subcategory: '—', brand: 'Anssems', model: 'GT 750', itemId: '110', trans: 'Sale', status: 'Draft', price: '€2,950', date: '20/06/2026', tenant: '200',
    channels: { '2dehands': 'pending', 'kleinanzeigen': 'pending', 'marktplaats': 'pending' } },
];

export type Lead = { id: string; name: string; email: string; status: string; listing: string; date: string };
export const LEADS: Lead[] = [
  { id: 'L-1042', name: 'Jan de Vries', email: 'jan@example.nl', status: 'new', listing: 'Sprinter 316 CDI', date: '24/06/2026' },
  { id: 'L-1041', name: 'Maria Köhler', email: 'm.kohler@example.de', status: 'contacted', listing: 'Hymer B-Class', date: '23/06/2026' },
  { id: 'L-1038', name: 'Pieter Bos', email: 'pieter@example.nl', status: 'won', listing: 'Anssems GT 750', date: '21/06/2026' },
];

export type Task = { id: string; title: string; status: string; priority: string; due: string };
export const TASKS: Task[] = [
  { id: 'T-1', title: 'Follow up Sprinter inquiry', status: 'open', priority: 'high', due: '25/06/2026' },
  { id: 'T-2', title: 'Photograph new Caravan stock', status: 'open', priority: 'medium', due: '26/06/2026' },
  { id: 'T-3', title: 'Renew marktplaats listings', status: 'in_progress', priority: 'high', due: '24/06/2026' },
];

export type AuditEntry = { id: string; when: string; actor: string; action: string; target: string };
export const AUDIT: AuditEntry[] = [
  { id: 'A-9', when: '24/06 14:30', actor: 'sunay', action: 'listing.publish', target: 'Sprinter 316 CDI' },
  { id: 'A-8', when: '24/06 13:10', actor: 'sunay', action: 'lead.status_change', target: 'L-1041 → contacted' },
  { id: 'A-7', when: '23/06 18:02', actor: 'system', action: 'channel.error', target: 'kleinanzeigen / Hymer B-Class' },
];

export type SystemStat = { label: string; value: string; state: 'ok' | 'warn' | 'down' };
export const SYSTEMS: SystemStat[] = [
  { label: 'API connection', value: 'connected', state: 'ok' },
  { label: 'Active channels', value: '3 / 3', state: 'ok' },
  { label: 'Failed publishes (24h)', value: '1', state: 'warn' },
  { label: 'Domain SSL', value: 'valid 78d', state: 'ok' },
  { label: 'Agent jobs', value: 'idle', state: 'ok' },
];

export type TenantRow = { id: number; name: string; type: string; active: boolean };
export const TENANTS_ROWS: TenantRow[] = [
  { id: 199, name: 'DES Group (HQ)', type: 'Main', active: true },
  { id: 200, name: 'DES Campers', type: 'dealership', active: true },
  { id: 300, name: 'DES Automotive', type: 'dealership', active: true },
  { id: 400, name: 'DES Shop-Trade', type: 'retail', active: true },
  { id: 500, name: 'DES Systems', type: 'console', active: true },
];

export type RoleRow = { user: string; role: string };
export const ROLE_ROWS: RoleRow[] = [
  { user: 'sunay@descampers.com', role: 'super_admin' },
  { user: 'ops@descampers.com', role: 'super_admin' },
  { user: 'viewer@descampers.com', role: 'viewer' },
];

export type Stats = { listings: number; leads: number; tasks: number; errors: number };
