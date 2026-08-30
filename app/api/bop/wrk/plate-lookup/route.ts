export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { executeFlow } from '@/lib/integration/engine/executor';
import { getTenantId } from '@/lib/tenant';

const TENANT_ID = getTenantId('console');

export async function POST(req: NextRequest) {
  const { plate } = await req.json();
  if (!plate || typeof plate !== 'string') {
    return NextResponse.json({ error: 'plate required' }, { status: 400 });
  }

  const cleaned = plate.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(cleaned)) {
    return NextResponse.json({ error: 'Invalid plate format' }, { status: 400 });
  }

  const run = await executeFlow({
    flowKey: 'rdw.lookup',
    payload: { plate: cleaned },
    trigger: 'api',
    triggeredBy: 'wrk-plate-lookup',
  });

  if (run.status !== 'ok' || !run.result) {
    return NextResponse.json({
      error: run.errorMsg ?? 'RDW lookup failed',
      rdw: null,
      asset: null,
    }, { status: 502 });
  }

  const rdw = run.result as Record<string, unknown>;

  const supabase = getServerClient();
  const { data: existing } = await supabase
    .from('ast_assets')
    .select('id, license_plate, brand, model, year, mileage_km, fuel_type, status')
    .eq('tenant_id', TENANT_ID)
    .eq('license_plate', cleaned)
    .maybeSingle();

  return NextResponse.json({
    rdw: {
      plate: cleaned,
      brand: rdw.merk ?? rdw.brand ?? '',
      model: rdw.handelsbenaming ?? rdw.model ?? '',
      year: rdw.datum_eerste_toelating ? String(rdw.datum_eerste_toelating).slice(0, 4) : '',
      fuel: rdw.brandstof_omschrijving ?? rdw.fuel ?? '',
      color: rdw.eerste_kleur ?? '',
      weight: rdw.massa_rijklaar ?? '',
      apk_expiry: rdw.vervaldatum_apk ?? '',
      engine_capacity: rdw.cilinderinhoud ?? '',
    },
    asset: existing,
    matched: !!existing,
  });
}
