import { createHash } from 'crypto';
import { getServerClient } from '@/lib/supabase-server';

const SESSION_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const GAP_MS = 30 * 60 * 1000; // 30 min inactivity → new session

function uuidv5(name: string, namespace: string): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(nsBytes).update(name).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant RFC4122
  const hex = hash.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
    hex.slice(16, 20), hex.slice(20, 32),
  ].join('-');
}

const BOT_UA_PATTERNS = [
  'googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'duckduckbot',
  'slurp', 'ia_archiver', 'facebot', 'facebookexternalhit', 'twitterbot',
  'linkedinbot', 'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot',
  'uptimerobot', 'pingdom', 'headlesschrome', 'phantomjs', 'python-requests',
  'curl/', 'wget/', 'scrapy', 'httpclient', 'java/', 'go-http-client',
];

export interface RawEvent {
  id: string;
  tenant_id: number;
  anonymous_id: string;
  event_ts: string;
  event_type: string;
  variant_id?: string | null;
  order_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  device_type?: string | null;
  user_agent?: string | null;
  payload?: Record<string, unknown> | null;
  session_id?: string | null;
}

export interface SessionRow {
  id: string;
  tenant_id: number;
  anonymous_id: string;
  started_at: string;
  ended_at: string;
  session_date: string;
  duration_s: number;
  page_views: number;
  product_views: number;
  cart_adds: number;
  checkout_steps: number;
  search_count: number;
  has_order: boolean;
  is_bot: boolean;
  consent_given: boolean;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  device_type: string | null;
}

export function makeSessionId(
  tenantId: number,
  anonymousId: string,
  firstEventTs: string,
): string {
  const name = `${tenantId}||${anonymousId}||${firstEventTs}`;
  return uuidv5(name, SESSION_NAMESPACE);
}

function isCampaignChange(prev: RawEvent, curr: RawEvent): boolean {
  if (curr.utm_source && curr.utm_source !== prev.utm_source) return true;
  if (curr.utm_medium && curr.utm_medium !== prev.utm_medium) return true;
  if (curr.utm_campaign && curr.utm_campaign !== prev.utm_campaign) return true;
  return false;
}

function isBot(events: RawEvent[]): boolean {
  for (const e of events) {
    if (!e.user_agent) continue;
    const ua = e.user_agent.toLowerCase();
    if (BOT_UA_PATTERNS.some(p => ua.includes(p))) return true;
  }
  const pageViews = events.filter(e => e.event_type === 'page_view').length;
  const first = new Date(events[0].event_ts).getTime();
  const last = new Date(events[events.length - 1].event_ts).getTime();
  const durationS = Math.round((last - first) / 1000);
  if (pageViews > 50 && durationS < 60) return true;
  return false;
}

export function sessioniseEvents(events: RawEvent[]): SessionRow[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.event_ts).getTime() - new Date(b.event_ts).getTime(),
  );

  const sessions: RawEvent[][] = [];
  let currentBucket: RawEvent[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = new Date(curr.event_ts).getTime() - new Date(prev.event_ts).getTime();

    if (gap > GAP_MS || isCampaignChange(prev, curr)) {
      sessions.push(currentBucket);
      currentBucket = [curr];
    } else {
      currentBucket.push(curr);
    }
  }
  sessions.push(currentBucket);

  return sessions.map(bucket => {
    const tenantId = bucket[0].tenant_id;
    const anonymousId = bucket[0].anonymous_id;
    const firstTs = bucket[0].event_ts;
    const lastTs = bucket[bucket.length - 1].event_ts;
    const startMs = new Date(firstTs).getTime();
    const endMs = new Date(lastTs).getTime();
    const durationS = Math.round((endMs - startMs) / 1000);

    return {
      id: makeSessionId(tenantId, anonymousId, firstTs),
      tenant_id: tenantId,
      anonymous_id: anonymousId,
      started_at: firstTs,
      ended_at: lastTs,
      session_date: firstTs.slice(0, 10),
      duration_s: durationS,
      page_views: bucket.filter(e => e.event_type === 'page_view').length,
      product_views: bucket.filter(e => e.event_type === 'product_view').length,
      cart_adds: bucket.filter(e => e.event_type === 'cart_add').length,
      checkout_steps: bucket.filter(e => e.event_type === 'checkout_step').length,
      search_count: bucket.filter(e => e.event_type === 'search').length,
      has_order: bucket.some(e => e.order_id != null),
      is_bot: isBot(bucket),
      consent_given: true,
      landing_page: bucket[0].payload?.page as string || null,
      utm_source: bucket[0].utm_source || null,
      utm_medium: bucket[0].utm_medium || null,
      utm_campaign: bucket[0].utm_campaign || null,
      referrer: bucket[0].referrer || null,
      device_type: bucket[0].device_type || null,
    };
  });
}

export async function runSessionise(
  tenantId: number,
  since?: string,
): Promise<{ created: number; updated: number }> {
  const supabase = getServerClient();

  const cutoff = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from('ci_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('plane', 'B')
    .gte('event_ts', cutoff)
    .order('event_ts', { ascending: true })
    .limit(10000);

  if (error || !events?.length) return { created: 0, updated: 0 };

  const byVisitor = new Map<string, RawEvent[]>();
  for (const e of events) {
    const key = e.anonymous_id;
    if (!key) continue;
    if (!byVisitor.has(key)) byVisitor.set(key, []);
    byVisitor.get(key)!.push(e as RawEvent);
  }

  let created = 0;
  let updated = 0;

  for (const [, visitorEvents] of byVisitor) {
    const rows = sessioniseEvents(visitorEvents);
    for (const row of rows) {
      const { error: upsertErr } = await supabase
        .from('ci_sessions')
        .upsert(row, { onConflict: 'id' });
      if (upsertErr) {
        console.error('[sessionise] upsert failed:', upsertErr.message);
      } else {
        created++;
      }
    }

    const eventIds = visitorEvents.map(e => e.id);
    const sessionRows = rows;
    for (const sess of sessionRows) {
      const sessEvents = visitorEvents.filter(e => {
        const ts = new Date(e.event_ts).getTime();
        return ts >= new Date(sess.started_at).getTime() &&
               ts <= new Date(sess.ended_at).getTime();
      });
      const ids = sessEvents.map(e => e.id);
      if (ids.length > 0) {
        await supabase
          .from('ci_events')
          .update({ session_id: sess.id })
          .in('id', ids);
      }
    }
  }

  return { created, updated };
}

export async function linkIdentityToSessions(
  tenantId: number,
  anonymousId: string,
  customerId: string,
): Promise<number> {
  const supabase = getServerClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('ci_sessions')
    .update({
      customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('anonymous_id', anonymousId)
    .is('customer_id', null)
    .gte('started_at', cutoff)
    .select('id');

  if (error) {
    console.error('[sessionise] identity link failed:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}
