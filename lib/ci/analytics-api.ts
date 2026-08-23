import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerClient } from '@/lib/supabase-server';
import { canAccess } from '@/lib/pbac';
import { isDataHealthy } from '@/lib/ci/data-health';
import type { Role } from '@/lib/scope-context';

export const TENANT_ID = 400;

// ── PBAC guard (CI-T15) ──
// The console authenticates via the bop_role cookie (lib/api-guard.ts
// convention — client-side Supabase session, role mirrored into a cookie).
// This is the first PBAC-enforced API surface in the console.

export async function requireAnalyticsView(module: string): Promise<{ role: Role } | NextResponse> {
  const store = await cookies();
  const role = (store.get('bop_role')?.value ?? '') as Role | '';

  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canAccess(role as Role, module, 'view')) {
    return NextResponse.json(
      { error: 'Forbidden', module, action: 'view', role },
      { status: 403 },
    );
  }
  return { role: role as Role };
}

// ── Shared date-range/filter contract ──
// ?from=YYYY-MM-DD&to=YYYY-MM-DD  (default: last 30 days ending yesterday)

export interface DateRange {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  days: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString().slice(0, 10);
}

export function parseRange(request: NextRequest): DateRange | NextResponse {
  const sp = request.nextUrl.searchParams;
  const to = sp.get('to') || shiftDays(new Date().toISOString().slice(0, 10), -1);
  const from = sp.get('from') || shiftDays(to, -29);

  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return NextResponse.json({ error: 'from/to must be YYYY-MM-DD' }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: 'from must be <= to' }, { status: 400 });
  }
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
  if (days > 400) {
    return NextResponse.json({ error: 'range too large (max 400 days)' }, { status: 400 });
  }

  return {
    from,
    to,
    prevFrom: shiftDays(from, -days),
    prevTo: shiftDays(from, -1),
    days,
  };
}

// ── Response cache keyed on (route, range, filters, last aggregate run) ──
// The last successful daily_aggregate finished_at is part of the key, so a
// new aggregation run invalidates every cached response automatically.

const cache = new Map<string, { at: number; body: unknown }>();
const CACHE_MAX = 200;
const CACHE_TTL_MS = 10 * 60_000; // hard TTL backstop

async function lastAggregateRun(): Promise<string> {
  const sb = getServerClient();
  const { data } = await sb
    .from('ci_job_run')
    .select('finished_at')
    .eq('tenant_id', TENANT_ID)
    .eq('job_id', 'daily_aggregate')
    .eq('status', 'success')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.finished_at ?? 'never';
}

// ── Route factory ──
// Wraps a data handler with: PBAC check → range parsing → cache lookup →
// handler → degraded-flag propagation → cache store.

export function analyticsRoute(
  module: string,
  handler: (range: DateRange, request: NextRequest) => Promise<Record<string, unknown>>,
) {
  return async function GET(request: NextRequest) {
    const auth = await requireAnalyticsView(module);
    if (auth instanceof NextResponse) return auth;

    const range = parseRange(request);
    if (range instanceof NextResponse) return range;

    const aggRun = await lastAggregateRun();
    const extraParams = [...request.nextUrl.searchParams.entries()]
      .filter(([k]) => k !== 'from' && k !== 'to')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const key = `${module}|${range.from}|${range.to}|${extraParams}|${aggRun}`;

    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return NextResponse.json(hit.body, { headers: { 'x-ci-cache': 'hit' } });
    }

    try {
      const [data, health] = await Promise.all([
        handler(range, request),
        isDataHealthy(TENANT_ID),
      ]);

      const body = {
        ...data,
        range: { from: range.from, to: range.to, days: range.days },
        degraded: health.degraded,
        ...(health.degraded ? { degraded_reason: health.reason } : {}),
      };

      if (cache.size >= CACHE_MAX) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) cache.delete(oldest[0]);
      }
      cache.set(key, { at: Date.now(), body });

      return NextResponse.json(body, { headers: { 'x-ci-cache': 'miss' } });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  };
}

// ── Shared fact-table helpers ──
// Non-negotiable #3: dashboards never read ci_events — everything below
// reads ci_daily_* only.

export async function factRows<T = Record<string, unknown>>(
  table: string,
  range: { from: string; to: string },
  columns = '*',
): Promise<T[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from(table)
    .select(columns)
    .eq('tenant_id', TENANT_ID)
    .gte('fact_date', range.from)
    .lte('fact_date', range.to)
    .order('fact_date', { ascending: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export function sumBy<T>(rows: T[], field: keyof T): number {
  return rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
