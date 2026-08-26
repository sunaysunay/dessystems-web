'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSession } from './auth';
import { supabase } from './supabase';

export type BusinessUnit = { id: number; label: string; code: string; type: string; domain: string; color: string };
export type Role = 'super_admin' | 'platform_admin' | 'tenant_manager' | 'viewer';

// Fallback if Supabase is unavailable
const FALLBACK_UNITS: BusinessUnit[] = [
  { id: 200, label: 'Campers',     code: 'DESC', type: 'dealership', domain: 'descampers.com', color: '#1d4ed8' },
  { id: 300, label: 'Automotive',  code: 'DESA', type: 'dealership', domain: 'desmobil.com',   color: '#dc2626' },
  { id: 400, label: 'Shop-Trade',  code: 'DEST', type: 'retail',     domain: 'desshop.com',    color: '#16a34a' },
  { id: 500, label: 'DES Systems', code: 'DESS', type: 'console',    domain: 'dessystems.io',  color: '#6366f1' },
  { id: 199, label: 'Group',       code: 'DESH', type: 'Main',       domain: 'deshold.com',    color: '#1d4ed8' },
];

export let BUSINESS_UNITS: BusinessUnit[] = FALLBACK_UNITS;

type ScopeState = {
  unit: BusinessUnit;
  setUnit: (u: BusinessUnit) => void;
  units: BusinessUnit[];
  env: 'PROD' | 'DEV';
  role: Role;
  user: { name: string; initials: string; email: string };
};

const ScopeContext = createContext<ScopeState | null>(null);

// PROD/DEV badge: explicit NEXT_PUBLIC_BOP_ENV wins; otherwise detect from hostname.
// bop.dessystems.io (and any non-dev host except localhost) = PROD; bop-dev/localhost = DEV.
function detectEnv(): 'PROD' | 'DEV' {
  const explicit = process.env.NEXT_PUBLIC_BOP_ENV;
  if (explicit === 'PROD' || explicit === 'DEV') return explicit;
  if (typeof window === 'undefined') return 'PROD';
  const h = window.location.hostname;
  return h.startsWith('bop-dev.') || h === 'localhost' || h === '127.0.0.1' ? 'DEV' : 'PROD';
}

// Tenant selection persistence, in priority order:
//   1. `?tenant=ID` in the current URL (bookmarkable/shareable — the ask: "tenant id
//      should be in the url of console bop v2 management")
//   2. `bop_unit_id` cookie (survives full page reloads / new tabs)
//   3. first tenant from the DB (sort_order) / FALLBACK_UNITS[0]
// This also fixes the "click DES BOP logo → resets to tenant 200" bug: that logo
// was a hard <a> causing a full reload, which remounted this provider and always
// re-initialized to the first unit — there was no persistence at all before.
const COOKIE_NAME = 'bop_unit_id';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}`;
}
function readUrlTenantId(): number | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('tenant');
  return v ? Number(v) : null;
}
function syncUrlTenantId(id: number) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tenant', String(id));
  window.history.replaceState(null, '', url.toString());
}

function initialUnitId(): number | null {
  return readUrlTenantId() ?? (readCookie(COOKIE_NAME) ? Number(readCookie(COOKIE_NAME)) : null);
}

export function ScopeProvider({ children }: { children: ReactNode }) {
  const wantedId = initialUnitId();
  const [units, setUnits] = useState<BusinessUnit[]>(FALLBACK_UNITS);
  const [unit, setUnitState] = useState<BusinessUnit>(
    FALLBACK_UNITS.find(u => u.id === wantedId) ?? FALLBACK_UNITS[0]
  );
  const [role, setRole] = useState<Role>('viewer');
  const [user, setUser] = useState({ name: 'Loading…', initials: '··', email: '' });

  function setUnit(u: BusinessUnit) {
    setUnitState(u);
    writeCookie(COOKIE_NAME, String(u.id));
    syncUrlTenantId(u.id);
  }

  useEffect(() => {
    // Load tenants from bop_tenants (BOP V2's own, fully independent tenant table —
    // NOT the shared `tenants` table, which stays exclusively for descamper/
    // dessiteAG_V4/desmobil-web going forward).
    if (supabase) {
      supabase
        .from('bop_tenants')
        .select('tenant_id, name, code, domain, brand_color, business_type, sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const loaded: BusinessUnit[] = data.map((t: any) => ({
              id: t.tenant_id,
              label: t.name,
              code: t.code,
              type: t.business_type || 'unit',
              domain: t.domain,
              color: t.brand_color || '#64748b',
            }));
            BUSINESS_UNITS = loaded;
            setUnits(loaded);
            const restored = loaded.find(u => u.id === wantedId) ?? loaded[0];
            setUnitState(restored);
            syncUrlTenantId(restored.id);
          }
        });
    }

    // Load session/role
    void getSession().then(s => {
      if (!s) return;
      setRole(s.role);
      const name = s.email.split('@')[0];
      setUser({ name, initials: name.slice(0, 2).toUpperCase(), email: s.email });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [env, setEnv] = useState<'PROD' | 'DEV'>('PROD');
  useEffect(() => { setEnv(detectEnv()); }, []);

  return (
    <ScopeContext.Provider value={{ unit, setUnit, units, env, role, user }}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error('useScope must be used within ScopeProvider');
  return ctx;
}
