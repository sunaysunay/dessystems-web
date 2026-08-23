'use client';
// CI001 shared client helpers for the SH100–SH109 analytics screens.
import { useState, useEffect, useCallback } from 'react';

export function fmtEur(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('nl-NL');
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toLocaleString('nl-NL')}%`;
}

export function rangeToDates(days: number): { from: string; to: string } {
  const to = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return { from, to };
}

/**
 * Fetch one analytics API route for a day-range. Handles the shared response
 * envelope: 403 (no PBAC permission), degraded flag, x-ci-cache.
 */
export function useAnalytics<T = any>(route: string, days: number, extra = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = rangeToDates(days);
      const res = await fetch(`/api/bop/shop/analytics/${route}?from=${from}&to=${to}${extra ? `&${extra}` : ''}`);
      if (res.status === 403) { setForbidden(true); setData(null); return; }
      const j = await res.json();
      if (!res.ok) { setError(j.error || `HTTP ${res.status}`); setData(null); return; }
      setData(j);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [route, days, extra]);

  useEffect(() => { void load(); }, [load]);

  return { data, error, forbidden, loading, reload: load };
}

/** §10 gate banner: shown whenever the API says degraded:true. */
export function DegradedBanner({ degraded, reason }: { degraded?: boolean; reason?: string | null }) {
  if (!degraded) return null;
  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-700">
      ⚠ Figures under reconciliation — do not use for decisions.
      {reason ? <span className="ml-1 font-normal text-red-600">{reason}</span> : null}
    </div>
  );
}

export function ForbiddenNote() {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500">
      You do not have permission to view this analytics screen.
    </div>
  );
}
