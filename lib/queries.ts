// DESPANEL-V2 — data layer. Real Supabase queries scoped by tenant_id,
// with automatic fallback to mock data when .env.local isn't set yet.
import { supabase, USING_MOCK } from './supabase';
import {
  LISTINGS as MOCK_LISTINGS, type Listing,
  LEADS, type Lead, TASKS, type Task, AUDIT, type AuditEntry,
  SYSTEMS, type SystemStat, TENANTS_ROWS, type TenantRow,
  ROLE_ROWS, type RoleRow, type Stats,
} from '@/data/mock';

export const CHANNELS = ['2dehands', 'kleinanzeigen', 'marktplaats']; // real, from listing_pub

// Fetch listings for a business unit (tenant_id), joined with content + channel status.
export async function getListings(tenantId: number): Promise<Listing[]> {
  if (USING_MOCK || !supabase) {
    return MOCK_LISTINGS; // demo mode
  }

  // listing ⋈ listing_content (title/cover) ⋈ listing_pub (channels), scoped by tenant_id.
  const { data, error } = await supabase
    .from('listing')
    .select(`
      id, item_id, brand, model, category, type, price, currency, status, updated_at,
      listing_content ( title, cover_image_url ),
      listing_pub ( channel, status )
    `)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) { console.error('getListings', error); return []; }

  return (data ?? []).map((r: any): Listing => {
    const channels: Record<string, 'ok' | 'pending' | 'error'> = {};
    for (const ch of CHANNELS) {
      const pub = (r.listing_pub ?? []).find((p: any) => p.channel === ch);
      channels[ch] = !pub ? 'pending'
        : pub.status === 'active' || pub.status === 'published' ? 'ok'
        : pub.status === 'error' || pub.status === 'failed' ? 'error'
        : 'pending';
    }
    return {
      category: r.category ?? '—',
      subcategory: '—',
      brand: r.brand ?? '—',
      model: r.model ?? r.listing_content?.title ?? '—',
      itemId: r.item_id ?? r.id?.slice(0, 6) ?? '—',
      trans: r.type ?? 'Sale',
      status: (r.status === 'published' ? 'Published' : r.status === 'draft' ? 'Draft' : 'Unpublished') as Listing['status'],
      price: r.price ? `€${Number(r.price).toLocaleString()}` : '—',
      date: r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-GB') : '—',
      tenant: String(tenantId),
      channels,
    };
  });
}

// ---- Phase 4/5 reads. Real Supabase scoped by tenant_id; mock fallback. ----

export async function getStats(tenantId: number): Promise<Stats> {
  if (USING_MOCK || !supabase) {
    return { listings: MOCK_LISTINGS.length, leads: LEADS.length, tasks: TASKS.length, errors: 1 };
  }
  const [l, le] = await Promise.all([
    supabase.from('listing').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('lead').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ]);
  return { listings: l.count ?? 0, leads: le.count ?? 0, tasks: 0, errors: 0 };
}

export async function getLeads(tenantId: number): Promise<Lead[]> {
  if (USING_MOCK || !supabase) return LEADS;
  const { data } = await supabase
    .from('lead')
    .select('id, name, email, status, created_at, ref_code')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []).map((r: any) => ({
    id: r.ref_code || (r.id?.slice(0, 6) ?? '—'), name: r.name ?? '—', email: r.email ?? '—',
    status: r.status ?? 'new', listing: '—',
    date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—',
  }));
}

export async function getTasks(): Promise<Task[]> {
  if (USING_MOCK || !supabase) return TASKS;
  const { data } = await supabase
    .from('tasks').select('id, title, status, priority, due_date')
    .order('due_date', { ascending: true }).limit(50);
  return (data ?? []).map((r: any) => ({
    id: r.id?.slice(0, 6) ?? '—', title: r.title ?? '—',
    status: r.status ?? 'open', priority: r.priority ?? 'medium',
    due: r.due_date ? new Date(r.due_date).toLocaleDateString('en-GB') : '—',
  }));
}

export async function getAudit(tenantId: number): Promise<AuditEntry[]> {
  if (USING_MOCK || !supabase) return AUDIT;
  const { data } = await supabase
    .from('lead_log')
    .select('id, created_at, action_type, description, actor_email')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false }).limit(50);
  return (data ?? []).map((r: any) => ({
    id: r.id?.slice(0, 6) ?? '—',
    when: r.created_at ? new Date(r.created_at).toLocaleString('en-GB') : '—',
    actor: r.actor_email ?? 'system', action: r.action_type ?? '—',
    target: r.description ?? '—',
  }));
}

export async function getSystems(tenantId: number): Promise<SystemStat[]> {
  if (USING_MOCK || !supabase) return SYSTEMS;
  // Light real signal: tenant_status + channel health.
  const status = await supabase.from('tenant_status').select('status, is_resolved')
    .eq('tenant_id', tenantId).eq('is_resolved', false).limit(1);
  const channels = await supabase.from('listing_pub').select('status');
  const errs = (channels.data ?? []).filter((c: any) => c.status === 'error').length;
  return [
    { label: 'API connection', value: 'connected', state: 'ok' },
    { label: 'Open incidents', value: String(status.data?.length ?? 0), state: (status.data?.length ?? 0) ? 'warn' : 'ok' },
    { label: 'Channel errors', value: String(errs), state: errs ? 'warn' : 'ok' },
  ];
}

export async function getTenants(): Promise<TenantRow[]> {
  if (USING_MOCK || !supabase) return TENANTS_ROWS;
  const { data } = await supabase.from('tenants')
    .select('id, name, business_type, active').order('id');
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name ?? '—', type: r.business_type ?? '—', active: !!r.active,
  }));
}

export async function getRoles(): Promise<RoleRow[]> {
  if (USING_MOCK || !supabase) return ROLE_ROWS;
  const { data } = await supabase.from('admin_roles').select('user_id, role');
  return (data ?? []).map((r: any) => ({ user: r.user_id ?? '—', role: r.role ?? 'viewer' }));
}
