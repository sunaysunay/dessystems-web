// RDW Kentekenregister connector for the DES Integration Engine.
// Pure fetch — no Supabase dependency. Ported from desmobil-web/src/lib/rdw.ts
// Field names verified against live API 2026-07-10 (datasets m9d7-ebf2 + 8ys7-d773).

const VEHICLES_URL = 'https://opendata.rdw.nl/resource/m9d7-ebf2.json';
const FUEL_URL     = 'https://opendata.rdw.nl/resource/8ys7-d773.json';

export interface RdwResult {
  plate:                   string;
  make:                    string | null;
  model:                   string | null;
  description:             string | null;
  year:                    number | null;
  apk_expiry:              string | null;
  gvw_kg:                  number | null;
  color:                   string | null;
  fuel:                    string | null;
  vehicle_type_suggestion: string | null;
  raw: { vehicle: unknown; fuel: unknown };
}

export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

function rdwDate(v: string | undefined): string | null {
  if (!v || !/^\d{8}$/.test(v)) return null;
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

function suggestType(v: any): string | null {
  const inrichting = String(v?.inrichting ?? '').toLowerCase();
  const soort      = String(v?.voertuigsoort ?? '').toLowerCase();
  const gvw        = Number(v?.toegestane_maximum_massa_voertuig ?? 0);
  if (inrichting.includes('kampeer'))                              return 'camper';
  if (inrichting.includes('opleggertrekker') || inrichting.includes('trekker')) return 'commercial_truck';
  if (soort === 'bedrijfsauto' && gvw > 0 && gvw <= 3500)        return 'van';
  if (soort === 'bedrijfsauto' && gvw > 3500)                    return 'truck';
  if (soort === 'personenauto')                                   return 'car';
  if (soort === 'aanhangwagen' && inrichting.includes('caravan')) return 'caravan';
  return null;
}

async function fetchJson(url: string, appToken?: string): Promise<any[]> {
  const headers: Record<string, string> = {};
  if (appToken) headers['X-App-Token'] = appToken;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`RDW HTTP ${res.status} for ${url}`);
  return res.json();
}

export async function rdwLookup(plate: string, appToken?: string): Promise<RdwResult | null> {
  const normalized = normalizePlate(plate);
  if (!/^[A-Z0-9]{5,8}$/.test(normalized)) return null;

  const [vehicles, fuels] = await Promise.all([
    fetchJson(`${VEHICLES_URL}?kenteken=${normalized}`, appToken),
    fetchJson(`${FUEL_URL}?kenteken=${normalized}`, appToken).catch(() => []),
  ]);
  const v = vehicles[0];
  if (!v) return null;
  const f = fuels[0];

  const yearRaw = v.datum_eerste_toelating ? Number(String(v.datum_eerste_toelating).slice(0, 4)) : null;
  return {
    plate:                   normalized,
    make:                    v.merk ?? null,
    model:                   v.handelsbenaming ?? null,
    description:             [v.voertuigsoort, v.inrichting].filter(Boolean).join(' · ') || null,
    year:                    Number.isFinite(yearRaw) ? yearRaw : null,
    apk_expiry:              rdwDate(v.vervaldatum_apk),
    gvw_kg:                  v.toegestane_maximum_massa_voertuig ? Number(v.toegestane_maximum_massa_voertuig) : null,
    color:                   v.eerste_kleur && v.eerste_kleur !== 'N.v.t.' ? v.eerste_kleur : null,
    fuel:                    f?.brandstof_omschrijving ?? null,
    vehicle_type_suggestion: suggestType(v),
    raw:                     { vehicle: v, fuel: f ?? null },
  };
}
